/**
 * Create Invitation API Route
 * 
 * Handles creating invitations to existing rooms with optional segment sharing.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('CreateInvitationAPI');

interface CreateInvitationRequest {
  roomId: string;
  inviteeEmails: string[];
  segmentData?: {
    name: string;
    description?: string;
    messageIds: string[];
  };
}

interface CreateInvitationResponse {
  success: boolean;
  invitations: Array<{
    id: string;
    inviteeEmail: string;
  }>;
  segmentId?: string;
}

/**
 * POST /api/invitations/create
 * 
 * Creates invitations to an existing room with optional segment sharing.
 * 
 * Request body:
 * - roomId: UUID of the room (required)
 * - inviteeEmails: Array of invitee email addresses (required, at least one)
 * - segmentData: Optional segment to share with invitees
 *   - name: Segment name (required if segmentData provided)
 *   - description: Segment description (optional)
 *   - messageIds: Array of message IDs in chronological order (required if segmentData provided)
 * 
 * Requirements:
 * - 10.1: Provide option to select messages and create Segment during invitation
 * - 10.2: Associate Segment with invitation (invitation_segment_id)
 * - 10.4: Invitation Segment follows same metadata rules (created_by, room_id, created_at)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateInvitationRequest = await request.json();
    const { roomId, inviteeEmails, segmentData } = body;
    
    // Validation: Required fields
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID 不能为空' },
        { status: 400 }
      );
    }
    
    if (!inviteeEmails || inviteeEmails.length === 0) {
      return NextResponse.json(
        { error: '必须邀请至少一名用户' },
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
    
    // Validate segment data if provided
    if (segmentData) {
      if (!segmentData.name || !segmentData.name.trim()) {
        return NextResponse.json(
          { error: 'Segment 名称不能为空' },
          { status: 400 }
        );
      }
      
      if (!segmentData.messageIds || segmentData.messageIds.length === 0) {
        return NextResponse.json(
          { error: 'Segment 必须包含至少一条消息' },
          { status: 400 }
        );
      }
    }
    
    logger.info('Creating invitation', {
      roomId,
      inviteeCount: inviteeEmails.length,
      hasSegment: !!segmentData,
    });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized invitation creation attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();
    
    if (membershipError || !membership) {
      logger.warn('User is not a member of the room', {
        userId: user.id,
        roomId,
      });
      return NextResponse.json(
        { error: '您不是该 Room 的成员' },
        { status: 403 }
      );
    }
    
    // Verify room exists and is active
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', roomId)
      .single();
    
    if (roomError || !room) {
      logger.warn('Room not found', { roomId });
      return NextResponse.json(
        { error: 'Room 不存在' },
        { status: 404 }
      );
    }
    
    if (room.status !== 'active') {
      logger.warn('Room is not active', { roomId, status: room.status });
      return NextResponse.json(
        { error: 'Room 尚未激活' },
        { status: 400 }
      );
    }
    
    // Create segment if provided (需求 10.1, 10.2, 10.4)
    let segmentId: string | null = null;
    
    if (segmentData) {
      logger.info('Creating invitation segment', {
        name: segmentData.name,
        messageCount: segmentData.messageIds.length,
      });
      
      // Verify all messages exist and belong to the room
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, room_id')
        .in('id', segmentData.messageIds);
      
      if (messagesError || !messages || messages.length !== segmentData.messageIds.length) {
        logger.warn('Some messages not found', {
          requested: segmentData.messageIds.length,
          found: messages?.length || 0,
        });
        return NextResponse.json(
          { error: '部分消息不存在' },
          { status: 400 }
        );
      }
      
      // Verify all messages belong to the same room (需求 12.2)
      const allFromSameRoom = messages.every(msg => msg.room_id === roomId);
      if (!allFromSameRoom) {
        logger.warn('Messages from different rooms', { roomId });
        return NextResponse.json(
          { error: 'Segment 只能包含同一 Room 的消息' },
          { status: 400 }
        );
      }
      
      // Create segment (需求 10.4: 遵循相同的元数据规则)
      const { data: segment, error: segmentError } = await supabase
        .from('segments')
        .insert({
          name: segmentData.name.trim(),
          description: segmentData.description?.trim() || null,
          created_by: user.id,
          room_id: roomId,
          is_shared_to_room: false,
          is_draft: false,
        })
        .select()
        .single();
      
      if (segmentError || !segment) {
        logger.error('Failed to create segment', segmentError);
        return NextResponse.json(
          { error: '创建 Segment 失败', details: segmentError?.message },
          { status: 500 }
        );
      }
      
      segmentId = segment.id;
      
      // Create segment_messages associations (需求 12.3: 保留顺序)
      const segmentMessages = segmentData.messageIds.map((messageId, index) => ({
        segment_id: segmentId!,
        message_id: messageId,
        message_order: index,
      }));
      
      const { error: segmentMessagesError } = await supabase
        .from('segment_messages')
        .insert(segmentMessages);
      
      if (segmentMessagesError) {
        logger.error('Failed to create segment messages', segmentMessagesError);
        // Rollback: delete segment
        await supabase.from('segments').delete().eq('id', segmentId);
        return NextResponse.json(
          { error: '创建 Segment 消息关联失败', details: segmentMessagesError.message },
          { status: 500 }
        );
      }
      
      logger.info('Segment created successfully', { segmentId });
    }
    
    // Find invitees by email
    const { data: { users: invitees }, error: inviteesError } = await supabase.auth.admin.listUsers();
    
    if (inviteesError) {
      logger.error('Failed to fetch users', inviteesError);
      // Rollback: delete segment if created
      if (segmentId) {
        await supabase.from('segments').delete().eq('id', segmentId);
      }
      return NextResponse.json(
        { error: '查询邀请用户失败', details: inviteesError.message },
        { status: 500 }
      );
    }
    
    // Filter users by the requested emails
    const matchedInvitees = invitees?.filter(u => 
      u.email && inviteeEmails.includes(u.email)
    ) || [];
    
    if (matchedInvitees.length === 0) {
      logger.warn('No invitees found', { inviteeEmails });
      // Rollback: delete segment if created
      if (segmentId) {
        await supabase.from('segments').delete().eq('id', segmentId);
      }
      return NextResponse.json(
        { error: '未找到任何邀请的用户，请检查邮箱地址' },
        { status: 404 }
      );
    }
    
    // Create invitations (需求 10.2: 关联 segment)
    const invitationsToCreate = matchedInvitees.map(invitee => ({
      room_id: roomId,
      inviter_id: user.id,
      invitee_id: invitee.id,
      status: 'pending' as const,
      invitation_segment_id: segmentId,
    }));
    
    const { data: createdInvitations, error: invitationsError } = await supabase
      .from('invitations')
      .insert(invitationsToCreate)
      .select('id, invitee_id');
    
    if (invitationsError) {
      logger.error('Failed to create invitations', invitationsError);
      // Rollback: delete segment if created
      if (segmentId) {
        await supabase.from('segments').delete().eq('id', segmentId);
      }
      return NextResponse.json(
        { error: '创建邀请失败', details: invitationsError.message },
        { status: 500 }
      );
    }
    
    logger.info('Invitations created successfully', {
      roomId,
      invitationCount: createdInvitations?.length || 0,
      segmentId,
    });
    
    // TODO: Send invitation notifications to invitees
    // For MVP, we'll skip real-time notifications
    
    const response: CreateInvitationResponse = {
      success: true,
      invitations: (createdInvitations || []).map(inv => {
        const invitee = matchedInvitees.find(i => i.id === inv.invitee_id);
        return {
          id: inv.id,
          inviteeEmail: invitee?.email || '',
        };
      }),
      segmentId: segmentId || undefined,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Unexpected error in invitation creation', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
