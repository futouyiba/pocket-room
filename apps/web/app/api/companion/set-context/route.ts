/**
 * Companion Set Context API Route
 * 
 * Associates selected context (messages or Segment) with an approved Companion invocation.
 * Validates requirements: 15.1, 15.2
 * 
 * After approval (status = 'processing'), the Owner must explicitly select context:
 * - Option 1: Select individual messages (creates a temporary context Segment)
 * - Option 2: Select an existing Segment
 * 
 * This prevents the Companion from automatically accessing the full Room Timeline.
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
    const { invocationId, contextSegmentId, selectedMessageIds, visibility } = body;

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

    // Validate that either contextSegmentId or selectedMessageIds is provided
    if (!contextSegmentId && (!selectedMessageIds || selectedMessageIds.length === 0)) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_CONTEXT_REQUIRED',
            message: 'Either context segment ID or selected message IDs must be provided',
          },
        },
        { status: 400 }
      );
    }

    // Validate visibility
    if (visibility && !['public', 'private'].includes(visibility)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_INVALID_ENUM',
            message: 'Visibility must be "public" or "private"',
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

    // Verify invocation is in processing state (already approved)
    if (invocation.status !== 'processing') {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_INVALID_STATE',
            message: `Companion is in ${invocation.status} state, context can only be set for processing invocations`,
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
            message: 'Only the companion owner can set context',
          },
        },
        { status: 403 }
      );
    }

    let finalContextSegmentId = contextSegmentId;

    // If selectedMessageIds is provided, create a temporary context Segment
    if (selectedMessageIds && selectedMessageIds.length > 0) {
      // Create a temporary segment for the selected messages
      const { data: newSegment, error: segmentError } = await supabase
        .from('segments')
        .insert({
          name: `Context for ${companionData.name}`,
          description: `Temporary context segment created for Companion invocation`,
          created_by: session.user.id,
          room_id: invocation.room_id,
          is_shared_to_room: false,
          is_draft: false,
        })
        .select('id')
        .single();

      if (segmentError || !newSegment) {
        console.error('Failed to create context segment:', segmentError);
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Failed to create context segment',
            },
          },
          { status: 500 }
        );
      }

      // Associate messages with the segment
      const segmentMessages = selectedMessageIds.map((messageId: string, index: number) => ({
        segment_id: newSegment.id,
        message_id: messageId,
        message_order: index,
      }));

      const { error: segmentMessagesError } = await supabase
        .from('segment_messages')
        .insert(segmentMessages);

      if (segmentMessagesError) {
        console.error('Failed to associate messages with segment:', segmentMessagesError);
        // Clean up the segment
        await supabase.from('segments').delete().eq('id', newSegment.id);
        return NextResponse.json(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: 'Failed to associate messages with context segment',
            },
          },
          { status: 500 }
        );
      }

      finalContextSegmentId = newSegment.id;
    }

    // Verify the context segment exists and belongs to the same room
    if (finalContextSegmentId) {
      const { data: segment, error: segmentCheckError } = await supabase
        .from('segments')
        .select('id, room_id')
        .eq('id', finalContextSegmentId)
        .single();

      if (segmentCheckError || !segment) {
        return NextResponse.json(
          {
            error: {
              code: 'SEGMENT_NOT_FOUND',
              message: 'Context segment not found',
            },
          },
          { status: 404 }
        );
      }

      if (segment.room_id !== invocation.room_id) {
        return NextResponse.json(
          {
            error: {
              code: 'SEGMENT_CROSS_ROOM',
              message: 'Context segment must be from the same room',
            },
          },
          { status: 400 }
        );
      }
    }

    // Update invocation with context segment and visibility
    const { data: updatedInvocation, error: updateError } = await supabase
      .from('ai_invocations')
      .update({
        context_segment_id: finalContextSegmentId,
        visibility: visibility || 'public',
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
            message: 'Failed to set context for companion',
          },
        },
        { status: 500 }
      );
    }

    // Return success with updated invocation details
    return NextResponse.json({
      success: true,
      invocation: {
        id: updatedInvocation.id,
        companionId: updatedInvocation.companion_id,
        companionName: companionData.name,
        roomId: updatedInvocation.room_id,
        status: updatedInvocation.status,
        contextSegmentId: updatedInvocation.context_segment_id,
        visibility: updatedInvocation.visibility,
        updatedAt: updatedInvocation.updated_at,
      },
    });
  } catch (error) {
    console.error('Set context error:', error);
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
