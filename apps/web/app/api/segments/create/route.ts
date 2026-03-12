/**
 * Create Segment API Route
 * 
 * Handles creating segments from selected messages in a room.
 * 
 * Requirements:
 * - 12.1: Room Member 选择一组连续消息时，允许用户将选中消息创建为一个命名的 Segment
 * - 12.2: Segment 仅包含来自同一个 Room 的消息，不支持跨 Room 合并
 * - 12.3: Segment 记录消息的原始顺序
 * 
 * Design Reference:
 * - Edge Function: create-segment
 * - 输入: { name, description, room_id, message_ids[] }
 * - 输出: { segment_id }
 * - 逻辑: 创建 Segment 记录和 Segment_Messages 关联记录（保留顺序）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('CreateSegmentAPI');

interface CreateSegmentRequest {
  name: string;
  description?: string;
  roomId: string;
  messageIds: string[];
}

interface CreateSegmentResponse {
  segmentId: string;
}

/**
 * POST /api/segments/create
 * 
 * Creates a segment from selected messages.
 * 
 * Request body:
 * - name: Segment name (required)
 * - description: Segment description (optional)
 * - roomId: UUID of the room (required)
 * - messageIds: Array of message UUIDs in order (required, must be from same room)
 * 
 * Requirements:
 * - 12.1: 创建命名的 Segment
 * - 12.2: 验证所有消息来自同一 Room
 * - 12.3: 保留消息的原始顺序
 * 
 * Returns:
 * - segmentId: UUID of the created segment
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateSegmentRequest = await request.json();
    const { name, description, roomId, messageIds } = body;
    
    // Validation: Required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Segment 名称不能为空' },
        { status: 400 }
      );
    }
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID 不能为空' },
        { status: 400 }
      );
    }
    
    if (!messageIds || messageIds.length === 0) {
      return NextResponse.json(
        { error: '必须选择至少一条消息' },
        { status: 400 }
      );
    }
    
    logger.info('Processing create segment request', {
      roomId,
      messageCount: messageIds.length,
    });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized create segment attempt');
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
    
    // Requirement 12.2: Verify all messages are from the same room
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, room_id, created_at')
      .in('id', messageIds);
    
    if (messagesError || !messages) {
      logger.error('Failed to fetch messages', messagesError);
      return NextResponse.json(
        { error: '获取消息失败', details: messagesError?.message },
        { status: 500 }
      );
    }
    
    // Check if all messages exist
    if (messages.length !== messageIds.length) {
      logger.warn('Some messages not found', {
        requested: messageIds.length,
        found: messages.length,
      });
      return NextResponse.json(
        { error: '部分消息不存在或已被删除' },
        { status: 400 }
      );
    }
    
    // Check if all messages are from the same room
    const differentRoomMessages = messages.filter(msg => msg.room_id !== roomId);
    if (differentRoomMessages.length > 0) {
      logger.warn('Messages from different rooms detected', {
        roomId,
        differentRoomCount: differentRoomMessages.length,
      });
      return NextResponse.json(
        { error: 'Segment 只能包含来自同一个 Room 的消息' },
        { status: 400 }
      );
    }
    
    // Requirement 12.3: Preserve message order
    // Create a map of message ID to created_at timestamp for sorting
    const messageTimestampMap = new Map(
      messages.map(msg => [msg.id, new Date(msg.created_at).getTime()])
    );
    
    // Sort messageIds by their created_at timestamp to preserve original order
    const sortedMessageIds = [...messageIds].sort((a, b) => {
      const timeA = messageTimestampMap.get(a) || 0;
      const timeB = messageTimestampMap.get(b) || 0;
      return timeA - timeB;
    });
    
    // Create segment record
    const { data: segment, error: segmentError } = await supabase
      .from('segments')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        room_id: roomId,
        is_shared_to_room: false,
        is_draft: false,
      })
      .select('id')
      .single();
    
    if (segmentError || !segment) {
      logger.error('Failed to create segment', segmentError);
      return NextResponse.json(
        { error: '创建 Segment 失败', details: segmentError?.message },
        { status: 500 }
      );
    }
    
    // Create segment_messages records with message_order
    const segmentMessages = sortedMessageIds.map((messageId, index) => ({
      segment_id: segment.id,
      message_id: messageId,
      message_order: index + 1, // 1-indexed order
    }));
    
    const { error: segmentMessagesError } = await supabase
      .from('segment_messages')
      .insert(segmentMessages);
    
    if (segmentMessagesError) {
      logger.error('Failed to create segment_messages', segmentMessagesError);
      
      // Rollback: Delete the segment
      await supabase
        .from('segments')
        .delete()
        .eq('id', segment.id);
      
      return NextResponse.json(
        { error: '创建 Segment 关联失败', details: segmentMessagesError.message },
        { status: 500 }
      );
    }
    
    logger.info('Segment created successfully', {
      roomId,
      userId: user.id,
      segmentId: segment.id,
      messageCount: sortedMessageIds.length,
    });
    
    return NextResponse.json<CreateSegmentResponse>({
      segmentId: segment.id,
    });
    
  } catch (error) {
    logger.error('Unexpected error in create segment', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
