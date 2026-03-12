/**
 * Companion Request API Route
 * 
 * Handles requesting a summoned Companion to respond.
 * Validates requirements: 14.2, 14.3, 14.7, 14.8
 * 
 * When a Room Member requests a Companion response:
 * - Checks for approval exemption:
 *   1. Owner triggering their own Companion: skip approval, move to 'processing'
 *   2. Whitelisted member: skip approval, move to 'processing'
 *   3. Other members: require approval, move to 'pending_approval'
 * - If exempted: updates status to 'processing' and sets approved_by
 * - If not exempted: updates status to 'pending_approval' and sends notification to owner
 * - Does NOT trigger any AI API calls yet
 * - Does NOT consume any tokens
 * - Companion remains silent until context is selected and response is executed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { invocationId } = body;

    // Validate required fields
    if (!invocationId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_REQUIRED_FIELD',
            message: 'Invocation ID is required',
          },
        },
        { status: 400 }
      );
    }

    // Get the invocation with companion details
    const { data: invocation, error: invocationError } = await supabase
      .from('ai_invocations')
      .select(`
        id,
        companion_id,
        room_id,
        status,
        triggered_by,
        ai_companions (
          id,
          name,
          owner_id
        )
      `)
      .eq('id', invocationId)
      .single();

    if (invocationError || !invocation) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_NOT_SUMMONED',
            message: 'Companion invocation not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify invocation is in summoned state
    if (invocation.status !== 'summoned') {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_INVALID_STATE',
            message: `Companion is in ${invocation.status} state, cannot request`,
          },
        },
        { status: 400 }
      );
    }

    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', invocation.room_id)
      .eq('user_id', session.user.id)
      .is('left_at', null)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          error: {
            code: 'ROOM_ACCESS_DENIED',
            message: 'You must be a member of this room to request a companion',
          },
        },
        { status: 403 }
      );
    }

    // Get companion owner details for notification
    const companionData = Array.isArray(invocation.ai_companions) 
      ? invocation.ai_companions[0] 
      : invocation.ai_companions;

    if (!companionData) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_NOT_FOUND',
            message: 'Companion not found',
          },
        },
        { status: 404 }
      );
    }

    const ownerId = companionData.owner_id;
    const companionName = companionData.name;

    // Check for approval exemption (Requirements 14.7, 14.8)
    // 1. Owner triggering their own Companion: skip approval
    // 2. Whitelisted member triggering Companion: skip approval
    const isOwner = session.user.id === ownerId;
    
    let isWhitelisted = false;
    if (!isOwner) {
      const { data: whitelistEntry } = await supabase
        .from('companion_whitelist')
        .select('user_id')
        .eq('companion_id', invocation.companion_id)
        .eq('user_id', session.user.id)
        .eq('room_id', invocation.room_id)
        .single();
      
      isWhitelisted = !!whitelistEntry;
    }

    // Determine the new status based on exemption
    const newStatus = (isOwner || isWhitelisted) ? 'processing' : 'pending_approval';
    const approvedBy = (isOwner || isWhitelisted) ? session.user.id : null;

    // Update invocation status
    // If exempted: move directly to 'processing' (skip approval)
    // If not exempted: move to 'pending_approval' (wait for owner approval)
    // NO API calls are made yet, NO tokens are consumed
    const { data: updatedInvocation, error: updateError } = await supabase
      .from('ai_invocations')
      .update({
        status: newStatus,
        triggered_by: session.user.id, // Update to the requester
        approved_by: approvedBy, // Set if auto-approved
        updated_at: new Date().toISOString(),
      })
      .eq('id', invocationId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update invocation:', updateError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to request companion response',
          },
        },
        { status: 500 }
      );
    }

    // Get requester's display name for notification
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', session.user.id)
      .single();

    const requesterName = requesterProfile?.display_name || 
                          requesterProfile?.email || 
                          'Someone';

    // TODO: Send notification to Companion Owner
    // This would typically be done through:
    // 1. Supabase Realtime (for instant notification)
    // 2. Email notification (for offline owners)
    // 3. Push notification (if mobile app exists)
    // For Sprint 1, we'll rely on the UI polling/realtime updates
    // to show the pending_approval status to the owner
    
    // Future implementation would create a notification record:
    // await supabase.from('notifications').insert({
    //   user_id: ownerId,
    //   type: 'companion_request',
    //   title: `${requesterName} 请求 ${companionName} 回应`,
    //   message: `${requesterName} 在 Room 中请求你的 Companion "${companionName}" 进行回应`,
    //   data: { invocation_id: invocationId, ... },
    //   is_read: false,
    // });

    // Return success with updated invocation details
    return NextResponse.json({
      success: true,
      exempted: isOwner || isWhitelisted,
      exemptionReason: isOwner ? 'owner' : (isWhitelisted ? 'whitelist' : null),
      invocation: {
        id: updatedInvocation.id,
        companionId: updatedInvocation.companion_id,
        companionName: companionName,
        roomId: updatedInvocation.room_id,
        status: updatedInvocation.status,
        ownerId: ownerId,
        requestedBy: session.user.id,
        requestedByName: requesterName,
        approvedBy: updatedInvocation.approved_by,
        updatedAt: updatedInvocation.updated_at,
      },
    });
  } catch (error) {
    console.error('Companion request error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}
