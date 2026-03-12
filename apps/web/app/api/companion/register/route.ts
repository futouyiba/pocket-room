/**
 * Companion Registration API Route
 * 
 * Handles registration of new AI Companions.
 * Validates requirements: 13.1, 13.2
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
    const { name, providerConnectionId, model, systemPrompt } = body;

    // Validate required fields
    if (!name || !providerConnectionId || !model) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_REQUIRED_FIELD',
            message: 'Name, provider connection, and model are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate provider_connection_id ownership (Requirement 13.2)
    const { data: connection, error: connectionError } = await supabase
      .from('provider_connections')
      .select('id, provider')
      .eq('id', providerConnectionId)
      .eq('user_id', session.user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_PROVIDER_INVALID',
            message: 'Invalid or unauthorized provider connection',
          },
        },
        { status: 400 }
      );
    }

    // Create companion
    const { data: companion, error: insertError } = await supabase
      .from('ai_companions')
      .insert({
        name: name.trim(),
        owner_id: session.user.id,
        provider_connection_id: providerConnectionId,
        model,
        system_prompt: systemPrompt?.trim() || null,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to create companion:', insertError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to register companion',
          },
        },
        { status: 500 }
      );
    }

    // Return companion with provider info
    return NextResponse.json({
      id: companion.id,
      name: companion.name,
      model: companion.model,
      systemPrompt: companion.system_prompt,
      providerConnectionId: companion.provider_connection_id,
      provider: connection.provider,
      createdAt: companion.created_at,
    });
  } catch (error) {
    console.error('Companion registration error:', error);
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
