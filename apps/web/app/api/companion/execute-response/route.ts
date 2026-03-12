/**
 * Companion Execute Response API Route
 * 
 * Executes the actual AI API call and generates the Companion's response.
 * Validates requirements: 14.5, 14.9
 * 
 * After context is set (status = 'processing' with context_segment_id):
 * - Retrieves Companion configuration (model, system_prompt, temperature, max_tokens)
 * - Retrieves context content from the selected Segment
 * - Calls AI Provider API through Provider Binding (automatic token injection)
 * - Creates a Message record with the response
 * - Updates ai_invocation status to 'completed'
 * - Records tokens_used
 * 
 * Error Handling (Requirement 14.9):
 * - Catches all API call failures
 * - Updates ai_invocation status to 'failed'
 * - Records user-friendly error_message (sanitized, no sensitive info)
 * - Categorizes errors (timeout, rate limit, quota exceeded, auth failure, etc.)
 * - Returns appropriate error response to both triggerer and owner
 * - Logs detailed error information for debugging (with sensitive data redacted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { getClient } from '@/lib/provider-binding/http-client';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('CompanionExecuteResponse');

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

    logger.info('Executing companion response', { invocationId });

    // Get the invocation with full details
    const { data: invocation, error: invocationError } = await supabase
      .from('ai_invocations')
      .select(`
        id,
        companion_id,
        room_id,
        status,
        triggered_by,
        context_segment_id,
        visibility,
        ai_companions (
          id,
          name,
          owner_id,
          provider_connection_id,
          model,
          system_prompt,
          temperature,
          max_tokens
        )
      `)
      .eq('id', invocationId)
      .single();

    if (invocationError || !invocation) {
      logger.warn('Invocation not found', { invocationId });
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

    // Verify invocation is in processing state
    if (invocation.status !== 'processing') {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_INVALID_STATE',
            message: `Companion is in ${invocation.status} state, can only execute processing invocations`,
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
            message: 'Only the companion owner can execute responses',
          },
        },
        { status: 403 }
      );
    }

    // Verify context has been set
    if (!invocation.context_segment_id) {
      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_CONTEXT_REQUIRED',
            message: 'Context must be set before executing response',
          },
        },
        { status: 400 }
      );
    }

    // Get context content from segment
    const { data: segmentMessages, error: segmentError } = await supabase
      .from('segment_messages')
      .select(`
        message_order,
        messages (
          id,
          content,
          created_at,
          profiles (
            display_name,
            email
          )
        )
      `)
      .eq('segment_id', invocation.context_segment_id)
      .order('message_order', { ascending: true });

    if (segmentError) {
      logger.error('Failed to fetch context messages', segmentError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch context messages',
          },
        },
        { status: 500 }
      );
    }

    // Build context string from messages
    const contextMessages = segmentMessages || [];
    const contextString = contextMessages
      .map((sm: any) => {
        const msg = sm.messages;
        const profile = msg.profiles;
        const displayName = profile?.display_name || profile?.email || 'Unknown';
        return `${displayName}: ${msg.content}`;
      })
      .join('\n\n');

    logger.debug('Context prepared', {
      invocationId,
      messageCount: contextMessages.length,
    });

    // Get provider connection
    const { data: connection, error: connectionError } = await supabase
      .from('provider_connections')
      .select('*')
      .eq('id', companionData.provider_connection_id)
      .single();

    if (connectionError || !connection) {
      logger.error('Provider connection not found', connectionError);
      
      const userFriendlyMessage = 'The AI service connection is no longer valid. Please reconnect your AI provider account in settings.';
      
      // Update invocation to failed
      await supabase
        .from('ai_invocations')
        .update({
          status: 'failed',
          error_message: userFriendlyMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', invocationId);

      logger.info('Invocation marked as failed due to invalid provider connection', {
        invocationId,
        companionId: invocation.companion_id,
        triggeredBy: invocation.triggered_by,
        ownerId: companionData.owner_id,
      });

      return NextResponse.json(
        {
          error: {
            code: 'COMPANION_PROVIDER_INVALID',
            message: userFriendlyMessage,
          },
        },
        { status: 400 }
      );
    }

    try {
      // Get HTTP client with automatic token injection
      const httpClient = getClient(connection.id);

      let responseText = '';
      let tokensUsed = 0;

      // Call AI API based on provider
      if (connection.provider === 'openai') {
        const messages = [];
        
        // Add system prompt if configured
        if (companionData.system_prompt) {
          messages.push({
            role: 'system',
            content: companionData.system_prompt,
          });
        }

        // Add context as user message
        messages.push({
          role: 'user',
          content: contextString,
        });

        logger.debug('Calling OpenAI API', {
          invocationId,
          model: companionData.model,
          temperature: companionData.temperature,
          maxTokens: companionData.max_tokens,
        });

        const response = await httpClient.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: companionData.model,
            messages,
            temperature: companionData.temperature,
            max_tokens: companionData.max_tokens,
          }
        );

        responseText = response.data.choices[0]?.message?.content || '';
        tokensUsed = response.data.usage?.total_tokens || 0;

      } else if (connection.provider === 'google') {
        // Build prompt with system prompt and context
        let prompt = '';
        if (companionData.system_prompt) {
          prompt += `${companionData.system_prompt}\n\n`;
        }
        prompt += contextString;

        logger.debug('Calling Google Gemini API', {
          invocationId,
          model: companionData.model,
        });

        const response = await httpClient.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${companionData.model}:generateContent`,
          {
            contents: [{
              parts: [{ text: prompt }],
            }],
            generationConfig: {
              temperature: companionData.temperature,
              maxOutputTokens: companionData.max_tokens,
            },
          }
        );

        responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Google doesn't always return token usage in the same format
        tokensUsed = response.data.usageMetadata?.totalTokenCount || 0;

      } else {
        throw new Error(`Unsupported provider: ${connection.provider}`);
      }

      logger.info('AI API call successful', {
        invocationId,
        provider: connection.provider,
        tokensUsed,
      });

      // Create message record with the response
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          room_id: invocation.room_id,
          user_id: companionData.owner_id, // Message is from the companion owner
          content: responseText,
          message_type: 'text',
          is_deleted: false,
        })
        .select('id')
        .single();

      if (messageError || !message) {
        logger.error('Failed to create message', messageError);
        throw new Error('Failed to create message record');
      }

      // Update invocation to completed
      const { error: updateError } = await supabase
        .from('ai_invocations')
        .update({
          status: 'completed',
          response_message_id: message.id,
          tokens_used: tokensUsed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', invocationId);

      if (updateError) {
        logger.error('Failed to update invocation', updateError);
        throw new Error('Failed to update invocation status');
      }

      logger.info('Companion response executed successfully', {
        invocationId,
        messageId: message.id,
        tokensUsed,
      });

      return NextResponse.json({
        success: true,
        invocation: {
          id: invocation.id,
          companionId: invocation.companion_id,
          companionName: companionData.name,
          roomId: invocation.room_id,
          status: 'completed',
          messageId: message.id,
          tokensUsed,
          completedAt: new Date().toISOString(),
        },
      });

    } catch (error) {
      logger.error('AI API call failed', error);

      // Sanitize and categorize error message for user display
      let userFriendlyMessage = 'AI API call failed. Please try again later.';
      let errorCode = 'COMPANION_API_FAILED';
      let errorDetails = '';

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Categorize common API errors
        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          errorCode = 'PROVIDER_API_TIMEOUT';
          userFriendlyMessage = 'The AI service took too long to respond. Please try again.';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorCode = 'PROVIDER_API_RATE_LIMIT';
          userFriendlyMessage = 'Too many requests to the AI service. Please wait a moment and try again.';
        } else if (errorMessage.includes('quota') || errorMessage.includes('insufficient')) {
          errorCode = 'PROVIDER_API_QUOTA_EXCEEDED';
          userFriendlyMessage = 'AI service quota exceeded. Please check your account balance or upgrade your plan.';
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
          errorCode = 'PROVIDER_TOKEN_INVALID';
          userFriendlyMessage = 'AI service authentication failed. Please reconnect your AI provider account.';
        } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
          errorCode = 'PROVIDER_API_FORBIDDEN';
          userFriendlyMessage = 'Access to the AI service was denied. Please check your account permissions.';
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          errorCode = 'PROVIDER_API_NOT_FOUND';
          userFriendlyMessage = 'The requested AI model or endpoint was not found. Please check your companion configuration.';
        } else if (errorMessage.includes('server error') || errorMessage.includes('500') || errorMessage.includes('503')) {
          errorCode = 'PROVIDER_API_SERVER_ERROR';
          userFriendlyMessage = 'The AI service is experiencing issues. Please try again later.';
        }
        
        // Store sanitized error details (remove sensitive information)
        errorDetails = error.message
          .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
          .replace(/api[_-]?key[:\s=]+[A-Za-z0-9\-._~+/]+=*/gi, 'api_key=[REDACTED]')
          .replace(/token[:\s=]+[A-Za-z0-9\-._~+/]+=*/gi, 'token=[REDACTED]');
      } else {
        errorDetails = String(error);
      }

      // Update invocation to failed with user-friendly message
      await supabase
        .from('ai_invocations')
        .update({
          status: 'failed',
          error_message: userFriendlyMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', invocationId);

      logger.info('Invocation marked as failed', {
        invocationId,
        errorCode,
        companionId: invocation.companion_id,
        triggeredBy: invocation.triggered_by,
        ownerId: companionData.owner_id,
      });

      return NextResponse.json(
        {
          error: {
            code: errorCode,
            message: userFriendlyMessage,
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
          },
        },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Unexpected error in execute response', error);
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
