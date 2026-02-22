# Provider Binding Usage Guide

Complete guide for implementing OAuth 2.0 + PKCE provider binding with secure token storage.

## Setup

### 1. Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Token Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
TOKEN_ENCRYPTION_KEY=<32-byte-base64-encoded-key>

# OAuth Provider Credentials
OPENAI_CLIENT_ID=xxx
OPENAI_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

### 2. Generate Encryption Key

```bash
# Generate a secure 256-bit encryption key
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('base64'))"

# Add the output to .env.local as TOKEN_ENCRYPTION_KEY
```

## Complete OAuth Flow Example

### Step 1: Start Login Flow

```typescript
// app/settings/provider-binding/page.tsx
'use client';

import { useState } from 'react';
import { BaseAuthProvider } from '@/lib/provider-binding';
import { createLogger } from '@/lib/provider-binding';

const logger = createLogger('ProviderBinding');

export default function ProviderBindingPage() {
  const [loading, setLoading] = useState(false);

  const handleBindProvider = async (provider: 'openai' | 'google') => {
    setLoading(true);
    
    try {
      // Create provider instance
      const authProvider = new BaseAuthProvider({
        clientId: process.env.NEXT_PUBLIC_OPENAI_CLIENT_ID!,
        authorizationEndpoint: 'https://auth.openai.com/authorize',
        tokenEndpoint: 'https://auth.openai.com/token',
        scopes: ['openid', 'profile'],
        redirectUri: `${window.location.origin}/api/oauth/callback`,
      });

      // Start login flow
      const { authUrl, state } = await authProvider.startLogin();
      
      logger.info('Starting OAuth flow', { provider, state });
      
      // Redirect to provider authorization page
      window.location.href = authUrl;
    } catch (error) {
      logger.error('Failed to start OAuth flow', error, { provider });
      alert('Failed to start authorization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Bind AI Provider</h1>
      <button onClick={() => handleBindProvider('openai')} disabled={loading}>
        Bind OpenAI
      </button>
      <button onClick={() => handleBindProvider('google')} disabled={loading}>
        Bind Google
      </button>
    </div>
  );
}
```

### Step 2: Handle OAuth Callback

```typescript
// app/api/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseCallbackParams, validateCallbackParams } from '@/lib/provider-binding';
import { retrieveOAuthState, clearOAuthState } from '@/lib/provider-binding';
import { createConnection } from '@/lib/provider-binding';
import { createLogger } from '@/lib/provider-binding';

const logger = createLogger('OAuthCallback');

export async function GET(request: NextRequest) {
  try {
    // Parse callback parameters
    const params = parseCallbackParams(request.nextUrl.search);
    
    // Validate parameters
    const validation = validateCallbackParams(params);
    if (!validation.valid) {
      logger.warn('Invalid callback parameters', { error: validation.error });
      return NextResponse.redirect(
        new URL('/settings/provider-binding?error=invalid_callback', request.url)
      );
    }

    // Handle error from provider
    if (params.error) {
      logger.warn('OAuth error from provider', { error: params.error });
      return NextResponse.redirect(
        new URL(`/settings/provider-binding?error=${params.error}`, request.url)
      );
    }

    // Retrieve stored state
    const storedState = retrieveOAuthState(params.state!);
    if (!storedState) {
      logger.warn('Invalid or expired state', { state: params.state });
      return NextResponse.redirect(
        new URL('/settings/provider-binding?error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(
      params.code!,
      storedState.codeVerifier,
      storedState.provider
    );

    // Get current user ID (from Supabase Auth)
    const userId = await getCurrentUserId(request);
    if (!userId) {
      logger.error('User not authenticated');
      return NextResponse.redirect(
        new URL('/login?error=not_authenticated', request.url)
      );
    }

    // Store connection with encrypted tokens
    const connection = await createConnection(
      userId,
      storedState.provider,
      tokenResponse.access_token,
      tokenResponse.expires_in,
      {
        refreshToken: tokenResponse.refresh_token,
        scopes: tokenResponse.scope?.split(' ') || [],
        accountId: tokenResponse.account_id,
      }
    );

    // Clear stored state
    clearOAuthState();

    logger.info('Provider binding successful', {
      provider: storedState.provider,
      connectionId: connection.id,
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/settings/provider-binding?success=true', request.url)
    );
  } catch (error) {
    logger.error('OAuth callback failed', error);
    return NextResponse.redirect(
      new URL('/settings/provider-binding?error=callback_failed', request.url)
    );
  }
}

async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  provider: string
): Promise<any> {
  // Implementation depends on provider
  // See provider-specific documentation
  const response = await fetch('https://provider.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: process.env.OPENAI_CLIENT_ID!,
      client_secret: process.env.OPENAI_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  // Get user ID from Supabase Auth session
  // Implementation depends on your auth setup
  return 'user-id';
}
```

