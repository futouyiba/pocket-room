# Provider Adapter Layer

## Overview

The Provider Adapter Layer encapsulates provider-specific OAuth 2.0 implementation details and provides a unified interface for business logic. This allows the application to support multiple AI service providers (OpenAI, Google, etc.) without the business layer needing to know about provider-specific differences.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Business Logic                        │
│         (Companion, HTTP Client, Token Refresh)          │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Unified Interface
                           ▼
┌─────────────────────────────────────────────────────────┐
│              AuthProvider Interface                      │
│  - startLogin()                                          │
│  - handleCallback()                                      │
│  - refresh()                                             │
│  - revoke()                                              │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  OpenAI  │    │  Google  │    │ Anthropic│
    │ Provider │    │ Provider │    │ Provider │
    └──────────┘    └──────────┘    └──────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   External AI Services   │
              │  (OAuth + API Endpoints) │
              └─────────────────────────┘
```

## Key Concepts

### 1. Unified Interface

All providers implement the `AuthProvider` interface, which defines four core operations:

- **startLogin()**: Initiates OAuth authorization flow with PKCE
- **handleCallback()**: Exchanges authorization code for tokens
- **refresh()**: Refreshes expired access tokens
- **revoke()**: Revokes OAuth tokens

### 2. Provider-Specific Encapsulation

Each provider adapter encapsulates:

- **OAuth Endpoints**: Authorization and token endpoints specific to each provider
- **Scopes**: Required OAuth scopes for API access
- **Account ID Extraction**: Provider-specific user info endpoints
- **Token Revocation**: Provider-specific revocation mechanisms
- **API Formats**: Request/response formats specific to each provider

### 3. Base Implementation

The `BaseAuthProvider` class provides common OAuth 2.0 + PKCE logic:

- PKCE parameter generation (code_verifier, code_challenge)
- State parameter generation and validation
- Authorization URL construction
- Token exchange implementation
- Token refresh implementation

Provider-specific implementations extend this base class and override methods as needed.

## Supported Providers

### OpenAI Provider

**OAuth Endpoints:**
- Authorization: `https://auth.openai.com/authorize`
- Token: `https://auth.openai.com/oauth/token`
- User Info: `https://api.openai.com/v1/me`

**Scopes:**
- `openai.api`: Access to OpenAI API

**Features:**
- Account ID extraction from user info endpoint
- Metadata includes email and name
- Token revocation (graceful handling, no standard endpoint)

**Usage:**
```typescript
import { OpenAIProvider } from './providers/openai';

const provider = new OpenAIProvider();

// Start OAuth flow
const { authUrl, state } = await provider.startLogin();
// Redirect user to authUrl

// Handle callback
const connection = await provider.handleCallback(code, state, codeVerifier);
// connection.accountId contains OpenAI user ID
// connection.metadata contains email and name

// Refresh token
const refreshedConnection = await provider.refresh(connection);

// Revoke token
await provider.revoke(connection);
```

### Google Provider

**OAuth Endpoints:**
- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- User Info: `https://www.googleapis.com/oauth2/v3/userinfo`
- Revocation: `https://oauth2.googleapis.com/revoke`

**Scopes:**
- `https://www.googleapis.com/auth/generative-language`: Access to Gemini API
- `https://www.googleapis.com/auth/userinfo.email`: User email
- `https://www.googleapis.com/auth/userinfo.profile`: User profile

**Features:**
- Account ID extraction from user info endpoint (sub field)
- Metadata includes email, name, and picture
- Standard token revocation endpoint

**Usage:**
```typescript
import { GoogleProvider } from './providers/google';

const provider = new GoogleProvider();

// Start OAuth flow
const { authUrl, state } = await provider.startLogin();
// Redirect user to authUrl

// Handle callback
const connection = await provider.handleCallback(code, state, codeVerifier);
// connection.accountId contains Google user ID (sub)
// connection.metadata contains email, name, and picture

// Refresh token
const refreshedConnection = await provider.refresh(connection);

// Revoke token (calls Google's revocation endpoint)
await provider.revoke(connection);
```

## Provider Factory

The `getProviderInstance()` factory function provides a centralized way to get provider instances:

```typescript
import { getProviderInstance } from './providers';

// Get OpenAI provider
const openaiProvider = getProviderInstance('openai');

// Get Google provider
const googleProvider = getProviderInstance('google');

// Get all available providers
const availableProviders = getAvailableProviders();
// Returns: ['openai', 'google']
```

## Configuration

Providers are configured via environment variables:

```env
# OpenAI
OPENAI_CLIENT_ID=your-openai-client-id
OPENAI_CLIENT_SECRET=your-openai-client-secret

# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App URL (for redirect URIs)
NEXT_PUBLIC_APP_URL=https://your-app.com
```

Redirect URIs are automatically constructed:
- OpenAI: `{APP_URL}/api/auth/callback/openai`
- Google: `{APP_URL}/api/auth/callback/google`

## Error Handling

### Token Exchange Errors

If token exchange fails, providers throw an error:

```typescript
try {
  const connection = await provider.handleCallback(code, state, codeVerifier);
} catch (error) {
  // Handle error: invalid code, expired state, network error, etc.
  console.error('Token exchange failed:', error);
}
```

