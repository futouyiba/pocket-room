# Provider Binding Module

OAuth 2.0 + PKCE implementation for binding external AI service provider accounts (OpenAI, Google, etc.).

**Important**: This is separate from Gate Auth (user authentication). Provider Binding is used to authorize access to AI services, not to authenticate users.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Provider Binding                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     PKCE     │  │    State     │  │     Auth     │     │
│  │  Generator   │  │   Manager    │  │   Provider   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  URL Builder   │                       │
│                    └────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. PKCE (pkce.ts)

Implements RFC 7636 with S256 code challenge method.

**Functions:**
- `generateCodeVerifier()`: Generate cryptographically secure code_verifier (64 chars)
- `generateCodeChallenge(verifier)`: Generate S256 code_challenge from verifier
- `generateState()`: Generate random state parameter for CSRF protection
- `isValidCodeVerifier(verifier)`: Validate code_verifier format
- `isValidState(state)`: Validate state parameter format

**Example:**
```typescript
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

const codeVerifier = generateCodeVerifier();
// => "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

const codeChallenge = await generateCodeChallenge(codeVerifier);
// => "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
```

### 2. State Manager (state-manager.ts)

Manages OAuth state during authorization flow using sessionStorage.

**Functions:**
- `storeOAuthState(state)`: Store state and code_verifier for callback
- `retrieveOAuthState(stateParam)`: Retrieve and validate stored state
- `clearOAuthState()`: Clear stored state
- `hasOAuthState()`: Check if state exists

**State Object:**
```typescript
interface OAuthState {
  state: string;           // Random state parameter
  codeVerifier: string;    // PKCE code_verifier
  provider: ProviderType;  // 'openai' | 'google' | 'anthropic'
  redirectUri: string;     // OAuth redirect URI
  createdAt: number;       // Timestamp for expiry check
}
```

**Expiry:** State expires after 10 minutes.

### 3. AuthProvider (auth-provider.ts)

Interface and base implementation for OAuth providers.

**Interface:**
```typescript
interface AuthProvider {
  getProviderType(): ProviderType;
  startLogin(): Promise<{ authUrl: string; state: string }>;
  handleCallback(code: string, state: string, codeVerifier: string): Promise<Connection>;
  refresh(connection: Connection): Promise<Connection>;
  revoke(connection: Connection): Promise<void>;
}
```

**Base Implementation:**
- `BaseAuthProvider`: Abstract class with common OAuth logic
- Handles PKCE parameter generation
- Implements token exchange and refresh
- Provider-specific implementations extend this class

### 4. URL Builder (url-builder.ts)

Utilities for building and parsing OAuth URLs.

**Functions:**
- `buildAuthorizationUrl(config)`: Build complete authorization URL
- `parseCallbackParams(url)`: Parse callback URL parameters
- `validateCallbackParams(params)`: Validate callback parameters

## OAuth Flow

### 1. Start Login

```typescript
import { BaseAuthProvider } from './auth-provider';

class OpenAIProvider extends BaseAuthProvider {
  getProviderType() {
    return 'openai';
  }
}

const provider = new OpenAIProvider({
  clientId: 'your-client-id',
  authorizationEndpoint: 'https://auth.openai.com/authorize',
  tokenEndpoint: 'https://auth.openai.com/token',
  scopes: ['openid', 'profile'],
  redirectUri: 'https://yourapp.com/callback',
});

// Start login flow
const { authUrl, state } = await provider.startLogin();
// Redirect user to authUrl
window.location.href = authUrl;
```

**What happens:**
1. Generate `code_verifier` (random 64-char string)
2. Generate `code_challenge` = SHA256(code_verifier) in base64url
3. Generate `state` (random 32-char string)
4. Store state + code_verifier in sessionStorage
5. Build authorization URL with PKCE parameters
6. Return URL for redirect

### 2. Handle Callback

```typescript
import { retrieveOAuthState, clearOAuthState } from './state-manager';
import { parseCallbackParams, validateCallbackParams } from './url-builder';

// Parse callback URL
const params = parseCallbackParams(window.location.search);

// Validate parameters
const validation = validateCallbackParams(params);
if (!validation.valid) {
  throw new Error(validation.error);
}

// Retrieve stored state
const storedState = retrieveOAuthState(params.state!);
if (!storedState) {
  throw new Error('Invalid or expired state');
}

// Exchange code for tokens
const connection = await provider.handleCallback(
  params.code!,
  params.state!,
  storedState.codeVerifier
);

// Clear state
clearOAuthState();

// Save connection to database (with encryption)
await saveConnection(connection);
```

**What happens:**
1. Parse `code` and `state` from callback URL
2. Validate callback parameters
3. Retrieve stored state from sessionStorage
4. Validate state parameter matches
5. Exchange authorization code for tokens using code_verifier
6. Clear stored state
7. Return connection object with tokens

### 3. Token Refresh

```typescript
// Check if token is expiring soon
const expiresIn = connection.expiresAt.getTime() - Date.now();
if (expiresIn < 2 * 60 * 1000) { // Less than 2 minutes
  // Refresh token
  const updatedConnection = await provider.refresh(connection);
  await updateConnection(updatedConnection);
}
```

## Security Features

### PKCE (Proof Key for Code Exchange)

Prevents authorization code interception attacks:
1. Attacker cannot use intercepted code without code_verifier
2. code_verifier is never transmitted over the network
3. Only code_challenge is sent in authorization request

### State Parameter

Prevents CSRF attacks:
1. Random state generated for each flow
2. State stored in sessionStorage (not accessible to other origins)
3. State validated on callback
4. State expires after 10 minutes

