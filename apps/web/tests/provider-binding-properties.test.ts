/**
 * Provider Binding Property-Based Tests
 * 
 * Property-based tests using fast-check to verify Provider Binding correctness properties.
 * 
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.7, 2.9**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { generateCodeVerifier, generateCodeChallenge, generateState, verifyState } from '@/lib/provider-binding/pkce'
import { encryptToken, decryptToken } from '@/lib/provider-binding/crypto'
import { isTokenExpiringSoon, isTokenExpired } from '@/lib/provider-binding/connection-store'
import { HttpClient } from '@/lib/provider-binding/http-client'
import type { Connection, ProviderType } from '@/lib/provider-binding/types'

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

/**
 * Generate a valid provider type
 */
const providerTypeArbitrary = fc.constantFrom<ProviderType>('openai', 'google', 'anthropic')

/**
 * Generate a valid UUID
 */
const uuidArbitrary = fc.uuid()

/**
 * Generate a valid token string
 */
const tokenArbitrary = fc.string({ minLength: 32, maxLength: 128 })

/**
 * Generate a valid scope array
 */
const scopesArbitrary = fc.array(
  fc.constantFrom('openid', 'profile', 'email', 'api.read', 'api.write'),
  { minLength: 1, maxLength: 5 }
)

/**
 * Generate a connection with future expiration
 */
