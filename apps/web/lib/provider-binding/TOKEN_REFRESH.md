# Token Refresh Mechanism

Automatic token refresh system for Provider Binding OAuth connections.

## Overview

The token refresh mechanism automatically detects when access tokens are about to expire (< 2 minutes) and refreshes them using the refresh_token. If refresh fails, users are notified to re-authorize.

**Requirements**: 2.4, 2.5

## Architecture

```
┌─────────────────┐
│  Application    │
│  (API calls)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  getValidAccessToken()  │
│  - Checks expiration    │
│  - Auto-refreshes       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  refreshTokenIfNeeded() │
│  - Detects expiring     │
│  - Calls provider       │
│  - Updates storage      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Provider.refresh()     │
│  - OAuth token refresh  │
└─────────────────────────┘
```

## Core Functions

### `refreshTokenIfNeeded(connectionId: string)`

Checks if a connection's token needs refresh and performs the refresh if needed.

**Returns:**
- `Connection` - Updated connection if refreshed
- `Connection` - Original connection if no refresh needed
- `null` - If connection not found

**Throws:**
- `TokenRefreshError` - If refresh fails

**Example:**
```typescript
import { refreshTokenIfNeeded } from '@/lib/provider-binding/token-refresh';

try {
  const connection = await refreshTokenIfNeeded('conn-123');
  if (connection) {
    console.log('Token is valid until:', connection.expiresAt);
  }
} catch (error) {
  if (error instanceof TokenRefreshError) {
    if (error.shouldReauthorize) {
      // Notify user to re-authorize
      console.error('Please re-authorize:', error.provider);
    }
  }
}
```

### `getValidAccessToken(connectionId: string)`

Gets a valid access token, automatically refreshing if needed. This is the main entry point for API calls.

**Returns:**
- `string` - Valid access token

**Throws:**
- `TokenRefreshError` - If refresh fails
- `Error` - If connection not found

**Example:**
```typescript
import { getValidAccessToken } from '@/lib/provider-binding/token-refresh';

// Use in API calls
async function callOpenAI(connectionId: string, prompt: string) {
  const accessToken = await getValidAccessToken(connectionId);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  
  return response.json();
}
```

### `batchRefreshTokens(connectionIds: string[])`

Refreshes multiple connections in parallel.

**Returns:**
- `Map<string, Connection | TokenRefreshError>` - Results for each connection

**Example:**
```typescript
import { batchRefreshTokens } from '@/lib/provider-binding/token-refresh';

const results = await batchRefreshTokens(['conn-1', 'conn-2', 'conn-3']);

for (const [connectionId, result] of results) {
  if (result instanceof TokenRefreshError) {
    console.error(`Failed to refresh ${connectionId}:`, result.message);
  } else {
    console.log(`Refreshed ${connectionId}, expires at:`, result.expiresAt);
  }
}
```

## React Hook

### `useTokenRefresh(connectionIds, options)`

React hook for automatic token refresh in UI components.

**Options:**
- `checkInterval` - Check interval in ms (default: 60000 = 1 minute)
- `onRefreshSuccess` - Callback when refresh succeeds
- `onRefreshError` - Callback when refresh fails
- `enabled` - Enable automatic refresh (default: true)

**Returns:**
- `statuses` - Map of connection ID to refresh status
- `refreshConnection` - Function to manually refresh a connection
- `refreshAll` - Function to manually refresh all connections