### Secure Storage

- State and code_verifier stored in sessionStorage (browser-only)
- Tokens should be encrypted before storing in database
- Tokens never logged in plain text

## Requirements Validation

This implementation satisfies the following requirements:

**Requirement 2.1**: OAuth 2.0 authorization flow
- ✅ Implements complete OAuth 2.0 Authorization Code Flow
- ✅ Supports multiple providers (OpenAI, Google, etc.)

**Requirement 2.2**: PKCE (S256) and state parameter validation
- ✅ Generates code_verifier (43-128 chars, cryptographically secure)
- ✅ Generates code_challenge using SHA-256 (S256 method)
- ✅ Generates random state parameter
- ✅ Validates state on callback
- ✅ Prevents CSRF attacks

## Next Steps

To complete the Provider Binding module:

1. **~~Implement token encryption~~** (Task 3.2): ✅ COMPLETED
   - ~~Encrypt access_token and refresh_token before storage~~
   - ~~Use application-layer encryption (AES-256-GCM)~~
   - ~~Implement CRUD operations for provider_connections table~~
   - ~~Ensure tokens are never logged in plaintext~~

2. **Implement token lifecycle management** (Task 3.3):
   - Automatic token refresh
   - Token revocation
   - Error handling for expired/invalid tokens

3. **Implement HTTP client with auto-injection** (Task 3.4):
   - Automatically inject Authorization header
   - Handle token refresh on 401 responses
   - Abstract provider differences

4. **Implement provider-specific classes** (Task 3.5):
   - OpenAIProvider
   - GoogleProvider
   - AnthropicProvider

## Token Encryption & Storage (NEW)

### Crypto Module (crypto.ts)

Application-layer encryption for OAuth tokens using AES-256-GCM.

**Functions:**
- `encryptToken(plaintext)`: Encrypt a token using AES-256-GCM
- `decryptToken(encrypted)`: Decrypt a token
- `generateEncryptionKey()`: Generate a random 256-bit key (for .env setup)
- `isValidEncryptionKey(key)`: Validate key format

**Security Features:**
- AES-256-GCM authenticated encryption
- Random IV (Initialization Vector) for each encryption
- Base64 encoding for storage
- 32-byte (256-bit) encryption key from environment variable

**Setup:**
```bash
# Generate encryption key
node -e "console.log(require('./lib/provider-binding/crypto').generateEncryptionKey())"

# Add to .env.local
TOKEN_ENCRYPTION_KEY=<generated-key>
```

**Example:**
```typescript
import { encryptToken, decryptToken } from './crypto';

const plaintext = 'sk-test-1234567890abcdef';
const encrypted = await encryptToken(plaintext);
// => "base64-encoded-iv+ciphertext+authtag"

const decrypted = await decryptToken(encrypted);
// => "sk-test-1234567890abcdef"
```

### Connection Store (connection-store.ts)

CRUD operations for provider_connections table with automatic token encryption.

**Functions:**
- `createConnection(userId, provider, accessToken, expiresIn, options)`: Create new connection
- `getConnection(connectionId)`: Get connection by ID
- `listConnections(userId)`: List all connections for a user
- `updateConnection(connectionId, updates)`: Update connection (for token refresh)
- `deleteConnection(connectionId)`: Delete connection
- `isTokenExpiringSoon(connection)`: Check if token expires in < 2 minutes
- `isTokenExpired(connection)`: Check if token has expired

**Example:**
```typescript
import { createConnection, getConnection, isTokenExpiringSoon } from './connection-store';

// Create connection
const connection = await createConnection(
  'user-id',
  'openai',
  'access-token',
  3600, // expires in 1 hour
  {
    refreshToken: 'refresh-token',
    scopes: ['openid', 'profile'],
    accountId: 'account-123',
  }
);

// Get connection
const conn = await getConnection(connection.id);

// Check if token needs refresh
if (isTokenExpiringSoon(conn)) {
  // Refresh token logic
}
```

### Secure Logging (logger.ts)

Prevents token leakage in logs by automatically redacting sensitive fields.

**Functions:**
- `createLogger(moduleName)`: Create logger with module prefix
- `logDebug(message, data)`: Log debug message (dev only)
- `logInfo(message, data)`: Log info message
- `logWarn(message, data)`: Log warning message
- `logError(message, error, data)`: Log error message

**Redacted Fields:**
- `access_token`, `accessToken`
- `refresh_token`, `refreshToken`
- `access_token_encrypted`, `refresh_token_encrypted`
- `code_verifier`, `codeVerifier`
- `password`, `secret`, `api_key`, `apiKey`

**Example:**
```typescript
import { createLogger } from './logger';

const logger = createLogger('ProviderBinding');

logger.info('Token received', {
  access_token: 'sk-secret-token-1234567890',
  expires_in: 3600,
});
// Logs: {"data":{"access_token":"sk-s...[REDACTED]","expires_in":3600}}

logger.error('Token refresh failed', error, { connectionId: 'abc123' });
// Logs error without exposing tokens
```

## Testing

See `apps/web/tests/provider-binding-*.test.ts` for unit tests and property-based tests.

**Property Tests:**
- Property 3: OAuth PKCE 完整性
- Property 4: Token 安全存储
- Property 5: Token 自动刷新
- Property 6: HTTP 请求自动注入认证
- Property 7: 多 Provider 绑定

## References

- [RFC 6749: OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636: PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 4648: Base64url Encoding](https://datatracker.ietf.org/doc/html/rfc4648#section-5)
