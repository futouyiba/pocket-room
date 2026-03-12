/**
 * Companion Summon API Route
 * 
 * Handles summoning a Companion into a Room.
 * Validates requirement: 14.1
 * 
 * When a Companion Owner summons their Companion in a Room:
 * - Creates an ai_invocation record with status = 'summoned'
 * - Does NOT trigger any AI API calls
 * - Does NOT consume any tokens
 * - Companion enters standby mode (visible but silent)
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
    const { roomId, companionId } = body;

    // Validate required fields
    if (!roomId || !companionId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_REQUIRED_FIELD',
            message: 'Room ID and Companion ID are required',
          },
        },
        { status: 400 }
      );
    }

    // Verify companion ownership (Requirement 14.1 - only owner can summon)
    const { data: companion, error: companionError } = await supabase
      .from('ai_companions')
      .select('id, name, owner_id')
      .eq('id', companionId)
      .eq('owner_id', session.user.id)
      .single();

    if (companionError || !companion) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_NOT_OWNER',
            message: 'Companion not found or you are not the owner',
          },
        },
        { status: 403 }
      );
    }

    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .is('left_at', null)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          error: {
            code: 'ROOM_ACCESS_DENIED',
            message: 'You must be a member of this room to summon a companion',
          },
        },
        { status: 403 }
      );
    }

    // Check if companion is already summoned in this room
    const { data: existingInvocation } = await supabase
      .from('ai_invocations')
      .select('id, status')
      .eq('room_id', roomId)
      .eq('companion_id', companionId)
      .in('status', ['summoned', 'pending_approval', 'processing'])
      .single();

    if (existingInvocation) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_ALREADY_SUMMONED',
            message: 'This companion is already active in this room',
          },
        },
        { status: 400 }
      );
    }

    // Create ai_invocation record with status = 'summoned'
    // This puts the companion in standby mode (visible but silent)
    // NO API calls are made, NO tokens are consumed
    const { data: invocation, error: invocationError } = await supabase
      .from('ai_invocations')
      .insert({
        companion_id: companionId,
        room_id: roomId,
        triggered_by: session.user.id,
        status: 'summoned',
        visibility: 'public',
      })
      .select('*')
      .single();

    if (invocationError) {
      console.error('Failed to create invocation:', invocationError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to summon companion',
          },
        },
        { status: 500 }
      );
    }

    // Return success with invocation details
    return NextResponse.json({
      success: true,
      invocation: {
        id: invocation.id,
        companionId: invocation.companion_id,
        companionName: companion.name,
        roomId: invocation.room_id,
        status: invocation.status,
        createdAt: invocation.created_at,
      },
    });
  } catch (error) {
    console.error('Companion summon error:', error);
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

/**
 * GET /api/companion/summon?roomId=xxx
 * 
 * Get all summoned companions in a room
 */
export async function GET(request: NextRequest) {
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

    // Get roomId from query params
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_REQUIRED_FIELD',
            message: 'Room ID is required',
          },
        },
        { status: 400 }
      );
    }

    // Verify user is a member of the room
    const { data: membership, error: membershipError } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('user_id', session.user.id)
      .is('left_at', null)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          error: {
            code: 'ROOM_ACCESS_DENIED',
            message: 'You must be a member of this room',
          },
        },
        { status: 403 }
      );
    }

    // Get all active invocations in this room
    const { data: invocations, error: invocationsError } = await supabase
      .from('ai_invocations')
      .select(`
        id,
        companion_id,
        status,
        triggered_by,
        created_at,
        ai_companions (
          id,
          name,
          owner_id,
          profiles:owner_id (
            display_name,
            email
          )
        )
      `)
      .eq('room_id', roomId)
      .in('status', ['summoned', 'pending_approval', 'processing'])
      .order('created_at', { ascending: false });

    if (invocationsError) {
      console.error('Failed to fetch invocations:', invocationsError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch summoned companions',
          },
        },
        { status: 500 }
      );
    }

    // Get requester profiles for pending_approval invocations
    const requesterIds = invocations
      .filter(inv => inv.status === 'pending_approval')
      .map(inv => inv.triggered_by);
    
    const requesterMap = new Map<string, string>();
    if (requesterIds.length > 0) {
      const { data: requesters } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', requesterIds);
      
      if (requesters) {
        requesters.forEach(r => {
          requesterMap.set(r.id, r.display_name || r.email || 'Unknown');
        });
      }
    }

    // Format response
    const companions = invocations.map(inv => {
      const companionData = Array.isArray(inv.ai_companions) 
        ? inv.ai_companions[0] 
        : inv.ai_companions;
      
      const profileData = companionData?.profiles 
        ? (Array.isArray(companionData.profiles) ? companionData.profiles[0] : companionData.profiles)
        : null;

      return {
        invocationId: inv.id,
        companionId: inv.companion_id,
        companionName: companionData?.name || 'Unknown',
        ownerId: companionData?.owner_id || null,
        ownerName: profileData?.display_name || profileData?.email || 'Unknown',
        requesterName: inv.status === 'pending_approval' ? requesterMap.get(inv.triggered_by) : undefined,
        status: inv.status,
        triggeredBy: inv.triggered_by,
        isOwner: companionData?.owner_id === session.user.id,
        createdAt: inv.created_at,
      };
    });

    return NextResponse.json({
      companions,
    });
  } catch (error) {
    console.error('Error fetching summoned companions:', error);
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
