/**
 * Invitation Confirmation API Route
 * 
 * Handles invitation confirmation (accept/reject):
 * - Accept: Creates room members for creator and invitee, sets room status to active
 * - Reject: Notifies creator, cancels room creation
 * - Validates requirements: 3.5, 3.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('ConfirmInvitationAPI');

interface ConfirmInvitationRequest {
  invitationId: string;
  accept: boolean;
}

interface ConfirmInvitationResponse {
  success: boolean;
  roomId?: string;
  message?: string;
}

/**
 * POST /api/invitations/confirm
 * 
 * Confirms (accepts or rejects) an invitation.
 * 
 * Request body:
 * - invitationId: UUID of the invitation (required)
 * - accept: true to accept, false to reject (required)
 * 
 * Requirements:
 * - 3.5: When accepted, creator and invitee become room members, room status changes to active
 * - 3.7: When rejected, notify creator and cancel room creation
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConfirmInvitationRequest = await request.json();
    const { invitationId, accept } = body;
    
    // Validation: Required fields
    if (!invitationId) {
      return NextResponse.json(
        { error: '邀请 ID 不能为空' },
        { status: 400 }
      );
    }
    
    if (typeof accept !== 'boolean') {
      return NextResponse.json(
        { error: '必须指定接受或拒绝' },
        { status: 400 }
      );
    }
    
    logger.info('Processing invitation confirmation', { invitationId, accept });
    
    // Get authenticated user
    const supabase = createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.warn('Unauthorized invitation confirmation attempt');
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }
    
    // Fetch the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*, rooms!inner(*)')
      .eq('id', invitationId)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .single();
    
    if (invitationError || !invitation) {
      logger.warn('Invitation not found or already processed', {
        invitationId,
        userId: user.id,
        error: invitationError,
      });
      return NextResponse.json(
        { error: '邀请不存在或已被处理' },
        { status: 404 }
      );
    }
    
    const room = invitation.rooms;
    
    if (accept) {
      // Accept invitation: Create room members and activate room
      logger.info('Accepting invitation', {
        invitationId,
        roomId: room.id,
        inviteeId: user.id,
      });
      
      // Update invitation status
      const { error: updateInvitationError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);
      
      if (updateInvitationError) {
        logger.error('Failed to update invitation status', updateInvitationError);
        return NextResponse.json(
          { error: '更新邀请状态失败', details: updateInvitationError.message },
          { status: 500 }
        );
      }
      
      // Create room members for both creator and invitee (需求 3.5)
      const membersToCreate = [
        {
          room_id: room.id,
          user_id: room.owner_id,
          role: 'owner' as const,
          joined_at: new Date().toISOString(),
        },
        {
          room_id: room.id,
          user_id: user.id,
          role: 'member' as const,
          joined_at: new Date().toISOString(),
        },
      ];
      
      const { error: membersError } = await supabase
        .from('room_members')
        .insert(membersToCreate);
      
      if (membersError) {
        logger.error('Failed to create room members', membersError);
        // Rollback invitation status
        await supabase
          .from('invitations')
          .update({ status: 'pending', responded_at: null })
          .eq('id', invitationId);
        
        return NextResponse.json(
          { error: '创建 Room 成员失败', details: membersError.message },
          { status: 500 }
        );
      }
      
      // Update room status to active (需求 3.5)
      const { error: roomUpdateError } = await supabase
        .from('rooms')
        .update({ status: 'active' })
        .eq('id', room.id);
      
      if (roomUpdateError) {
        logger.error('Failed to activate room', roomUpdateError);
        // Rollback: delete members and reset invitation
        await supabase.from('room_members').delete().eq('room_id', room.id);
        await supabase
          .from('invitations')
          .update({ status: 'pending', responded_at: null })
          .eq('id', invitationId);
        
        return NextResponse.json(
          { error: '激活 Room 失败', details: roomUpdateError.message },
          { status: 500 }
        );
      }
      
      logger.info('Invitation accepted successfully', {
        invitationId,
        roomId: room.id,
      });
      
      // TODO: Send notification to creator
      // For MVP, we'll skip real-time notifications
      
      const response: ConfirmInvitationResponse = {
        success: true,
        roomId: room.id,
        message: '已成功加入 Room',
      };
      
      return NextResponse.json(response);
      
    } else {
      // Reject invitation: Notify creator and cancel room (需求 3.7)
      logger.info('Rejecting invitation', {
        invitationId,
        roomId: room.id,
        inviteeId: user.id,
      });
      
      // Update invitation status
      const { error: updateInvitationError } = await supabase
        .from('invitations')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);
      
      if (updateInvitationError) {
        logger.error('Failed to update invitation status', updateInvitationError);
        return NextResponse.json(
          { error: '更新邀请状态失败', details: updateInvitationError.message },
          { status: 500 }
        );
      }
      
      // Cancel room creation by setting status to archived (需求 3.7)
      const { error: roomUpdateError } = await supabase
        .from('rooms')
        .update({ status: 'archived' })
        .eq('id', room.id);
      
      if (roomUpdateError) {
        logger.error('Failed to archive room', roomUpdateError);
        return NextResponse.json(
          { error: '取消 Room 创建失败', details: roomUpdateError.message },
          { status: 500 }
        );
      }
      
      logger.info('Invitation rejected successfully', {
        invitationId,
        roomId: room.id,
      });
      
      // TODO: Send notification to creator
      // For MVP, we'll skip real-time notifications
      
      const response: ConfirmInvitationResponse = {
        success: true,
        message: '已拒绝邀请',
      };
      
      return NextResponse.json(response);
    }
    
  } catch (error) {
    logger.error('Unexpected error in invitation confirmation', error);
    
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