### Step 3: Use Connection for API Calls

```typescript
// lib/ai/client.ts
import { getConnection, isTokenExpiringSoon, updateConnection } from '@/lib/provider-binding';
import { createLogger } from '@/lib/provider-binding';

const logger = createLogger('AIClient');

export async function callAIProvider(
  connectionId: string,
  prompt: string
): Promise<string> {
  // Get connection
  const connection = await getConnection(connectionId);
  if (!connection) {
    throw new Error('Connection not found');
  }

  // Check if token needs refresh
  if (isTokenExpiringSoon(connection)) {
    logger.info('Token expiring soon, refreshing', { connectionId });
    
    // Refresh token
    const refreshed = await refreshToken(connection);
    
    // Update connection with new tokens
    await updateConnection(connectionId, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresIn: refreshed.expires_in,
    });
    
    // Get updated connection
    connection = await getConnection(connectionId);
  }

  // Make API call with access token
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${connection.accessToken}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    logger.error('AI API call failed', null, {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`AI API call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function refreshToken(connection: any): Promise<any> {
  if (!connection.refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://provider.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
      client_id: process.env.OPENAI_CLIENT_ID!,
      client_secret: process.env.OPENAI_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  return response.json();
}
```

## Security Best Practices

### 1. Never Log Tokens in Plaintext

```typescript
// ❌ BAD: Token will be logged in plaintext
console.log('Token received:', accessToken);

// ✅ GOOD: Use secure logger
import { createLogger } from '@/lib/provider-binding';
const logger = createLogger('MyModule');
logger.info('Token received', { access_token: accessToken });
// Logs: {"data":{"access_token":"sk-s...[REDACTED]"}}
```

### 2. Always Encrypt Before Storage

```typescript
// ❌ BAD: Storing plaintext token
await supabase.from('connections').insert({
  access_token: accessToken, // NEVER DO THIS
});

// ✅ GOOD: Use createConnection which encrypts automatically
import { createConnection } from '@/lib/provider-binding';
await createConnection(userId, provider, accessToken, expiresIn);
```

### 3. Check Token Expiry Before Use

```typescript
// ❌ BAD: Using token without checking expiry
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${connection.accessToken}` },
});

// ✅ GOOD: Check and refresh if needed
import { isTokenExpiringSoon } from '@/lib/provider-binding';
if (isTokenExpiringSoon(connection)) {
  connection = await refreshToken(connection);
}
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${connection.accessToken}` },
});
```

### 4. Handle Errors Gracefully

```typescript
try {
  const connection = await getConnection(connectionId);
  // Use connection
} catch (error) {
  logger.error('Failed to get connection', error, { connectionId });
  // Don't expose internal error details to user
  throw new Error('Failed to access AI provider. Please try reconnecting.');
}
```

## Testing

See `apps/web/tests/token-storage.test.ts` for comprehensive test examples.

```bash
# Run token storage tests
npm test -- token-storage.test.ts --run

# Run all provider binding tests
npm test -- provider-binding --run
```

## Troubleshooting

### Token Encryption Key Not Set

```
Error: TOKEN_ENCRYPTION_KEY environment variable is not set
```

**Solution:** Generate and add encryption key to `.env.local`:
```bash
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('base64'))"
```

### Invalid or Expired State

```
Error: Invalid or expired state
```

**Solution:** State expires after 10 minutes. User needs to restart the OAuth flow.

### Token Refresh Failed

```
Error: Token refresh failed
```

**Solution:** Refresh token may be invalid or expired. User needs to re-authorize the provider.

## References

- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)


## Automatic Token Refresh

The Provider Binding system includes automatic token refresh to ensure uninterrupted API access.

### Overview

- **Detection**: Tokens are checked for expiration (< 2 minutes remaining)
- **Automatic Refresh**: Uses refresh_token to get new access_token
- **Error Handling**: Notifies users when re-authorization is required
- **Requirements**: 2.4, 2.5

### Using Token Refresh in API Routes

```typescript
// app/api/companion/invoke/route.ts
import { getValidAccessToken, TokenRefreshError } from '@/lib/provider-binding/token-refresh';