**Example:**
```typescript
'use client';

import { useTokenRefresh } from '@/lib/provider-binding/hooks/use-token-refresh';
import { TokenRefreshNotifications } from '@/components/provider-binding/token-refresh-notification';
import { useState } from 'react';

export function MyComponent({ connectionIds }: { connectionIds: string[] }) {
  const [errors, setErrors] = useState(new Map());
  
  const { statuses, refreshConnection } = useTokenRefresh(connectionIds, {
    checkInterval: 60000, // Check every minute
    onRefreshSuccess: (connectionId, connection) => {
      console.log('Refreshed:', connectionId);
      // Remove error if it exists
      setErrors(prev => {
        const next = new Map(prev);
        next.delete(connectionId);
        return next;
      });
    },
    onRefreshError: (connectionId, error) => {
      console.error('Refresh failed:', connectionId, error);
      // Add error to display notification
      setErrors(prev => new Map(prev).set(connectionId, error));
    },
  });
  
  return (
    <div>
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
      
      {/* Your component content */}
      {Array.from(statuses.values()).map(status => (
        <div key={status.connectionId}>
          Connection {status.connectionId}: {status.status}
          {status.lastRefreshed && (
            <span> (last refreshed: {status.lastRefreshed.toLocaleString()})</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

## UI Components

### `TokenRefreshNotification`

Displays a notification when token refresh fails.

**Props:**
- `error` - TokenRefreshError to display
- `onReauthorize` - Callback when user clicks "Re-authorize"
- `onDismiss` - Callback when user dismisses notification

### `TokenRefreshNotifications`

Container for multiple token refresh notifications.

**Props:**
- `errors` - Map of connection ID to TokenRefreshError
- `onReauthorize` - Callback when user clicks "Re-authorize"
- `onDismiss` - Callback when user dismisses notification

## Error Handling

### `TokenRefreshError`

Custom error class for token refresh failures.

**Properties:**
- `message` - Error message
- `connectionId` - Connection ID that failed
- `provider` - Provider type (openai, google, etc.)
- `shouldReauthorize` - Whether user should re-authorize

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

## Integration with Existing Code

### In API Routes

```typescript
import { getValidAccessToken } from '@/lib/provider-binding/token-refresh';

export async function POST(request: Request) {
  const { connectionId, prompt } = await request.json();
  
  try {
    // Automatically refreshes if needed
    const accessToken = await getValidAccessToken(connectionId);
    
    // Use token in API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      // ...
    });
    
    return Response.json(await response.json());
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      return Response.json(
        { error: 'Token refresh failed', shouldReauthorize: error.shouldReauthorize },
        { status: 401 }
      );
    }
    throw error;
  }
}
```

### In Server Components

```typescript
import { refreshTokenIfNeeded } from '@/lib/provider-binding/token-refresh';
import { listConnections } from '@/lib/provider-binding/connection-store';

export default async function SettingsPage() {
  const connections = await listConnections(userId);
  
  // Refresh all connections
  await Promise.all(
    connections.map(conn => refreshTokenIfNeeded(conn.id))
  );
  
  return <div>Settings</div>;
}
```

### In Client Components

```typescript
'use client';

import { useTokenRefresh } from '@/lib/provider-binding/hooks/use-token-refresh';

export function CompanionList({ connections }) {
  const { statuses } = useTokenRefresh(
    connections.map(c => c.id),
    {
      onRefreshError: (connectionId, error) => {
        if (error.shouldReauthorize) {
          toast.error(`Please re-authorize ${error.provider}`);
        }
      },
    }
  );
  
  return <div>Companion list</div>;
}
```

## Testing

### Unit Tests

See `apps/web/tests/token-refresh.test.ts` for comprehensive unit tests.

**Test Coverage:**
- Token not expiring soon (no refresh)
- Token expiring soon (refresh triggered)
- Token already expired (refresh triggered)
- No refresh token available (error)
- Refresh fails (error with shouldReauthorize)
- Batch refresh with mixed results

### Manual Testing

1. Create a connection with short expiry (1 minute)
2. Wait for automatic refresh to trigger
3. Verify token is refreshed in database
4. Simulate refresh failure (invalid refresh token)
5. Verify user notification is displayed

## Configuration

### Environment Variables

```env
# Provider OAuth credentials
OPENAI_CLIENT_ID=your_client_id
OPENAI_CLIENT_SECRET=your_client_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# App URL for OAuth callbacks
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Refresh Timing

- **Check threshold**: 2 minutes before expiry
- **Check interval**: 1 minute (configurable in useTokenRefresh)
- **Retry attempts**: None (fails immediately, user must re-authorize)

## Security Considerations

1. **Token Storage**: Tokens are encrypted in database
2. **Logging**: Tokens are never logged in plaintext
3. **Error Messages**: Don't leak token values in errors
4. **HTTPS Only**: All OAuth flows use HTTPS
5. **State Validation**: PKCE + state parameter prevent CSRF

## Future Enhancements

1. **Retry Logic**: Add exponential backoff for transient errors
2. **Background Refresh**: Server-side cron job to refresh all expiring tokens
3. **Refresh Queue**: Queue refresh requests to avoid rate limits
4. **Metrics**: Track refresh success/failure rates
5. **Alerts**: Notify admins of high refresh failure rates
