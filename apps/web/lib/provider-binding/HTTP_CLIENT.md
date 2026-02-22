# HTTP Client with Automatic Authentication

## Overview

The HTTP client provides automatic authentication injection for AI API calls. Business logic doesn't need to manually handle tokens - the client automatically:

1. Injects `Authorization: Bearer <token>` header
2. Refreshes tokens when they expire
3. Retries requests on 401 responses
4. Handles token refresh failures

**Validates Requirement 2.7**: WHEN Companion 发起 AI API 调用时，THE Provider_Binding SHALL 在 HTTP 请求层自动注入 Authorization Bearer token，业务层无需感知 token 细节

## Basic Usage

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

## API Reference

### `getClient(connectionId: string): HttpClient`

Creates an HTTP client for a specific provider connection.

**Parameters:**
- `connectionId`: The ID of the provider connection

**Returns:** `HttpClient` instance

### `HttpClient` Methods

#### `request<T>(url: string, options?: HttpClientOptions): Promise<HttpClientResponse<T>>`

Make an HTTP request with automatic authentication.

**Parameters:**
- `url`: Request URL
- `options`: Request options (optional)
  - `method`: HTTP method (GET, POST, etc.)
  - `headers`: Additional headers
  - `body`: Request body
  - `maxRetries`: Maximum retry attempts for 401 responses (default: 1)

**Returns:** Promise resolving to response with `data`, `status`, `statusText`, and `headers`

**Throws:**
- `HttpClientError`: On HTTP errors (4xx, 5xx)
- `TokenRefreshError`: If token refresh fails

#### HTTP Method Helpers

```typescript
// GET request
await client.get<T>(url, options?)

// POST request
await client.post<T>(url, body?, options?)

// PUT request
await client.put<T>(url, body?, options?)

// PATCH request
await client.patch<T>(url, body?, options?)

// DELETE request
await client.delete<T>(url, options?)
```

## Examples

### OpenAI Chat Completion

```typescript
import { getClient } from '@/lib/provider-binding';

async function callOpenAI(connectionId: string, prompt: string) {
  const client = getClient(connectionId);
  
  try {
    const response = await client.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      // Token refresh failed - user needs to re-authorize
      console.error('Please re-authorize:', error.message);
      throw error;
    }
    
    if (error instanceof HttpClientError) {
      // API error
      console.error('API error:', error.status, error.response);
      throw error;
    }
    
    throw error;
  }
}
```

### Google Gemini API

```typescript
import { getClient } from '@/lib/provider-binding';

async function callGemini(connectionId: string, prompt: string) {
  const client = getClient(connectionId);
  
  const response = await client.post('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
    contents: [{
      parts: [{ text: prompt }]
    }]
  });
  
  return response.data.candidates[0].content.parts[0].text;
}
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

### Disable Retry

```typescript
const client = getClient(connectionId);

// Don't retry on 401 - fail immediately
const response = await client.post(url, body, {
  maxRetries: 0
});
```

## How It Works

### 1. Token Injection

When you make a request, the client:
1. Calls `getValidAccessToken(connectionId)` to get a valid token
2. Automatically refreshes the token if it's expiring soon (< 2 minutes)
3. Injects `Authorization: Bearer <token>` header
4. Makes the HTTP request

### 2. Automatic Retry on 401

If the API returns 401 Unauthorized:
1. The client assumes the token might be invalid
2. Retries the request (up to `maxRetries` times, default: 1)
3. `getValidAccessToken` will refresh the token on the retry
4. If retry succeeds, returns the response
5. If retry fails, throws `HttpClientError`

### 3. Token Refresh Failure

If token refresh fails (e.g., refresh token expired):
1. Throws `TokenRefreshError` with `shouldReauthorize: true`
2. Business logic should prompt user to re-authorize
3. User goes through OAuth flow again to get new tokens

## Error Handling

### `HttpClientError`

Thrown for HTTP errors (4xx, 5xx responses).

```typescript
try {
  await client.post(url, body);
} catch (error) {
  if (error instanceof HttpClientError) {
    console.error('Status:', error.status);
    console.error('Response:', error.response);
  }
}
```

### `TokenRefreshError`

Thrown when token refresh fails.

```typescript
try {
  await client.post(url, body);
} catch (error) {
  if (error instanceof TokenRefreshError) {
    if (error.shouldReauthorize) {
      // Prompt user to re-authorize
      redirectToOAuthFlow(error.provider);
    }
  }
}
```

## Integration with Companion System

In the Companion system, when executing an AI invocation:

```typescript
import { getClient } from '@/lib/provider-binding';
import { getConnection } from '@/lib/provider-binding';

async function executeCompanionResponse(
  companionId: string,
  context: string,
  systemPrompt: string
) {
  // Get companion configuration
  const companion = await getCompanion(companionId);
  
  // Get HTTP client for the companion's provider connection
  const client = getClient(companion.providerConnectionId);
  
  // Make API call - tokens handled automatically
  const response = await client.post('https://api.openai.com/v1/chat/completions', {
    model: companion.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context }
    ],
    temperature: companion.temperature,
    max_tokens: companion.maxTokens
  });
  
  return response.data.choices[0].message.content;
}
```

## Benefits

1. **Separation of Concerns**: Business logic focuses on API calls, not token management
2. **Automatic Token Refresh**: Tokens are refreshed transparently before expiration
3. **Retry Logic**: Handles transient 401 errors automatically
4. **Type Safety**: Full TypeScript support with generics
5. **Error Handling**: Clear error types for different failure scenarios
6. **Logging**: Automatic logging of requests and errors (without exposing tokens)

## Security

- Tokens are never logged in plaintext
- Tokens are encrypted in storage
- Authorization headers are only added to requests, never logged
- Token refresh happens automatically without exposing tokens to business logic

## Testing

The HTTP client is fully tested with unit tests covering:
- Authorization header injection
- Token refresh integration
- Retry logic on 401 responses
- Error handling
- HTTP method helpers
- Business logic integration

See `tests/http-client.test.ts` for examples.