export async function POST(request: NextRequest) {
  const { connectionId, prompt } = await request.json();
  
  try {
    // Automatically refreshes if token is expiring soon
    const accessToken = await getValidAccessToken(connectionId);
    
    // Use token in API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    
    return Response.json(await response.json());
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      // Token refresh failed, user needs to re-authorize
      return Response.json(
        {
          error: 'Token refresh failed',
          shouldReauthorize: error.shouldReauthorize,
          provider: error.provider,
        },
        { status: 401 }
      );
    }
    throw error;
  }
}
```

### Using Token Refresh in Client Components

```typescript
'use client';

import { useTokenRefresh } from '@/lib/provider-binding/hooks/use-token-refresh';
import { TokenRefreshNotifications } from '@/components/provider-binding/token-refresh-notification';
import { useState } from 'react';

export function MyComponent({ connections }) {
  const [errors, setErrors] = useState(new Map());
  
  const { statuses, refreshConnection } = useTokenRefresh(
    connections.map(c => c.id),
    {
      checkInterval: 60000, // Check every minute
      onRefreshSuccess: (connectionId) => {
        console.log('Token refreshed:', connectionId);
        setErrors(prev => {
          const next = new Map(prev);
          next.delete(connectionId);
          return next;
        });
      },
      onRefreshError: (connectionId, error) => {
        console.error('Refresh failed:', connectionId, error);
        setErrors(prev => new Map(prev).set(connectionId, error));
      },
    }
  );
  
  return (
    <div>
      {/* Display error notifications */}
      <TokenRefreshNotifications
        errors={errors}
        onReauthorize={(connectionId, provider) => {
          // Redirect to OAuth flow
          window.location.href = `/api/auth/start/${provider}`;
        }}
        onDismiss={(connectionId) => {
          setErrors(prev => {
            const next = new Map(prev);
            next.delete(connectionId);
            return next;
          });
        }}
      />
      
      {/* Display connection statuses */}
      {Array.from(statuses.values()).map(status => (
        <div key={status.connectionId}>
          Connection: {status.status}
          {status.lastRefreshed && (
            <span> (refreshed: {status.lastRefreshed.toLocaleString()})</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Manual Token Refresh

```typescript
import { refreshTokenIfNeeded } from '@/lib/provider-binding/token-refresh';

// Manually refresh a specific connection
try {
  const connection = await refreshTokenIfNeeded('connection-id');
  if (connection) {
    console.log('Token valid until:', connection.expiresAt);
  }
} catch (error) {
  if (error instanceof TokenRefreshError) {
    if (error.shouldReauthorize) {
      // User needs to re-authorize
      console.error('Please re-authorize:', error.provider);
    }
  }
}
```

### Batch Refresh

```typescript
import { batchRefreshTokens } from '@/lib/provider-binding/token-refresh';

// Refresh multiple connections at once
const results = await batchRefreshTokens(['conn-1', 'conn-2', 'conn-3']);

for (const [connectionId, result] of results) {
  if (result instanceof TokenRefreshError) {
    console.error(`Failed: ${connectionId}`, result.message);
  } else {
    console.log(`Success: ${connectionId}`, result.expiresAt);
  }
}
```

### Error Handling

The token refresh system distinguishes between fatal and non-fatal errors:

**Fatal Errors (require re-authorization):**
- `invalid_grant`
- `invalid refresh token`
- `refresh token expired`
- `refresh token revoked`
- `unauthorized`
- `access denied`

**Non-fatal Errors (can retry):**
- Network errors
- Temporary server errors

```typescript
try {
  const token = await getValidAccessToken(connectionId);
} catch (error) {
  if (error instanceof TokenRefreshError) {
    if (error.shouldReauthorize) {
      // Fatal error - user must re-authorize
      notifyUser(`Please re-authorize ${error.provider}`);
      redirectToOAuth(error.provider);
    } else {
      // Non-fatal error - can retry later
      notifyUser('Temporary error, please try again');
    }
  }
}
```

### Complete Example Component

See `apps/web/components/provider-binding/connection-manager.tsx` for a complete example showing:
- Automatic token refresh with visual status indicators
- Error notifications with re-authorization flow
- Manual refresh buttons
- Connection status display

### Testing Token Refresh

```bash
# Run token refresh tests
npm test -- token-refresh.test.ts --run
```

See `apps/web/tests/token-refresh.test.ts` for comprehensive test examples.

### Configuration

**Check Interval**: Default is 60 seconds (1 minute)
```typescript
useTokenRefresh(connectionIds, {
  checkInterval: 30000, // Check every 30 seconds
});
```

**Expiry Threshold**: Tokens are refreshed when < 2 minutes remaining
```typescript
// Defined in connection-store.ts
export function isTokenExpiringSoon(connection: Connection): boolean {
  const twoMinutes = 2 * 60 * 1000;
  return (connection.expiresAt.getTime() - Date.now()) < twoMinutes;
}
```

### Documentation

For detailed documentation, see:
- `apps/web/lib/provider-binding/TOKEN_REFRESH.md` - Complete token refresh guide
- `apps/web/lib/provider-binding/token-refresh.ts` - Core implementation
- `apps/web/lib/provider-binding/hooks/use-token-refresh.ts` - React hook
- `apps/web/components/provider-binding/token-refresh-notification.tsx` - UI components

## HTTP Client with Automatic Authentication

The Provider Binding system includes an HTTP client that automatically handles authentication for AI API calls.

### Overview

- **Automatic Token Injection**: Adds `Authorization: Bearer <token>` header automatically
- **Token Refresh**: Refreshes tokens before they expire
- **Retry on 401**: Automatically retries requests when tokens are invalid
- **Business Logic Simplicity**: No manual token handling required
- **Requirements**: 2.7

### Basic Usage

```typescript
import { getClient } from '@/lib/provider-binding';

// Get HTTP client for a connection
const client = getClient(connectionId);

// Make API calls - tokens are handled automatically
const response = await client.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.data);
```

### Companion Integration Example

```typescript
// app/api/companion/invoke/route.ts
import { getClient, HttpClientError, TokenRefreshError } from '@/lib/provider-binding';

export async function POST(request: NextRequest) {
  const { companionId, context, systemPrompt } = await request.json();
  
  try {
    // Get companion configuration
    const companion = await getCompanion(companionId);
    
    // Get HTTP client - automatically handles tokens
    const client = getClient(companion.providerConnectionId);
    
    // Make API call - no manual token handling needed
    const response = await client.post('https://api.openai.com/v1/chat/completions', {
      model: companion.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ],
      temperature: companion.temperature,
      max_tokens: companion.maxTokens
    });
    
    return Response.json({
      content: response.data.choices[0].message.content,
      tokensUsed: response.data.usage.total_tokens
    });
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      // Token refresh failed - user needs to re-authorize
      return Response.json(
        {
          error: 'Token refresh failed',
          shouldReauthorize: error.shouldReauthorize,
          provider: error.provider,
        },
        { status: 401 }
      );
    }
    
    if (error instanceof HttpClientError) {
      // API error
      return Response.json(
        { error: 'API call failed', details: error.response },
        { status: error.status }
      );
    }
    
    throw error;
  }
}
```

### HTTP Methods

```typescript
const client = getClient(connectionId);

// GET request
const response = await client.get('https://api.example.com/data');

// POST request
const response = await client.post('https://api.example.com/data', {
  key: 'value'
});

// PUT request
const response = await client.put('https://api.example.com/data/123', {
  key: 'updated'
});

// PATCH request
const response = await client.patch('https://api.example.com/data/123', {
  key: 'patched'
});

// DELETE request
const response = await client.delete('https://api.example.com/data/123');
```

### Custom Headers

```typescript
const client = getClient(connectionId);

const response = await client.post(url, body, {
  headers: {
    'X-Custom-Header': 'value',
    'Content-Type': 'application/json'
  }
});
```

### Retry Configuration

```typescript
const client = getClient(connectionId);

// Disable retry on 401
const response = await client.post(url, body, {
  maxRetries: 0
});

// Increase retry attempts
const response = await client.post(url, body, {
  maxRetries: 3
});
```

### Error Handling

```typescript
import { getClient, HttpClientError, TokenRefreshError } from '@/lib/provider-binding';

try {
  const client = getClient(connectionId);
  const response = await client.post(url, body);
} catch (error) {
  if (error instanceof TokenRefreshError) {
    // Token refresh failed - user needs to re-authorize
    console.error('Please re-authorize:', error.provider);
    redirectToOAuthFlow(error.provider);
  } else if (error instanceof HttpClientError) {
    // API error
    console.error('API error:', error.status, error.response);
  } else {
    // Other error
    throw error;
  }
}
```

### Benefits

1. **No Manual Token Handling**: Business logic doesn't need to manage tokens
2. **Automatic Refresh**: Tokens are refreshed transparently before expiration
3. **Retry Logic**: Handles transient 401 errors automatically
4. **Type Safety**: Full TypeScript support with generics
5. **Security**: Tokens are never logged in plaintext

### Documentation

For detailed documentation, see:
- `apps/web/lib/provider-binding/HTTP_CLIENT.md` - Complete HTTP client guide
- `apps/web/lib/provider-binding/http-client.ts` - Core implementation
- `apps/web/tests/http-client.test.ts` - Test examples
