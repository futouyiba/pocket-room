/**
 * Room Join API Route
 * 
 * Handles room joining logic for different join strategies:
 * - Approval: Creates join request and notifies room owner
 * - Free: Immediately adds user as room member
 * - Passcode: Verifies password and adds user as room member
 * 
 * Validates requirements: 5.1, 6.1, 7.2, 7.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';
import bcrypt from 'bcryptjs';

const logger = createLogger('JoinRoomAPI');

interface JoinRoomRequest {
  roomId: string;
  passcode?: string;
}

interface JoinRoomResponse {
  success: boolean;
  requiresApproval?: boolean;
  message?: string;
}

/**
 * POST /api/rooms/join
 * 
 * Handles room join requests based on the room's join strategy.
 * 
 * Request body:
 * - roomId: UUID of the room to join (required)
 * - passcode: Password for passcode strategy (required if room uses passcode strategy)
 * 
 * Requirements:
 * - 5.1: For approval strategy, create join request and notify owner
 * - 6.1: For free strategy, immediately add user as member
 * - 7.2, 7.3: For passcode strategy, verify password and add user as member
 */
export async function POST(request: NextRequest) {
  try {
    const body: JoinRoomRequest = await request.json();
    const { roomId, passcode } = body;
    
    // Validation: Required fields
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID 不能为空' },
        { status: 400 }
      );
    }
    
    logger.info('Processing room join request', { roomId });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized room join attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Fetch the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('status', 'active')
      .single();
    
    if (roomError || !room) {
      logger.warn('Room not found or not active', {
        roomId,
        userId: user.id,
        error: roomError,
      });
      return NextResponse.json(
        { error: 'Room 不存在或未激活' },
        { status: 404 }
      );
    }
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();
    
    if (existingMember) {
      logger.info('User is already a member', { roomId, userId: user.id });
      return NextResponse.json(
        { error: '您已经是该 Room 的成员' },
        { status: 400 }
      );
    }
    
    // Check if user was invited (invitees skip all verification)
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('room_id', roomId)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .single();
    
    if (invitation) {
      // Invitee privilege: skip all verification and add directly as member (需求 5.8, 7.4)
      logger.info('User is invited, skipping verification', {
        roomId,
        userId: user.id,
        invitationId: invitation.id,
      });
      
      // Add user as room member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: roomId,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        });
      
      if (memberError) {
        logger.error('Failed to add invited user as member', memberError);
        return NextResponse.json(
          { error: '加入 Room 失败', details: memberError.message },
          { status: 500 }
        );
      }
      
      // Update invitation status
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);
      
      logger.info('Invited user joined successfully', { roomId, userId: user.id });
      
      return NextResponse.json({
        success: true,
        message: '已成功加入 Room',
      });
    }
    
    // Check if user is blacklisted (需求 5.5)
    const { data: blacklistEntry } = await supabase
      .from('room_blacklist')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    
    if (blacklistEntry) {
      logger.warn('User is blacklisted', { roomId, userId: user.id });
      return NextResponse.json(
        { error: '您已被该 Room 封禁' },
        { status: 403 }
      );
    }
    
    // Check if user is silenced (需求 5.6)
    const { data: existingRequest } = await supabase
      .from('join_requests')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    
    if (existingRequest) {
      // Check if user is in silence period
      if (existingRequest.silenced_until) {
        const silencedUntil = new Date(existingRequest.silenced_until);
        const now = new Date();
        
        if (silencedUntil > now) {
          logger.warn('User is silenced', {
            roomId,
            userId: user.id,
            silencedUntil: existingRequest.silenced_until,
          });
          return NextResponse.json(
            { error: `您在冷却期内，请在 ${silencedUntil.toLocaleString()} 后重试` },
            { status: 403 }
          );
        }
      }
      
      // Check if request is already pending
      if (existingRequest.status === 'pending') {
        logger.info('Join request already pending', { roomId, userId: user.id });
        return NextResponse.json({
          success: true,
          requiresApproval: true,
          message: '您的加入申请正在等待审批',
        });
      }
    }
    
    // Handle different join strategies
    switch (room.join_strategy) {
      case 'free':
        // Free join: immediately add user as member (需求 6.1)
        logger.info('Processing free join', { roomId, userId: user.id });
        
        const { error: freeMemberError } = await supabase
          .from('room_members')
          .insert({
            room_id: roomId,
            user_id: user.id,
            role: 'member',
            joined_at: new Date().toISOString(),
          });
        
        if (freeMemberError) {
          logger.error('Failed to add member (free join)', freeMemberError);
          return NextResponse.json(
            { error: '加入 Room 失败', details: freeMemberError.message },
            { status: 500 }
          );
        }
        
        logger.info('User joined successfully (free)', { roomId, userId: user.id });
        
        return NextResponse.json({
          success: true,
          message: '已成功加入 Room',
        });
      
      case 'passcode':
        // Passcode join: verify password (需求 7.2, 7.3)
        logger.info('Processing passcode join', { roomId, userId: user.id });
        
        if (!passcode) {
          return NextResponse.json(
            { error: '请输入 Room 密码' },
            { status: 400 }
          );
        }
        
        if (!room.passcode_hash) {
          logger.error('Room has passcode strategy but no passcode_hash', { roomId });
          return NextResponse.json(
            { error: 'Room 配置错误' },
            { status: 500 }
          );
        }
        
        // Verify passcode
        const isPasswordValid = await bcrypt.compare(passcode, room.passcode_hash);
        
        if (!isPasswordValid) {
          logger.warn('Invalid passcode attempt', { roomId, userId: user.id });
          return NextResponse.json(
            { error: '密码错误，请重试' },
            { status: 401 }
          );
        }
        
        // Add user as room member
        const { error: passcodeMemberError } = await supabase
          .from('room_members')
          .insert({
            room_id: roomId,
            user_id: user.id,
            role: 'member',
            joined_at: new Date().toISOString(),
          });
        
        if (passcodeMemberError) {
          logger.error('Failed to add member (passcode join)', passcodeMemberError);
          return NextResponse.json(
            { error: '加入 Room 失败', details: passcodeMemberError.message },
            { status: 500 }
          );
        }
        
        logger.info('User joined successfully (passcode)', { roomId, userId: user.id });
        
        return NextResponse.json({
          success: true,
          message: '已成功加入 Room',
        });
      
      case 'approval':
      default:
        // Approval join: create join request (需求 5.1)
        logger.info('Processing approval join', { roomId, userId: user.id });
        
        // Create or update join request
        const { error: requestError } = await supabase
          .from('join_requests')
          .upsert({
            room_id: roomId,
            user_id: user.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            silenced_until: null,
            handled_at: null,
            handled_by: null,
          }, {
            onConflict: 'room_id,user_id',
          });
        
        if (requestError) {
          logger.error('Failed to create join request', requestError);
          return NextResponse.json(
            { error: '提交加入申请失败', details: requestError.message },
            { status: 500 }
          );
        }
        
        logger.info('Join request created', { roomId, userId: user.id });
        
        // TODO: Send real-time notification to room owner (需求 5.1)
        // For MVP, we'll skip real-time notifications
        // In production, you would:
        // 1. Use Supabase Realtime to push notification to owner
        // 2. Create a notification record in a notifications table
        // 3. Send email notification if owner is offline
        
        return NextResponse.json({
          success: true,
          requiresApproval: true,
          message: '加入申请已提交，等待 Room Owner 审批',
        });
    }
    
  } catch (error) {
    logger.error('Unexpected error in room join', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
