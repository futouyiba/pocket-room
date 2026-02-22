/**
 * Handle Join Request API Route
 * 
 * Handles room owner's actions on join requests:
 * - Approve: Add user as room member and notify applicant
 * - Reject: Notify applicant of rejection
 * - Block: Add to blacklist and prevent future requests
 * - Silence: Set cooldown period to prevent re-application
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('HandleJoinRequestAPI');

interface HandleJoinRequestBody {
  requestId: string;
  action: 'approve' | 'reject' | 'block' | 'silence';
  silenceDurationHours?: number;
}

/**
 * POST /api/rooms/handle-join-request
 * 
 * Handles room owner's decision on a join request.
 * 
 * Request body:
 * - requestId: UUID of the join request (required)
 * - action: 'approve' | 'reject' | 'block' | 'silence' (required)
 * - silenceDurationHours: Number of hours for silence cooldown (required if action is 'silence')
 * 
 * Requirements:
 * - 5.2: Room owner can execute approval actions
 * - 5.3: Approve adds user as room member and notifies applicant
 * - 5.4: Reject notifies applicant
 * - 5.5: Block adds to blacklist and prevents future requests
 * - 5.6: Silence sets cooldown period to prevent re-application
 */
export async function POST(request: NextRequest) {
  try {
    const body: HandleJoinRequestBody = await request.json();
    const { requestId, action, silenceDurationHours } = body;

    // Validation: Required fields
    if (!requestId || !action) {
      return NextResponse.json(
        { error: '请求 ID 和操作类型不能为空' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'block', 'silence'].includes(action)) {
      return NextResponse.json(
        { error: '无效的操作类型' },
        { status: 400 }
      );
    }

    if (action === 'silence' && (!silenceDurationHours || silenceDurationHours <= 0)) {
      return NextResponse.json(
        { error: '静默操作需要提供有效的冷却时长' },
        { status: 400 }
      );
    }

    logger.info('Processing join request action', { requestId, action });

    // Get authenticated user (room owner)
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn('Unauthorized join request handling attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }

    // Fetch the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('join_requests')
      .select(`
        *,
        room:rooms!inner(id, owner_id, name)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !joinRequest) {
      logger.warn('Join request not found', { requestId, error: requestError });
      return NextResponse.json(
        { error: '加入申请不存在' },
        { status: 404 }
      );
    }

    // Verify that the current user is the room owner
    if (joinRequest.room.owner_id !== user.id) {
      logger.warn('Non-owner attempted to handle join request', {
        requestId,
        userId: user.id,
        ownerId: joinRequest.room.owner_id,
      });
      return NextResponse.json(
        { error: '只有 Room Owner 可以处理加入申请' },
        { status: 403 }
      );
    }

    // Verify request is still pending
    if (joinRequest.status !== 'pending') {
      logger.warn('Attempted to handle non-pending request', {
        requestId,
        status: joinRequest.status,
      });
      return NextResponse.json(
        { error: '该申请已被处理' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Handle different actions
    switch (action) {
      case 'approve': {
        // 需求 5.3: Add user as room member and notify applicant
        logger.info('Approving join request', { requestId, userId: joinRequest.user_id });

        // Add user as room member
        const { error: memberError } = await supabase
          .from('room_members')
          .insert({
            room_id: joinRequest.room_id,
            user_id: joinRequest.user_id,
            role: 'member',
            joined_at: now,
          });

        if (memberError) {
          logger.error('Failed to add member', memberError);
          return NextResponse.json(
            { error: '添加成员失败', details: memberError.message },
            { status: 500 }
          );
        }

        // Update join request status
        const { error: updateError } = await supabase
          .from('join_requests')
          .update({
            status: 'approved',
            handled_at: now,
            handled_by: user.id,
          })
          .eq('id', requestId);

        if (updateError) {
          logger.error('Failed to update join request', updateError);
          // Note: Member was already added, so we don't return error
          // In production, consider using a transaction or cleanup logic
        }

        logger.info('Join request approved successfully', { requestId });

        // TODO: Send notification to applicant (需求 5.3)
        // For MVP, we'll skip real-time notifications
        // In production, you would:
        // 1. Use Supabase Realtime to push notification
        // 2. Create a notification record
        // 3. Send email notification

        return NextResponse.json({
          success: true,
          message: '已批准加入申请',
        });
      }

      case 'reject': {
        // 需求 5.4: Reject and notify applicant
        logger.info('Rejecting join request', { requestId, userId: joinRequest.user_id });

        const { error: updateError } = await supabase
          .from('join_requests')
          .update({
            status: 'rejected',
            handled_at: now,
            handled_by: user.id,
          })
          .eq('id', requestId);

        if (updateError) {
          logger.error('Failed to update join request', updateError);
          return NextResponse.json(
            { error: '拒绝申请失败', details: updateError.message },
            { status: 500 }
          );
        }

        logger.info('Join request rejected successfully', { requestId });

        // TODO: Send notification to applicant (需求 5.4)

        return NextResponse.json({
          success: true,
          message: '已拒绝加入申请',
        });
      }

      case 'block': {
        // 需求 5.5: Add to blacklist and prevent future requests
        logger.info('Blocking user', { requestId, userId: joinRequest.user_id });

        // Add to blacklist
        const { error: blacklistError } = await supabase
          .from('room_blacklist')
          .insert({
            room_id: joinRequest.room_id,
            user_id: joinRequest.user_id,
            blocked_by: user.id,
            blocked_at: now,
            reason: 'Blocked by room owner',
          });

        if (blacklistError) {
          logger.error('Failed to add to blacklist', blacklistError);
          return NextResponse.json(
            { error: '封禁用户失败', details: blacklistError.message },
            { status: 500 }
          );
        }

        // Update join request status
        const { error: updateError } = await supabase
          .from('join_requests')
          .update({
            status: 'blocked',
            handled_at: now,
            handled_by: user.id,
          })
          .eq('id', requestId);

        if (updateError) {
          logger.error('Failed to update join request', updateError);
          // Blacklist was already added, so we don't return error
        }

        logger.info('User blocked successfully', { requestId });

        return NextResponse.json({
          success: true,
          message: '已封禁该用户',
        });
      }

      case 'silence': {
        // 需求 5.6: Set cooldown period to prevent re-application
        logger.info('Silencing user', {
          requestId,
          userId: joinRequest.user_id,
          durationHours: silenceDurationHours,
        });

        const silencedUntil = new Date();
        silencedUntil.setHours(silencedUntil.getHours() + (silenceDurationHours || 24));

        const { error: updateError } = await supabase
          .from('join_requests')
          .update({
            status: 'rejected',
            silenced_until: silencedUntil.toISOString(),
            handled_at: now,
            handled_by: user.id,
          })
          .eq('id', requestId);

        if (updateError) {
          logger.error('Failed to silence user', updateError);
          return NextResponse.json(
            { error: '静默操作失败', details: updateError.message },
            { status: 500 }
          );
        }

        logger.info('User silenced successfully', {
          requestId,
          silencedUntil: silencedUntil.toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: `已设置静默，冷却期至 ${silencedUntil.toLocaleString('zh-CN')}`,
        });
      }

      default:
        return NextResponse.json(
          { error: '无效的操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Unexpected error in handle join request', error);

    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
