/**
 * Companion Management API Route
 * 
 * Handles deletion and updates of AI Companions.
 * Validates requirement: 13.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const companionId = params.id;

    // Verify ownership before deletion
    const { data: companion, error: fetchError } = await supabase
      .from('ai_companions')
      .select('id')
      .eq('id', companionId)
      .eq('owner_id', session.user.id)
      .single();

    if (fetchError || !companion) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_NOT_FOUND',
            message: 'Companion not found or unauthorized',
          },
        },
        { status: 404 }
      );
    }

    // Delete companion (RLS policy ensures only owner can delete)
    const { error: deleteError } = await supabase
      .from('ai_companions')
      .delete()
      .eq('id', companionId)
      .eq('owner_id', session.user.id);

    if (deleteError) {
      console.error('Failed to delete companion:', deleteError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to delete companion',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Companion deletion error:', error);
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const companionId = params.id;
    const body = await request.json();
    const { name, model, systemPrompt, temperature, maxTokens } = body;

    // Validate temperature (0-2)
    if (temperature !== undefined) {
      const temp = Number(temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Temperature must be between 0 and 2',
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate max_tokens (positive integer)
    if (maxTokens !== undefined) {
      const tokens = Number(maxTokens);
      if (isNaN(tokens) || tokens <= 0 || !Number.isInteger(tokens)) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Max tokens must be a positive integer',
            },
          },
          { status: 400 }
        );
      }
    }

    // Verify ownership
    const { data: companion, error: fetchError } = await supabase
      .from('ai_companions')
      .select('id')
      .eq('id', companionId)
      .eq('owner_id', session.user.id)
      .single();

    if (fetchError || !companion) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_NOT_FOUND',
            message: 'Companion not found or unauthorized',
          },
        },
        { status: 404 }
      );
    }

    // Update companion
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (model !== undefined) updateData.model = model;
    if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt?.trim() || null;
    if (temperature !== undefined) updateData.temperature = Number(temperature);
    if (maxTokens !== undefined) updateData.max_tokens = Number(maxTokens);

    const { data: updatedCompanion, error: updateError } = await supabase
      .from('ai_companions')
      .update(updateData)
      .eq('id', companionId)
      .eq('owner_id', session.user.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update companion:', updateError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update companion',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updatedCompanion.id,
      name: updatedCompanion.name,
      model: updatedCompanion.model,
      systemPrompt: updatedCompanion.system_prompt,
      temperature: updatedCompanion.temperature,
      maxTokens: updatedCompanion.max_tokens,
      providerConnectionId: updatedCompanion.provider_connection_id,
      updatedAt: updatedCompanion.updated_at,
    });
  } catch (error) {
    console.error('Companion update error:', error);
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
