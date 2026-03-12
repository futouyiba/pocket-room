/**
 * Companion Approval API Route
 * 
 * Handles approving a Companion request.
 * Validates requirements: 14.4, 14.6
 * 
 * When a Companion Owner approves a request:
 * - Updates ai_invocation status from 'pending_approval' to 'processing'
 * - If approval_type is 'whitelist', adds the requester to companion_whitelist
 * - Updates the Companion icon to bright state (processing)
 * - Prepares for context selection (next step in workflow)
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
    const { invocationId, approvalType } = body;

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

    // Validate approval type
    if (!approvalType || !['once', 'whitelist'].includes(approvalType)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_ENUM',
            message: 'Approval type must be "once" or "whitelist"',
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
            code: 'COMPANION_NOT_FOUND',
            message: 'Companion invocation not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify invocation is in pending_approval state
    if (invocation.status !== 'pending_approval') {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_INVALID_STATE',
            message: `Companion is in ${invocation.status} state, cannot approve`,
          },
        },
        { status: 400 }
      );
    }

    // Get companion data
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

    // Verify user is the companion owner
    if (companionData.owner_id !== session.user.id) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_NOT_OWNER',
            message: 'Only the companion owner can approve requests',
          },
        },
        { status: 403 }
      );
    }

    // If approval type is 'whitelist', add the requester to the whitelist
    if (approvalType === 'whitelist') {
      const { error: whitelistError } = await supabase
        .from('companion_whitelist')
        .insert({
          companion_id: invocation.companion_id,
          user_id: invocation.triggered_by,
          room_id: invocation.room_id,
          added_at: new Date().toISOString(),
        });

      // Ignore duplicate key errors (user already in whitelist)
      if (whitelistError && !whitelistError.message.includes('duplicate key')) {
        console.error('Failed to add to whitelist:', whitelistError);
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Failed to add user to whitelist',
            },
          },
          { status: 500 }
        );
      }
    }

    // Update invocation status to 'processing'
    // This changes the companion icon from gray/yellow to bright (blue)
    const { data: updatedInvocation, error: updateError } = await supabase
      .from('ai_invocations')
      .update({
        status: 'processing',
        approved_by: session.user.id,
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
            message: 'Failed to approve companion request',
          },
        },
        { status: 500 }
      );
    }

    // Get requester's display name for response
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', invocation.triggered_by)
      .single();

    const requesterName = requesterProfile?.display_name || 
                          requesterProfile?.email || 
                          'Someone';

    // Return success with updated invocation details
    return NextResponse.json({
      success: true,
      invocation: {
        id: updatedInvocation.id,
        companionId: updatedInvocation.companion_id,
        companionName: companionData.name,
        roomId: updatedInvocation.room_id,
        status: updatedInvocation.status,
        approvalType: approvalType,
        approvedBy: session.user.id,
        requestedBy: invocation.triggered_by,
        requestedByName: requesterName,
        updatedAt: updatedInvocation.updated_at,
      },
    });
  } catch (error) {
    console.error('Companion approval error:', error);
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