### User Info Errors

If user info fetch fails, providers return a connection without account ID:

```typescript
const connection = await provider.handleCallback(code, state, codeVerifier);

if (!connection.accountId) {
  // User info fetch failed, but token exchange succeeded
  // Connection is still valid, just missing account ID
}
```

### Token Refresh Errors

If token refresh fails, providers throw an error:

```typescript
try {
  const refreshedConnection = await provider.refresh(connection);
} catch (error) {
  // Handle error: invalid refresh token, network error, etc.
  // User needs to re-authorize
  console.error('Token refresh failed:', error);
}
```

### Token Revocation Errors

- **OpenAI**: Revocation is graceful (no standard endpoint), never throws
- **Google**: Revocation calls Google's endpoint, may throw if it fails

```typescript
try {
  await provider.revoke(connection);
} catch (error) {
  // Handle revocation error (Google only)
  console.error('Token revocation failed:', error);
}
```

## Security Considerations

### PKCE (Proof Key for Code Exchange)

All providers use PKCE (RFC 7636) to prevent authorization code interception attacks:

1. Generate `code_verifier` (cryptographically random string)
2. Calculate `code_challenge = SHA256(code_verifier)` (S256 method)
3. Send `code_challenge` in authorization request
4. Send `code_verifier` in token exchange request
5. Provider verifies `SHA256(code_verifier) == code_challenge`

### State Parameter

All providers use a state parameter to prevent CSRF attacks:

1. Generate random `state` parameter
2. Store `state` in session/storage
3. Send `state` in authorization request
4. Verify `state` matches in callback

### Token Storage

Tokens are encrypted before storage (handled by the connection store layer):

- Access tokens are encrypted at rest
- Refresh tokens are encrypted at rest
- Tokens are never logged in plaintext

## Testing

Provider adapters are thoroughly tested:

### Unit Tests

- Provider configuration validation
- OAuth flow parameter generation
- Token exchange with mocked responses
- Token refresh with mocked responses
- Token revocation
- Error handling

### Integration Tests

- Full OAuth flow with test providers
- Token refresh with real endpoints (staging)
- Token revocation with real endpoints (staging)

Run tests:

```bash
npm test -- provider-adapters.test.ts
```

## Adding a New Provider

To add a new provider (e.g., Anthropic):

1. **Create provider file**: `providers/anthropic.ts`

```typescript
import { BaseAuthProvider } from '../auth-provider';
import { ProviderType, ProviderConfig, Connection } from '../types';

function getAnthropicConfig(): ProviderConfig {
  return {
    clientId: process.env.ANTHROPIC_CLIENT_ID!,
    clientSecret: process.env.ANTHROPIC_CLIENT_SECRET,
    authorizationEndpoint: 'https://auth.anthropic.com/authorize',
    tokenEndpoint: 'https://auth.anthropic.com/oauth/token',
    scopes: ['anthropic.api'],
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/anthropic`,
  };
}

export class AnthropicProvider extends BaseAuthProvider {
  constructor() {
    super(getAnthropicConfig());
  }
  
  getProviderType(): ProviderType {
    return 'anthropic';
  }
  
  // Override methods as needed for provider-specific behavior
  async handleCallback(code: string, state: string, codeVerifier: string) {
    const connection = await super.handleCallback(code, state, codeVerifier);
    
    // Fetch user info if available
    // ...
    
    return connection;
  }
}
```

2. **Update provider registry**: `providers/index.ts`

```typescript
import { AnthropicProvider } from './anthropic';

export function getProviderInstance(providerType: ProviderType): AuthProvider {
  switch (providerType) {
    case 'openai':
      return new OpenAIProvider();
    case 'google':
      return new GoogleProvider();
    case 'anthropic':
      return new AnthropicProvider(); // Add new provider
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

export function getAvailableProviders(): ProviderType[] {
  return ['openai', 'google', 'anthropic']; // Add to list
}
```

3. **Add tests**: `tests/provider-adapters.test.ts`

4. **Update environment variables**: `.env.example`

```env
ANTHROPIC_CLIENT_ID=
ANTHROPIC_CLIENT_SECRET=
```

## Design Principles

### 1. Separation of Concerns

- **Business logic** doesn't know about provider-specific OAuth details
- **Provider adapters** encapsulate all provider-specific logic
- **Base implementation** provides common OAuth 2.0 + PKCE logic

### 2. Open/Closed Principle

- System is **open for extension** (add new providers)
- System is **closed for modification** (existing code doesn't change)

### 3. Dependency Inversion

- Business logic depends on `AuthProvider` interface (abstraction)
- Business logic doesn't depend on concrete provider implementations

### 4. Single Responsibility

- Each provider adapter has one responsibility: implement OAuth for that provider
- Base class has one responsibility: provide common OAuth logic

## Related Documentation

- [OAuth 2.0 + PKCE Implementation](./README.md)
- [HTTP Client with Auto Auth Injection](./HTTP_CLIENT.md)
- [Token Refresh Mechanism](./TOKEN_REFRESH.md)
- [Usage Guide](./USAGE.md)

## References

- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [OpenAI OAuth Documentation](https://platform.openai.com/docs/guides/oauth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
