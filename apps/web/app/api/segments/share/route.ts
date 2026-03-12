/**
 * Share Segment API Route
 * 
 * Handles sharing segments to rooms or via DM.
 * 
 * Requirements:
 * - 12.4: Room Member 将 Segment 分享到 Room 时，以消息形式在 Room 中展示 Segment 的预览和链接
 * - 12.5: Room Member 将 Segment 通过私信分享时，将 Segment 发送给指定用户
 * 
 * Design Reference:
 * - Edge Function: share-segment
 * - 输入: { segment_id, target_type: 'room' | 'dm', target_id }
 * - 输出: { success: boolean }
 * - 逻辑: 如果分享到 Room：创建特殊类型的 Message（包含 Segment 预览）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('ShareSegmentAPI');

interface ShareSegmentRequest {
  segmentId: string;
  targetType: 'room' | 'dm';
  targetId: string;
}

interface ShareSegmentResponse {
  success: boolean;
  messageId?: string;
}

/**
 * POST /api/segments/share
 * 
 * Shares a segment to a room or via DM.
 * 
 * Request body:
 * - segmentId: UUID of the segment to share (required)
 * - targetType: 'room' or 'dm' (required)
 * - targetId: UUID of the target room or user (required)
 * 
 * Requirements:
 * - 12.4: 创建 message_type = 'segment_share' 的消息
 * - 12.5: 支持私信分享（Sprint 1 简化实现）
 * 
 * Returns:
 * - success: boolean indicating if the share was successful
 * - messageId: UUID of the created message (for room shares)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ShareSegmentRequest = await request.json();
    const { segmentId, targetType, targetId } = body;
    
    // Validation: Required fields
    if (!segmentId) {
      return NextResponse.json(
        { error: 'Segment ID 不能为空' },
        { status: 400 }
      );
    }
    
    if (!targetType || !['room', 'dm'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Target type 必须是 room 或 dm' },
        { status: 400 }
      );
    }
    
    if (!targetId) {
      return NextResponse.json(
        { error: 'Target ID 不能为空' },
        { status: 400 }
      );
    }
    
    logger.info('Processing share segment request', {
      segmentId,
      targetType,
      targetId,
    });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized share segment attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Verify segment exists and user has access to it
    const { data: segment, error: segmentError } = await supabase
      .from('segments')
      .select('id, name, description, room_id, created_by')
      .eq('id', segmentId)
      .single();
    
    if (segmentError || !segment) {
      logger.warn('Segment not found', {
        segmentId,
        error: segmentError,
      });
      return NextResponse.json(
        { error: 'Segment 不存在' },
        { status: 404 }
      );
    }
    
    // Check if user is a member of the segment's source room
    const { data: sourceMembership, error: sourceMembershipError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', segment.room_id)
      .eq('user_id', user.id)
      .single();
    
    if (sourceMembershipError || !sourceMembership) {
      logger.warn('User is not a member of the segment source room', {
        segmentId,
        roomId: segment.room_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: '您无权访问该 Segment' },
        { status: 403 }
      );
    }
    
    if (targetType === 'room') {
      // Requirement 12.4: Share to Room - create segment_share message
      
      // Check if user is a member of the target room
      const { data: targetMembership, error: targetMembershipError } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', targetId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();
      
      if (targetMembershipError || !targetMembership) {
        logger.warn('User is not a member of the target room', {
          targetRoomId: targetId,
          userId: user.id,
        });
        return NextResponse.json(
          { error: '您不是目标 Room 的成员' },
          { status: 403 }
        );
      }
      
      // Create segment_share message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          room_id: targetId,
          user_id: user.id,
          content: `分享了 Segment: ${segment.name}`,
          message_type: 'segment_share',
          shared_segment_id: segmentId,
          is_deleted: false,
        })
        .select('id')
        .single();
      
      if (messageError || !message) {
        logger.error('Failed to create segment_share message', messageError);
        return NextResponse.json(
          { error: '分享 Segment 失败', details: messageError?.message },
          { status: 500 }
        );
      }
      
      // Update segment to mark it as shared to room
      await supabase
        .from('segments')
        .update({ is_shared_to_room: true })
        .eq('id', segmentId);
      
      logger.info('Segment shared to room successfully', {
        segmentId,
        targetRoomId: targetId,
        userId: user.id,
        messageId: message.id,
      });
      
      return NextResponse.json<ShareSegmentResponse>({
        success: true,
        messageId: message.id,
      });
      
    } else {
      // Requirement 12.5: Share via DM (Sprint 1 simplified implementation)
      
      // Verify target user exists
      const { data: targetUser, error: targetUserError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('id', targetId)
        .single();
      
      // Note: In Supabase, we can't directly query auth.users from the client
      // So we'll skip this check and let the foreign key constraint handle it
      
      // Create DM record with shared segment
      const { data: dm, error: dmError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: targetId,
          shared_segment_id: segmentId,
          content: `分享了 Segment: ${segment.name}`,
          is_read: false,
        })
        .select('id')
        .single();
      
      if (dmError || !dm) {
        logger.error('Failed to create DM record', dmError);
        return NextResponse.json(
          { error: '发送私信失败', details: dmError?.message },
          { status: 500 }
        );
      }
      
      logger.info('Segment shared via DM successfully', {
        segmentId,
        targetUserId: targetId,
        userId: user.id,
        dmId: dm.id,
      });
      
      return NextResponse.json<ShareSegmentResponse>({
        success: true,
        messageId: dm.id,
      });
    }
    
  } catch (error) {
    logger.error('Unexpected error in share segment', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
