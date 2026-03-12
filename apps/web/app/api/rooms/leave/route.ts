/**
 * Leave Room API Route
 * 
 * Handles room member leaving with history preservation options.
 * 
 * Requirements:
 * - 11.1: 用户关闭浏览器时，默认保留 Room 成员身份和消息历史
 * - 11.2: Room Member 点击"退出 Room"按钮时，显示确认对话框
 * - 11.3: 确认对话框提供两个选项：保留个人消息历史副本，或删除个人消息历史副本
 * 
 * Design Reference:
 * - 实现退出逻辑：设置 left_at = NOW(), keep_history = [user choice]
 * - WHERE room_id = ? AND user_id = ?
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('LeaveRoomAPI');

interface LeaveRoomRequest {
  roomId: string;
  keepHistory: boolean;
}

interface LeaveRoomResponse {
  success: boolean;
}

/**
 * POST /api/rooms/leave
 * 
 * Allows a room member to leave a room with the option to keep or delete their message history.
 * 
 * Request body:
 * - roomId: UUID of the room to leave (required)
 * - keepHistory: boolean indicating whether to keep message history (required)
 * 
 * Requirements:
 * - 11.4: 退出并选择保留历史时，移除 Room Member 身份，但保留消息历史副本
 * - 11.5: 退出并选择删除历史时，移除 Room Member 身份并删除个人消息历史副本
 * 
 * Returns:
 * - success: boolean indicating if the leave operation was successful
 */
export async function POST(request: NextRequest) {
  try {
    const body: LeaveRoomRequest = await request.json();
    const { roomId, keepHistory } = body;
    
    // Validation: Required fields
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID 不能为空' },
        { status: 400 }
      );
    }
    
    if (typeof keepHistory !== 'boolean') {
      return NextResponse.json(
        { error: 'keepHistory 必须是布尔值' },
        { status: 400 }
      );
    }
    
    logger.info('Processing leave room request', { roomId, keepHistory });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized leave room attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Check if user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('user_id, room_id, role, left_at')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError || !membership) {
      logger.warn('User is not a member of the room', {
        roomId,
        userId: user.id,
        error: membershipError,
      });
      return NextResponse.json(
        { error: '您不是该 Room 的成员' },
        { status: 403 }
      );
    }
    
    // Check if user has already left
    if (membership.left_at) {
      logger.info('User has already left the room', {
        roomId,
        userId: user.id,
        leftAt: membership.left_at,
      });
      return NextResponse.json<LeaveRoomResponse>({
        success: true,
      });
    }
    
    // Update room_members: set left_at = NOW() and keep_history
    const { error: updateError } = await supabase
      .from('room_members')
      .update({
        left_at: new Date().toISOString(),
        keep_history: keepHistory,
      })
      .eq('room_id', roomId)
      .eq('user_id', user.id);
    
    if (updateError) {
      logger.error('Failed to update room membership', updateError);
      return NextResponse.json(
        { error: '退出 Room 失败', details: updateError.message },
        { status: 500 }
      );
    }
    
    logger.info('User left room successfully', {
      roomId,
      userId: user.id,
      keepHistory,
    });
    
    return NextResponse.json<LeaveRoomResponse>({
      success: true,
    });
    
  } catch (error) {
    logger.error('Unexpected error in leave room', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
