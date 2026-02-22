/**
 * Delete Message API Route
 * 
 * Handles message deletion with Tombstone mechanism.
 * 
 * Requirements:
 * - 8.5: Room Member 删除一条消息时，将该消息替换为 Tombstone 占位标记，保留在 Timeline 中
 * 
 * Design Reference:
 * - Edge Function: delete-message
 * - 输入: { message_id }
 * - 输出: { success: boolean }
 * - 逻辑: 检查权限（仅消息发送者或 Room Owner），设置 is_deleted = true 和 deleted_at
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('DeleteMessageAPI');

interface DeleteMessageRequest {
  messageId: string;
}

interface DeleteMessageResponse {
  success: boolean;
}

/**
 * POST /api/messages/delete
 * 
 * Deletes a message by setting is_deleted flag and deleted_at timestamp.
 * The message is not physically deleted but replaced with a Tombstone placeholder.
 * 
 * Request body:
 * - messageId: UUID of the message to delete (required)
 * 
 * Requirements:
 * - 8.5: 消息删除后显示 Tombstone 占位符
 * 
 * Permission check:
 * - Only the message sender or Room Owner can delete a message
 * 
 * Returns:
 * - success: boolean indicating if the deletion was successful
 */
export async function POST(request: NextRequest) {
  try {
    const body: DeleteMessageRequest = await request.json();
    const { messageId } = body;
    
    // Validation: Required fields
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID 不能为空' },
        { status: 400 }
      );
    }
    
    logger.info('Processing delete message request', { messageId });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized delete message attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Get the message to check permissions
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, user_id, room_id, is_deleted')
      .eq('id', messageId)
      .single();
    
    if (messageError || !message) {
      logger.warn('Message not found', {
        messageId,
        error: messageError,
      });
      return NextResponse.json(
        { error: '消息不存在' },
        { status: 404 }
      );
    }
    
    // Check if message is already deleted
    if (message.is_deleted) {
      logger.info('Message already deleted', { messageId });
      return NextResponse.json<DeleteMessageResponse>({
        success: true,
      });
    }
    
    // Check if user is the message sender
    const isMessageSender = message.user_id === user.id;
    
    // Check if user is the Room Owner
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('owner_id')
      .eq('id', message.room_id)
      .single();
    
    if (roomError || !room) {
      logger.error('Failed to fetch room', roomError);
      return NextResponse.json(
        { error: '获取 Room 信息失败' },
        { status: 500 }
      );
    }
    
    const isRoomOwner = room.owner_id === user.id;
    
    // Permission check: Only message sender or Room Owner can delete
    if (!isMessageSender && !isRoomOwner) {
      logger.warn('User does not have permission to delete message', {
        messageId,
        userId: user.id,
        messageSenderId: message.user_id,
        roomOwnerId: room.owner_id,
      });
      return NextResponse.json(
        { error: '您没有权限删除此消息' },
        { status: 403 }
      );
    }
    
    // Set is_deleted = true and deleted_at = now()
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId);
    
    if (updateError) {
      logger.error('Failed to delete message', updateError);
      return NextResponse.json(
        { error: '删除消息失败', details: updateError.message },
        { status: 500 }
      );
    }
    
    logger.info('Message deleted successfully', {
      messageId,
      userId: user.id,
      isMessageSender,
      isRoomOwner,
    });
    
    // Supabase Realtime will automatically push the update to all online Room Members
    // The MessageItem component will display the Tombstone placeholder
    
    return NextResponse.json<DeleteMessageResponse>({
      success: true,
    });
    
  } catch (error) {
    logger.error('Unexpected error in delete message', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
