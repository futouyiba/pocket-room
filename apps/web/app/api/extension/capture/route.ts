/**
 * Browser Extension Capture API Route
 * 
 * Handles content capture from the browser extension.
 * Creates draft segments in the user's Basket.
 * 
 * Requirements:
 * - 16.2: Browser Extension 在 Web App 的 Basket 中创建草稿 Segment，包含选中文本和来源 URL
 * 
 * Design Reference:
 * - Property 42: 浏览器扩展创建草稿 Segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('ExtensionCaptureAPI');

interface CaptureRequest {
  content: string;
  sourceTitle: string;
  sourceUrl: string;
  timestamp: string;
}

interface CaptureResponse {
  segmentId: string;
}

/**
 * POST /api/extension/capture
 * 
 * Creates a draft segment from browser extension captured content.
 * 
 * Request body:
 * - content: Selected text content (required)
 * - sourceTitle: Page title (required)
 * - sourceUrl: Page URL (required)
 * - timestamp: Capture timestamp (required)
 * 
 * Requirements:
 * - 16.2: 创建草稿 Segment (is_draft = true)
 * - 16.2: 包含 source_url 字段
 * 
 * Returns:
 * - segmentId: UUID of the created draft segment
 */
export async function POST(request: NextRequest) {
  try {
    const body: CaptureRequest = await request.json();
    const { content, sourceTitle, sourceUrl, timestamp } = body;
    
    // Validation: Required fields
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400 }
      );
    }
    
    if (!sourceUrl) {
      return NextResponse.json(
        { error: '来源 URL 不能为空' },
        { status: 400 }
      );
    }
    
    logger.info('Processing extension capture request', {
      contentLength: content.length,
      sourceUrl,
    });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized extension capture attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Create a draft segment in the user's Basket
    // Note: For extension captures, we don't have a specific room_id yet
    // We'll use a special "basket" room or null room_id
    // For now, we'll create a segment without room_id (will be set when user organizes it)
    
    // First, check if user has a default "Basket" room or create one
    let basketRoomId: string;
    
    const { data: existingBasketRoom } = await supabase
      .from('rooms')
      .select('id')
      .eq('owner_id', user.id)
      .eq('name', '__BASKET__')
      .single();
    
    if (existingBasketRoom) {
      basketRoomId = existingBasketRoom.id;
    } else {
      // Create a special Basket room for this user
      const { data: newBasketRoom, error: basketError } = await supabase
        .from('rooms')
        .insert({
          name: '__BASKET__',
          description: 'Personal basket for captured content',
          owner_id: user.id,
          status: 'active',
          join_strategy: 'free',
          is_public: false, // Basket is private
        })
        .select('id')
        .single();
      
      if (basketError || !newBasketRoom) {
        logger.error('Failed to create basket room', basketError);
        return NextResponse.json(
          { error: '创建 Basket 失败', details: basketError?.message },
          { status: 500 }
        );
      }
      
      basketRoomId = newBasketRoom.id;
      
      // Add user as member of their basket
      await supabase
        .from('room_members')
        .insert({
          room_id: basketRoomId,
          user_id: user.id,
          role: 'owner',
        });
    }
    
    // Create draft segment with source_url
    const segmentName = sourceTitle || `Capture from ${new URL(sourceUrl).hostname}`;
    
    const { data: segment, error: segmentError } = await supabase
      .from('segments')
      .insert({
        name: segmentName,
        description: `Captured at ${timestamp}`,
        created_by: user.id,
        room_id: basketRoomId,
        is_draft: true, // Mark as draft
        is_shared_to_room: false,
        source_url: sourceUrl, // Store source URL
      })
      .select('id')
      .single();
    
    if (segmentError || !segment) {
      logger.error('Failed to create draft segment', segmentError);
      return NextResponse.json(
        { error: '创建草稿 Segment 失败', details: segmentError?.message },
        { status: 500 }
      );
    }
    
    // Create a message in the basket room with the captured content
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: basketRoomId,
        user_id: user.id,
        content: content,
        message_type: 'text',
      })
      .select('id')
      .single();
    
    if (messageError || !message) {
      logger.error('Failed to create message for captured content', messageError);
      
      // Rollback: Delete the segment
      await supabase
        .from('segments')
        .delete()
        .eq('id', segment.id);
      
      return NextResponse.json(
        { error: '保存内容失败', details: messageError?.message },
        { status: 500 }
      );
    }
    
    // Link the message to the segment
    const { error: segmentMessageError } = await supabase
      .from('segment_messages')
      .insert({
        segment_id: segment.id,
        message_id: message.id,
        message_order: 0,
      });
    
    if (segmentMessageError) {
      logger.error('Failed to link message to segment', segmentMessageError);
      
      // Rollback: Delete message and segment
      await supabase.from('messages').delete().eq('id', message.id);
      await supabase.from('segments').delete().eq('id', segment.id);
      
      return NextResponse.json(
        { error: '关联内容失败', details: segmentMessageError.message },
        { status: 500 }
      );
    }
    
    logger.info('Draft segment created successfully from extension', {
      userId: user.id,
      segmentId: segment.id,
      sourceUrl,
    });
    
    return NextResponse.json<CaptureResponse>({
      segmentId: segment.id,
    });
    
  } catch (error) {
    logger.error('Unexpected error in extension capture', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
