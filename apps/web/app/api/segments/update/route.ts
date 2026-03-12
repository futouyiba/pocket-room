/**
 * Update Segment API Route
 * 
 * Handles updating segment metadata (name, description).
 * Used in the Basket for editing draft segments.
 * 
 * Requirements:
 * - Task 8.5: 实现 Segment 整理和编辑功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('UpdateSegmentAPI');

interface UpdateSegmentRequest {
  segmentId: string;
  name?: string;
  description?: string;
}

interface UpdateSegmentResponse {
  success: boolean;
}

/**
 * PATCH /api/segments/update
 * 
 * Updates a segment's metadata.
 * 
 * Request body:
 * - segmentId: UUID of the segment to update (required)
 * - name: New segment name (optional)
 * - description: New segment description (optional)
 * 
 * Returns:
 * - success: boolean indicating if the update was successful
 */
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateSegmentRequest = await request.json();
    const { segmentId, name, description } = body;
    
    // Validation: Required fields
    if (!segmentId) {
      return NextResponse.json(
        { error: 'Segment ID 不能为空' },
        { status: 400 }
      );
    }
    
    // At least one field must be provided
    if (name === undefined && description === undefined) {
      return NextResponse.json(
        { error: '必须提供至少一个要更新的字段' },
        { status: 400 }
      );
    }
    
    logger.info('Processing update segment request', { segmentId });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized update segment attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Verify segment exists and user owns it
    const { data: segment, error: segmentError } = await supabase
      .from('segments')
      .select('id, created_by')
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
    
    // Check ownership
    if (segment.created_by !== user.id) {
      logger.warn('User does not own segment', {
        segmentId,
        userId: user.id,
        ownerId: segment.created_by,
      });
      return NextResponse.json(
        { error: '您无权修改此 Segment' },
        { status: 403 }
      );
    }
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Segment 名称不能为空' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description.trim() || null;
    }
    
    // Update segment
    const { error: updateError } = await supabase
      .from('segments')
      .update(updateData)
      .eq('id', segmentId);
    
    if (updateError) {
      logger.error('Failed to update segment', updateError);
      return NextResponse.json(
        { error: '更新 Segment 失败', details: updateError.message },
        { status: 500 }
      );
    }
    
    logger.info('Segment updated successfully', {
      segmentId,
      userId: user.id,
    });
    
    return NextResponse.json<UpdateSegmentResponse>({
      success: true,
    });
    
  } catch (error) {
    logger.error('Unexpected error in update segment', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
