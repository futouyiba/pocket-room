/**
 * Send Message API Route
 * 
 * Handles sending messages to a room.
 * 
 * Requirements:
 * - 8.1: Room Member 发送消息时，通过 Supabase Realtime 将消息实时推送给该 Room 的所有在线 Room Member
 * 
 * Design Reference:
 * - Edge Function: send-message
 * - 输入: { room_id, content, attachments? }
 * - 输出: { message_id }
 * - 逻辑: 检查用户是否为 Room Member, 插入 Message 记录, Supabase Realtime 自动推送
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('SendMessageAPI');

interface SendMessageRequest {
  roomId: string;
  content: string;
  attachments?: string[];
}

interface SendMessageResponse {
  messageId: string;
}

/**
 * POST /api/messages/send
 * 
 * Sends a message to a room.
 * 
 * Request body:
 * - roomId: UUID of the room (required)
 * - content: Message content in Markdown format (required)
 * - attachments: Array of image URLs from Supabase Storage (optional)
 * 
 * Requirements:
 * - 8.1: 实时推送消息给 Room 的所有在线成员
 * 
 * Returns:
 * - messageId: UUID of the created message
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();
    const { roomId, content, attachments } = body;
    
    // Validation: Required fields
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID 不能为空' },
        { status: 400 }
      );
    }
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }
    
    logger.info('Processing send message request', { roomId });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized send message attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Check if user is a Room Member
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .is('left_at', null)
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
    
    // Insert message record
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim(),
        message_type: 'text',
        attachments: attachments || [],
        is_deleted: false,
      })
      .select('id')
      .single();
    
    if (messageError || !message) {
      logger.error('Failed to insert message', messageError);
      return NextResponse.json(
        { error: '发送消息失败', details: messageError?.message },
        { status: 500 }
      );
    }
    
    logger.info('Message sent successfully', {
      roomId,
      userId: user.id,
      messageId: message.id,
    });
    
    // Supabase Realtime will automatically push the message to all online Room Members
    // No additional action needed here
    
    return NextResponse.json<SendMessageResponse>({
      messageId: message.id,
    });
    
  } catch (error) {
    logger.error('Unexpected error in send message', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
