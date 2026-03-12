# Companion Response Execution - Usage Example

## Overview

This document provides examples of how to use the Companion response execution API from the frontend.

## Complete Workflow Example

```typescript
// 1. Summon Companion (Task 10.1)
const summonResponse = await fetch('/api/companion/summon', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companionId: 'companion-uuid',
    roomId: 'room-uuid',
  }),
});

const { invocation } = await summonResponse.json();
// invocation.status === 'summoned'

// 2. Request Companion Response (Task 10.2)
const requestResponse = await fetch('/api/companion/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invocationId: invocation.id,
  }),
});

// invocation.status === 'pending_approval'

// 3. Approve Request (Task 10.3) - Owner only
const approveResponse = await fetch('/api/companion/approve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invocationId: invocation.id,
    approvalType: 'once', // or 'whitelist'
  }),
});

// invocation.status === 'processing'

// 4. Set Context (Task 10.4) - Owner only
const setContextResponse = await fetch('/api/companion/set-context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invocationId: invocation.id,
    // Option 1: Use existing Segment
    contextSegmentId: 'segment-uuid',
    // Option 2: Select individual messages
    // selectedMessageIds: ['msg-1', 'msg-2', 'msg-3'],
    visibility: 'public', // or 'private'
  }),
});

// 5. Execute Response (Task 10.5) - Owner only
const executeResponse = await fetch('/api/companion/execute-response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    invocationId: invocation.id,
  }),
});

const result = await executeResponse.json();
// result.invocation.status === 'completed'
// result.invocation.messageId === 'message-uuid'
// result.invocation.tokensUsed === 150
```

## React Component Example

```typescript
import { useState } from 'react';

interface CompanionResponseProps {
  invocationId: string;
  onComplete?: (messageId: string) => void;
  onError?: (error: string) => void;
}

export function CompanionResponseExecutor({
  invocationId,
  onComplete,
  onError,
}: CompanionResponseProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);

  const executeResponse = async () => {
    setIsExecuting(true);
    
    try {
      const response = await fetch('/api/companion/execute-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invocationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to execute response');
      }

      const result = await response.json();
      setTokensUsed(result.invocation.tokensUsed);
      onComplete?.(result.invocation.messageId);
      
    } catch (error) {
      console.error('Execute response error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="companion-response-executor">
      <button
        onClick={executeResponse}
        disabled={isExecuting}
        className="btn btn-primary"
      >
        {isExecuting ? 'Generating Response...' : 'Execute Companion Response'}
      </button>
      
      {tokensUsed !== null && (
        <div className="token-usage">
          Tokens used: {tokensUsed}
        </div>
      )}
    </div>
  );
}
```

## Error Handling Example

```typescript
async function executeCompanionResponse(invocationId: string) {
  try {
    const response = await fetch('/api/companion/execute-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invocationId }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (data.error?.code) {
        case 'AUTH_UNAUTHORIZED':
          // Redirect to login
          window.location.href = '/login';
          break;
          
        case 'COMPANION_NOT_OWNER':
          alert('Only the companion owner can execute responses');
          break;
          
        case 'COMPANION_INVALID_STATE':
          alert('Companion is not ready for execution. Please approve and set context first.');
          break;
          
        case 'COMPANION_CONTEXT_REQUIRED':
          alert('Please select context before executing');
          break;
          
        case 'COMPANION_PROVIDER_INVALID':
          alert('Provider connection is invalid. Please re-authorize.');
          break;
          
        case 'COMPANION_API_FAILED':
          alert(`AI API call failed: ${data.error.details}`);
          break;
          
        default:
          alert(`Error: ${data.error?.message || 'Unknown error'}`);
      }
      
      return null;
    }

    return data.invocation;
    
  } catch (error) {
    console.error('Network error:', error);
    alert('Network error. Please check your connection.');
    return null;
  }
}
```

## Real-time Updates Example

```typescript
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';

interface CompanionInvocation {
  id: string;
  status: string;
  tokensUsed?: number;
  errorMessage?: string;
}

export function useCompanionInvocation(invocationId: string) {
  const [invocation, setInvocation] = useState<CompanionInvocation | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Subscribe to invocation updates
    const channel = supabase
      .channel(`invocation:${invocationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_invocations',
          filter: `id=eq.${invocationId}`,
        },
        (payload) => {
          setInvocation(payload.new as CompanionInvocation);
        }
      )
      .subscribe();

    // Fetch initial state
    supabase
      .from('ai_invocations')
      .select('id, status, tokens_used, error_message')
      .eq('id', invocationId)
      .single()
      .then(({ data }) => {
        if (data) setInvocation(data);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invocationId]);

  return invocation;
}

