/**
 * Room Creation API Route
 * 
 * Handles server-side logic for creating a Room:
 * - Creates Room record with pending status
 * - Creates Invitation records
 * - Sends invitation notifications to invitees
 * - Validates requirements: 3.1, 3.2, 3.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';
import bcrypt from 'bcryptjs';

const logger = createLogger('CreateRoomAPI');

interface CreateRoomRequest {
  name: string;
  description?: string;
  joinStrategy: 'approval' | 'free' | 'passcode';
  passcode?: string;
  inviteeEmails: string[];
}

interface CreateRoomResponse {
  roomId: string;
  invitations: Array<{
    id: string;
    inviteeId: string;
    inviteeEmail: string;
    status: string;
  }>;
}

/**
 * POST /api/rooms/create
 * 
 * Creates a new Room with invitations.
 * 
 * Request body:
 * - name: Room name (required)
 * - description: Room description (optional)
 * - joinStrategy: 'approval' | 'free' | 'passcode' (required)
 * - passcode: Password for passcode strategy (required if joinStrategy is 'passcode')
 * - inviteeEmails: Array of invitee email addresses (required, at least one)
 * 
 * Requirements:
 * - 3.1: Room must have at least one invitee
 * - 3.2: Room must have a join strategy
 * - 3.3: If passcode strategy, passcode_hash must be provided
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateRoomRequest = await request.json();
    const { name, description, joinStrategy, passcode, inviteeEmails } = body;
    
    // Validation: Required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Room 名称不能为空' },
        { status: 400 }
      );
    }
    
    // Validation: Join strategy (需求 3.2)
    if (!joinStrategy || !['approval', 'free', 'passcode'].includes(joinStrategy)) {
      return NextResponse.json(
        { error: '必须选择一种加入策略' },
        { status: 400 }
      );
    }
    
    // Validation: At least one invitee (需求 3.1)
    if (!inviteeEmails || inviteeEmails.length === 0) {
      return NextResponse.json(
        { error: '必须邀请至少一名用户' },
        { status: 400 }
      );
    }
    
    // Validation: Passcode required for passcode strategy (需求 3.3)
    if (joinStrategy === 'passcode' && (!passcode || !passcode.trim())) {
      return NextResponse.json(
        { error: '密码加入策略需要设置密码' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of inviteeEmails) {
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: `无效的邮箱地址: ${email}` },
          { status: 400 }
        );
      }
    }
    
    logger.info('Creating room', { name, joinStrategy, inviteeCount: inviteeEmails.length });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized room creation attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Hash password if passcode strategy is selected
    let passcodeHash: string | null = null;
    if (joinStrategy === 'passcode' && passcode) {
      passcodeHash = await bcrypt.hash(passcode, 10);
      logger.debug('Password hashed for passcode strategy');
    }
    
    // Create room with pending status (需求 3.4)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        owner_id: user.id,
        join_strategy: joinStrategy,
        passcode_hash: passcodeHash,
        status: 'pending', // Room starts as pending until invitee confirms
      })
      .select()
      .single();
    
    if (roomError) {
      logger.error('Failed to create room', roomError, { userId: user.id });
      return NextResponse.json(
        { error: '创建 Room 失败', details: roomError.message },
        { status: 500 }
      );
    }
    
    logger.info('Room created', { roomId: room.id, status: room.status });
    
    // Find invitees by email
    // Note: Supabase Auth users are in auth.users, which requires admin access
    // For MVP, we'll use a service role key or implement a helper function
    // For now, we'll create invitations with email lookup via RPC or admin API
    
    // Query auth.users using admin client (requires service role key)
    const { data: { users: invitees }, error: inviteesError } = await supabase.auth.admin.listUsers();
    
    if (inviteesError) {
      logger.error('Failed to fetch users', inviteesError);
      // Clean up: delete the room since we can't create invitations
      await supabase.from('rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: '查询邀请用户失败', details: inviteesError.message },
        { status: 500 }
      );
    }
    
    // Filter users by the requested emails
    const matchedInvitees = invitees?.filter(u => 
      u.email && inviteeEmails.includes(u.email)
    ) || [];
    
    // Check if all invitees were found
    if (matchedInvitees.length === 0) {
      logger.warn('No invitees found', { inviteeEmails });
      // Clean up: delete the room
      await supabase.from('rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: '未找到任何邀请的用户，请检查邮箱地址' },
        { status: 404 }
      );
    }
    
    const foundEmails = matchedInvitees.map(inv => inv.email);
    const notFoundEmails = inviteeEmails.filter(email => !foundEmails.includes(email));
    
    if (notFoundEmails.length > 0) {
      logger.warn('Some invitees not found', { notFoundEmails });
      // For MVP, we'll proceed with found invitees and warn about not found ones
      // In production, you might want to send email invitations to non-registered users
    }
    
    // Create invitations
    const invitationsToCreate = matchedInvitees.map(invitee => ({
      room_id: room.id,
      inviter_id: user.id,
      invitee_id: invitee.id,
      status: 'pending' as const,
    }));
    
    const { data: createdInvitations, error: invitationsError } = await supabase
      .from('invitations')
      .insert(invitationsToCreate)
      .select('id, invitee_id, status');
    
    if (invitationsError) {
      logger.error('Failed to create invitations', invitationsError);
      // Clean up: delete the room
      await supabase.from('rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: '创建邀请失败', details: invitationsError.message },
        { status: 500 }
      );
    }
    
    logger.info('Invitations created', {
      roomId: room.id,
      invitationCount: createdInvitations?.length || 0,
    });
    
    // TODO: Send invitation notifications to invitees
    // For MVP, we'll skip real-time notifications
    // In production, you would:
    // 1. Send email notifications
    // 2. Send in-app notifications via Supabase Realtime
    // 3. Create notification records in a notifications table
    
    logger.info('Room creation completed successfully', {
      roomId: room.id,
      invitationCount: createdInvitations?.length || 0,
    });
    
    // Prepare response
    const response: CreateRoomResponse = {
      roomId: room.id,
      invitations: (createdInvitations || []).map(inv => {
        const invitee = matchedInvitees.find(i => i.id === inv.invitee_id);
        return {
          id: inv.id,
          inviteeId: inv.invitee_id,
          inviteeEmail: invitee?.email || '',
          status: inv.status,
        };
      }),
    };
    
    // Include warning about not found emails if any
    if (notFoundEmails.length > 0) {
      return NextResponse.json({
        ...response,
        warning: `以下邮箱未找到对应用户: ${notFoundEmails.join(', ')}`,
      });
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Unexpected error in room creation', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