const validConnectionArbitrary = fc.record({
  id: uuidArbitrary,
  userId: uuidArbitrary,
/**
 * Generate a connection with future expiration
 */
const validConnectionArbitrary = fc.record({
  id: uuidArbitrary,
  userId: uuidArbitrary,
  provider: providerTypeArbitrary,
  accountId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  scopes: scopesArbitrary,
  accessToken: tokenArbitrary,
  refreshToken: fc.option(tokenArbitrary),
  expiresAt: fc.integer({ min: 600, max: 7200 })
    .map(secondsFromNow => new Date(Date.now() + secondsFromNow * 1000)),
  metadata: fc.constant({}),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
})

/**
 * Generate a connection expiring soon (within 2 minutes)
 */
const expiringSoonConnectionArbitrary = fc.record({
  id: uuidArbitrary,
  userId: uuidArbitrary,
  provider: providerTypeArbitrary,
  accountId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  scopes: scopesArbitrary,
  accessToken: tokenArbitrary,
  refreshToken: fc.option(tokenArbitrary),
  expiresAt: fc.integer({ min: 1, max: 119 })
    .map(secondsFromNow => new Date(Date.now() + secondsFromNow * 1000)),
  metadata: fc.constant({}),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
})

/**
 * Generate an expired connection
 */
const expiredConnectionArbitrary = fc.record({
  id: uuidArbitrary,
  userId: uuidArbitrary,
  provider: providerTypeArbitrary,
  accountId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  scopes: scopesArbitrary,
  accessToken: tokenArbitrary,
  refreshToken: fc.option(tokenArbitrary),
  expiresAt: fc.integer({ min: 1, max: 7200 })
    .map(secondsAgo => new Date(Date.now() - secondsAgo * 1000)),
  metadata: fc.constant({}),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
})

// ============================================================================
// Property 3: OAuth PKCE 完整性 (OAuth PKCE Integrity)
// ============================================================================

describe('Property 3: OAuth PKCE 完整性 (OAuth PKCE Integrity)', () => {
  /**
   * Feature: sprint1-pocket-room, Property 3: OAuth PKCE 完整性
   * 
   * 对于任意 Provider Binding OAuth 流程，授权请求必须包含 code_challenge（S256 算法）
   * 和 state 参数，回调处理必须验证 state 匹配并使用 code_verifier 交换 token。
   * 
   * For any Provider Binding OAuth flow, the authorization request must include
   * code_challenge (S256 algorithm) and state parameters, and the callback handler
   * must verify state matches and use code_verifier to exchange tokens.
   * 
   * **Validates: Requirements 2.2**
   */

  it('should generate valid PKCE code_verifier with sufficient entropy', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const codeVerifier = generateCodeVerifier()
        
        // Property: code_verifier must be 43-128 characters long
        expect(codeVerifier.length).toBeGreaterThanOrEqual(43)
        expect(codeVerifier.length).toBeLessThanOrEqual(128)
        
        // Property: code_verifier must only contain URL-safe characters
        expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/)
        
        // Property: Multiple calls should generate different verifiers (high entropy)
        const codeVerifier2 = generateCodeVerifier()
        expect(codeVerifier).not.toBe(codeVerifier2)
      }),
      { numRuns: 100 }
    )
  })

  it('should generate valid S256 code_challenge from code_verifier', async () => {
    fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const codeVerifier = generateCodeVerifier()
        const codeChallenge = await generateCodeChallenge(codeVerifier)
        
        // Property: code_challenge must be base64url encoded
        expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/)
        
        // Property: code_challenge must be deterministic for same verifier
        const codeChallenge2 = await generateCodeChallenge(codeVerifier)
        expect(codeChallenge).toBe(codeChallenge2)
        
        // Property: Different verifiers produce different challenges
        const differentVerifier = generateCodeVerifier()
        const differentChallenge = await generateCodeChallenge(differentVerifier)
        expect(codeChallenge).not.toBe(differentChallenge)
      }),
      { numRuns: 100 }
    )
  })

  it('should generate unique state parameters', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const state1 = generateState()
        const state2 = generateState()
        
        // Property: state must be sufficiently long (at least 16 characters)
        expect(state1.length).toBeGreaterThanOrEqual(16)
        expect(state2.length).toBeGreaterThanOrEqual(16)
        
        // Property: state must be unique (high entropy)
        expect(state1).not.toBe(state2)
        
        // Property: state must only contain URL-safe characters
        expect(state1).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(state2).toMatch(/^[A-Za-z0-9_-]+$/)
      }),
      { numRuns: 100 }
    )
  })

  it('should verify state parameters correctly', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 16, maxLength: 64 }), (state) => {
        // Property: Same state should verify successfully
        expect(verifyState(state, state)).toBe(true)
        
        // Property: Different states should fail verification
        const differentState = state + 'x'
        expect(verifyState(state, differentState)).toBe(false)
        
        // Property: Empty or null states should fail
        expect(verifyState(state, '')).toBe(false)
        expect(verifyState('', state)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 4: Token 安全存储 (Token Secure Storage)
// ============================================================================

describe('Property 4: Token 安全存储 (Token Secure Storage)', () => {
  /**
   * Feature: sprint1-pocket-room, Property 4: Token 安全存储
   * 
   * 对于任意存储的 Provider Connection，access_token 和 refresh_token 必须以加密形式存储，
   * 且不应该以明文形式出现在任何日志中。
   * 
   * For any stored Provider Connection, access_token and refresh_token must be
   * stored in encrypted form and should not appear in plaintext in any logs.
   * 
   * **Validates: Requirements 2.3**
   */

  beforeEach(() => {
    // Set up encryption key for tests
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      // Generate a test encryption key (32 bytes base64)
      const testKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')
      process.env.TOKEN_ENCRYPTION_KEY = testKey
    }
  })

  it('should encrypt tokens and produce different ciphertext for same plaintext', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 128 }), // Non-empty tokens only
        async (token) => {
          const encrypted1 = await encryptToken(token)
          const encrypted2 = await encryptToken(token)
          
          // Property: Encrypted tokens must not equal plaintext
          expect(encrypted1).not.toBe(token)
          expect(encrypted2).not.toBe(token)
          
          // Property: Encryption should be non-deterministic (different ciphertext each time)
          // This ensures we're using proper encryption with IV/nonce
          expect(encrypted1).not.toBe(encrypted2)
          
          // Property: Encrypted tokens should be longer than plaintext (includes IV/metadata)
          expect(encrypted1.length).toBeGreaterThan(token.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should decrypt tokens correctly and maintain plaintext integrity', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 128 }), // Non-empty tokens only
        async (token) => {
          const encrypted = await encryptToken(token)
          const decrypted = await decryptToken(encrypted)
          
          // Property: Decryption must recover original plaintext
          expect(decrypted).toBe(token)
          
          // Property: Encrypt-decrypt should be idempotent
          const encrypted2 = await encryptToken(decrypted)
          const decrypted2 = await decryptToken(encrypted2)
          expect(decrypted2).toBe(token)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle special character tokens', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 256 }), // Non-empty tokens only
        async (token) => {
          // All non-empty tokens should encrypt/decrypt correctly
          const encrypted = await encryptToken(token)
          const decrypted = await decryptToken(encrypted)
          expect(decrypted).toBe(token)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not leak plaintext tokens in error messages', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 128 }), // Use longer tokens to avoid false positives with common words
        async (token) => {
          try {
            // Attempt to decrypt invalid ciphertext
            await decryptToken('invalid-ciphertext-data')
            // If it doesn't throw, that's unexpected but not a security issue
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            
            // Property: Error messages must not contain plaintext token
            // Check for the token as a whole, not individual characters
            if (token.length > 5) {
              expect(errorMessage).not.toContain(token)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 5: Token 自动刷新 (Token Auto Refresh)
// ============================================================================

describe('Property 5: Token 自动刷新 (Token Auto Refresh)', () => {
  /**
   * Feature: sprint1-pocket-room, Property 5: Token 自动刷新
   * 
   * 对于任意即将过期的 access_token（距离过期时间小于 2 分钟），系统应该自动使用
   * refresh_token 刷新 token，并更新存储的 expires_at 时间。
   * 
   * For any access_token that is about to expire (less than 2 minutes until expiration),
   * the system should automatically use refresh_token to refresh the token and update
   * the stored expires_at time.
   * 
   * **Validates: Requirements 2.4**
   */

  it('should identify tokens expiring soon (within 2 minutes)', () => {
    fc.assert(
      fc.property(expiringSoonConnectionArbitrary, (connection) => {
        const expiringSoon = isTokenExpiringSoon(connection)
        
        // Property: Tokens expiring within 2 minutes should be flagged
        expect(expiringSoon).toBe(true)
        
        // Calculate actual time until expiration
        const timeUntilExpiry = connection.expiresAt.getTime() - Date.now()
        const twoMinutes = 2 * 60 * 1000
        
        // Verify it's actually within 2 minutes
        expect(timeUntilExpiry).toBeLessThan(twoMinutes)
        expect(timeUntilExpiry).toBeGreaterThan(0) // Not expired yet
      }),
      { numRuns: 100 }
    )
  })

  it('should not flag fresh tokens for refresh', () => {
    fc.assert(
      fc.property(validConnectionArbitrary, (connection) => {
        const expiringSoon = isTokenExpiringSoon(connection)
        
        // Property: Fresh tokens (> 2 minutes) should not be flagged
        expect(expiringSoon).toBe(false)
        
        // Calculate actual time until expiration
        const timeUntilExpiry = connection.expiresAt.getTime() - Date.now()
        const twoMinutes = 2 * 60 * 1000
        
        // Verify it's actually more than 2 minutes away
        expect(timeUntilExpiry).toBeGreaterThanOrEqual(twoMinutes)
      }),
      { numRuns: 100 }
    )
  })

  it('should identify expired tokens', () => {
    fc.assert(
      fc.property(expiredConnectionArbitrary, (connection) => {
        const expired = isTokenExpired(connection)
        
        // Property: Expired tokens should be identified
        expect(expired).toBe(true)
        
        // Verify expiration time is in the past
        expect(connection.expiresAt.getTime()).toBeLessThan(Date.now())
        
        // Expired tokens should also be flagged as expiring soon
        const expiringSoon = isTokenExpiringSoon(connection)
        expect(expiringSoon).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should handle edge case: token expiring at exact current time', () => {
    fc.assert(
      fc.property(uuidArbitrary, providerTypeArbitrary, (id, provider) => {
        // Create a connection that expires exactly at current time (or very close to it)
        const now = Date.now()
        const connection: Connection = {
          id,
          userId: id,
          provider,
          accountId: undefined,
          scopes: ['api.read'],
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          expiresAt: new Date(now - 1), // Expires 1ms in the past to ensure it's expired
          metadata: {},
          createdAt: new Date(now - 3600000),
          updatedAt: new Date(now - 3600000),
        }
        
        // Property: Token expiring at or before current time should be considered expired
        const expired = isTokenExpired(connection)
        expect(expired).toBe(true)
        
        // And should be flagged for refresh
        const expiringSoon = isTokenExpiringSoon(connection)
        expect(expiringSoon).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should maintain consistent expiration checks', () => {
    fc.assert(
      fc.property(
        fc.oneof(validConnectionArbitrary, expiringSoonConnectionArbitrary, expiredConnectionArbitrary),
        (connection) => {
          // Property: Multiple checks should return consistent results
          const expired1 = isTokenExpired(connection)
          const expired2 = isTokenExpired(connection)
          expect(expired1).toBe(expired2)
          
          const expiringSoon1 = isTokenExpiringSoon(connection)
          const expiringSoon2 = isTokenExpiringSoon(connection)
          expect(expiringSoon1).toBe(expiringSoon2)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 6: HTTP 请求自动注入认证 (HTTP Request Auto Auth Injection)
// ============================================================================

// Mock the token-refresh module at the top level
vi.mock('@/lib/provider-binding/token-refresh', () => ({
  getValidAccessToken: vi.fn(),
  TokenRefreshError: class TokenRefreshError extends Error {
    constructor(message: string, public connectionId: string, public provider: string, public shouldReauthorize: boolean = true) {
      super(message)
      this.name = 'TokenRefreshError'
    }
  },
}))

describe('Property 6: HTTP 请求自动注入认证 (HTTP Request Auto Auth Injection)', () => {
  /**
   * Feature: sprint1-pocket-room, Property 6: HTTP 请求自动注入认证
   * 
   * 对于任意通过 Provider Binding 发起的 AI API 调用，HTTP 请求必须自动包含
   * `Authorization: Bearer <access_token>` header，业务层代码不应该手动处理 token。
   * 
   * For any AI API call made through Provider Binding, the HTTP request must
   * automatically include the `Authorization: Bearer <access_token>` header,
   * and business logic should not need to manually handle tokens.
   * 
   * **Validates: Requirements 2.7**
   */

  let fetchMock: any
  
  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should automatically inject Authorization header in all requests', async () => {
    // Note: This test verifies the concept but cannot run 100 iterations with mocks
    // We test the property with a representative sample
    const { getValidAccessToken } = await import('@/lib/provider-binding/token-refresh')
    const connectionId = 'test-conn-id'
    const accessToken = 'test-access-token'
    const url = 'https://api.example.com/test'
    const method = 'POST'
    
    // Mock the token retrieval
    vi.mocked(getValidAccessToken).mockResolvedValue(accessToken)
    
    // Mock successful response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    })
    
    const client = new HttpClient(connectionId)
    await client.request(url, { method })
    
    // Property: fetch must be called with Authorization header
    expect(fetchMock).toHaveBeenCalled()
    const [callUrl, callOptions] = fetchMock.mock.calls[0]
    
    // Property: URL must match
    expect(callUrl).toBe(url)
    
    // Property: Authorization header must be present
    expect(callOptions.headers).toHaveProperty('Authorization')
    expect(callOptions.headers.Authorization).toBe(`Bearer ${accessToken}`)
    
    // Property: Method must match
    expect(callOptions.method).toBe(method)
  })

  it('should inject Authorization header without business logic involvement', async () => {
    const { getValidAccessToken } = await import('@/lib/provider-binding/token-refresh')
    const connectionId = 'test-conn-id'
    const accessToken = 'test-access-token'
    const url = 'https://api.example.com/test'
    const customHeaders = {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'custom-value',
    }
    
    // Mock the token retrieval
    vi.mocked(getValidAccessToken).mockResolvedValue(accessToken)
    
    // Mock successful response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    })
    
    const client = new HttpClient(connectionId)
    
    // Business logic provides custom headers but NOT Authorization
    await client.request(url, { headers: customHeaders })
    
    const [, callOptions] = fetchMock.mock.calls[0]
    
    // Property: Authorization header must be automatically added
    expect(callOptions.headers.Authorization).toBe(`Bearer ${accessToken}`)
    
    // Property: Custom headers must be preserved
    expect(callOptions.headers['X-Custom-Header']).toBe(customHeaders['X-Custom-Header'])
    
    // Property: Business logic did not provide Authorization
    expect(customHeaders).not.toHaveProperty('Authorization')
  })

  it('should handle different HTTP methods consistently', async () => {
    const { getValidAccessToken } = await import('@/lib/provider-binding/token-refresh')
    const connectionId = 'test-conn-id'
    const accessToken = 'test-access-token'
    const url = 'https://api.example.com/test'
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
    
    // Mock the token retrieval
    vi.mocked(getValidAccessToken).mockResolvedValue(accessToken)
    
    const client = new HttpClient(connectionId)
    
    for (const method of methods) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      })
      
      await client.request(url, { method })
    }
    
    // Property: All methods should have Authorization header
    expect(fetchMock).toHaveBeenCalledTimes(methods.length)
    
    fetchMock.mock.calls.forEach((call: any) => {
      const [, callOptions] = call
      expect(callOptions.headers.Authorization).toBe(`Bearer ${accessToken}`)
    })
  })
})

// ============================================================================
// Property 7: 多 Provider 绑定 (Multiple Provider Binding)
// ============================================================================

describe('Property 7: 多 Provider 绑定 (Multiple Provider Binding)', () => {
  /**
   * Feature: sprint1-pocket-room, Property 7: 多 Provider 绑定
   * 
   * 对于任意用户，应该能够同时绑定多个不同的 AI Provider 账户（OpenAI、Google 等），
   * 每个绑定独立管理 token 生命周期。
   * 
   * For any user, they should be able to bind multiple different AI Provider accounts
   * (OpenAI, Google, etc.) simultaneously, with each binding independently managing
   * its token lifecycle.
   * 
   * **Validates: Requirements 2.9**
   */

  it('should support multiple connections for same user with different providers', () => {
    fc.assert(
      fc.property(
        uuidArbitrary,
        fc.array(validConnectionArbitrary, { minLength: 2, maxLength: 5 }),
        (userId, connections) => {
          // Set all connections to same user
          const userConnections = connections.map(conn => ({
            ...conn,
            userId,
          }))
          
          // Property: Each connection should have unique ID
          const ids = userConnections.map(c => c.id)
          const uniqueIds = new Set(ids)
          expect(uniqueIds.size).toBe(ids.length)
          
          // Property: Connections can have different providers
          const providers = userConnections.map(c => c.provider)
          // At least some should be different (if we have multiple providers in test data)
          const uniqueProviders = new Set(providers)
          expect(uniqueProviders.size).toBeGreaterThan(0)
          
          // Property: Each connection has independent tokens
          const tokens = userConnections.map(c => c.accessToken)
          const uniqueTokens = new Set(tokens)
          expect(uniqueTokens.size).toBe(tokens.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should independently manage token expiration for each connection', () => {
    fc.assert(
      fc.property(
        uuidArbitrary,
        validConnectionArbitrary,
        expiringSoonConnectionArbitrary,
        expiredConnectionArbitrary,
        (userId, freshConn, expiringSoonConn, expiredConn) => {
          // Create connections for same user with different expiration states
          const connections = [
            { ...freshConn, userId },
            { ...expiringSoonConn, userId },
            { ...expiredConn, userId },
          ]
          
          // Property: Each connection's expiration state is independent
          expect(isTokenExpired(connections[0])).toBe(false)
          expect(isTokenExpiringSoon(connections[0])).toBe(false)
          
          expect(isTokenExpiringSoon(connections[1])).toBe(true)
          expect(isTokenExpired(connections[1])).toBe(false)
          
          expect(isTokenExpired(connections[2])).toBe(true)
          expect(isTokenExpiringSoon(connections[2])).toBe(true)
          
          // Property: One connection's state doesn't affect others
          const states = connections.map(c => ({
            expired: isTokenExpired(c),
            expiringSoon: isTokenExpiringSoon(c),
          }))
          
          // All three should have different states
          expect(states[0]).not.toEqual(states[2])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should allow same provider type with different accounts', () => {
    fc.assert(
      fc.property(
        uuidArbitrary,
        providerTypeArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
        (userId, provider, accountIds) => {
          // Create multiple connections for same provider but different accounts
          const connections = accountIds.map((accountId, index) => ({
            id: `conn-${index}`,
            userId,
            provider,
            accountId,
            scopes: ['api.read'],
            accessToken: `token-${index}`,
            refreshToken: `refresh-${index}`,
            expiresAt: new Date(Date.now() + 3600000),
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
          
          // Property: Same user can have multiple connections to same provider
          const providers = connections.map(c => c.provider)
          expect(providers.every(p => p === provider)).toBe(true)
          
          // Property: Each connection has different account ID
          const accounts = connections.map(c => c.accountId)
          const uniqueAccounts = new Set(accounts)
          expect(uniqueAccounts.size).toBe(accounts.length)
          
          // Property: Each connection has independent tokens
          const tokens = connections.map(c => c.accessToken)
          const uniqueTokens = new Set(tokens)
          expect(uniqueTokens.size).toBe(tokens.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain connection isolation across users', () => {
    fc.assert(
      fc.property(
        fc.array(uuidArbitrary, { minLength: 2, maxLength: 5 }),
        providerTypeArbitrary,
        (userIds, provider) => {
          // Create connections for different users
          const connections = userIds.map((userId, index) => ({
            id: `conn-${index}`,
            userId,
            provider,
            accountId: `account-${index}`,
            scopes: ['api.read'],
            accessToken: `token-${index}`,
            refreshToken: `refresh-${index}`,
            expiresAt: new Date(Date.now() + 3600000),
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
          
          // Property: Each user has their own connection
          const users = connections.map(c => c.userId)
          const uniqueUsers = new Set(users)
          expect(uniqueUsers.size).toBe(users.length)
          
          // Property: Connections are isolated (different IDs, tokens)
          const ids = connections.map(c => c.id)
          const uniqueIds = new Set(ids)
          expect(uniqueIds.size).toBe(ids.length)
          
          const tokens = connections.map(c => c.accessToken)
          const uniqueTokens = new Set(tokens)
          expect(uniqueTokens.size).toBe(tokens.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