// Usage in component
function CompanionStatus({ invocationId }: { invocationId: string }) {
  const invocation = useCompanionInvocation(invocationId);

  if (!invocation) return <div>Loading...</div>;

  return (
    <div className="companion-status">
      <div>Status: {invocation.status}</div>
      {invocation.status === 'completed' && (
        <div>Tokens used: {invocation.tokensUsed}</div>
      )}
      {invocation.status === 'failed' && (
        <div className="error">Error: {invocation.errorMessage}</div>
      )}
    </div>
  );
}
```

## Testing Example

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Companion Response Execution', () => {
  it('should execute companion response successfully', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        invocation: {
          id: 'inv-123',
          status: 'completed',
          messageId: 'msg-456',
          tokensUsed: 150,
        },
      }),
    });

    const response = await fetch('/api/companion/execute-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invocationId: 'inv-123' }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.invocation.status).toBe('completed');
    expect(data.invocation.tokensUsed).toBe(150);
  });

  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          code: 'COMPANION_API_FAILED',
          message: 'AI API call failed',
          details: 'Rate limit exceeded',
        },
      }),
    });

    const response = await fetch('/api/companion/execute-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invocationId: 'inv-123' }),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.error.code).toBe('COMPANION_API_FAILED');
  });
});
```

## API Response Types

```typescript
// Success Response
interface ExecuteResponseSuccess {
  success: true;
  invocation: {
    id: string;
    companionId: string;
    companionName: string;
    roomId: string;
    status: 'completed';
    messageId: string;
    tokensUsed: number;
    completedAt: string;
  };
}

// Error Response
interface ExecuteResponseError {
  error: {
    code: 
      | 'AUTH_UNAUTHORIZED'
      | 'VALIDATION_REQUIRED_FIELD'
      | 'COMPANION_NOT_FOUND'
      | 'COMPANION_INVALID_STATE'
      | 'COMPANION_NOT_OWNER'
      | 'COMPANION_CONTEXT_REQUIRED'
      | 'COMPANION_PROVIDER_INVALID'
      | 'COMPANION_API_FAILED'
      | 'DATABASE_ERROR'
      | 'INTERNAL_ERROR';
    message: string;
    details?: string;
  };
}
```

## Best Practices

1. **Always check invocation state** before calling execute-response
2. **Handle all error codes** appropriately
3. **Show loading states** during execution (can take 5-30 seconds)
4. **Display token usage** to help users understand costs
5. **Subscribe to real-time updates** for status changes
6. **Implement retry logic** for transient failures
7. **Log errors** for debugging
8. **Validate user permissions** before showing execute button

## Common Issues

### Issue: "Companion is not ready for execution"
**Solution**: Ensure the invocation has been approved and context has been set.

### Issue: "Provider connection is invalid"
**Solution**: The OAuth token may have expired. Ask the user to re-authorize the provider.

### Issue: "AI API call failed"
**Solution**: Check the error details. Common causes:
- Rate limit exceeded
- Insufficient credits
- Invalid model name
- Network timeout

### Issue: "Context must be set before executing"
**Solution**: Call `/api/companion/set-context` before executing.

## Performance Tips

1. **Debounce execute button** to prevent double-clicks
2. **Show progress indicator** during execution
3. **Cache companion configuration** to reduce database queries
4. **Use optimistic updates** for better UX
5. **Implement request timeout** (30-60 seconds)

## Security Considerations

1. **Only owner can execute** - API validates ownership
2. **Context is isolated** - Only selected messages are sent
3. **Tokens are secure** - Provider Binding handles token management
4. **Errors don't leak data** - Error messages are sanitized
5. **Rate limiting** - Consider implementing rate limits per user

## Monitoring

Track these metrics:
- Execution success rate
- Average token usage
- API response time
- Error frequency by type
- Provider-specific metrics

## Related Documentation

- [Task 10.1: Companion Summon](./TASK_10.1_COMPANION_SUMMON_SUMMARY.md)
- [Task 10.2: Companion Request](./TASK_10.2_COMPANION_REQUEST_SUMMARY.md)
- [Task 10.3: Companion Approval](./TASK_10.3_COMPANION_APPROVAL_SUMMARY.md)
- [Task 10.4: Context Selection](./TASK_10.4_CONTEXT_SELECTION_SUMMARY.md)
- [Task 10.5: Response Execution](./TASK_10.5_COMPANION_RESPONSE_SUMMARY.md)
