/**
 * Token Storage Tests
 * 
 * Unit tests and property-based tests for token encryption and storage.
 * 
 * Tests:
 * - Token encryption/decryption
 * - Connection CRUD operations
 * - Logging sanitization
 * - Property 4: Token 安全存储
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  isValidEncryptionKey,
} from '@/lib/provider-binding/crypto';
import {
  createLogger,
  LogLevel,
} from '@/lib/provider-binding/logger';

// ============================================================================
// SETUP
// ============================================================================

// Mock environment variable for encryption key
const TEST_ENCRYPTION_KEY = generateEncryptionKey();

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

// ============================================================================
// UNIT TESTS - Token Encryption
// ============================================================================

describe('Token Encryption', () => {
  it('should encrypt and decrypt a token correctly', async () => {
    const plaintext = 'sk-test-1234567890abcdef';
    
    const encrypted = await encryptToken(plaintext);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);
    
    const decrypted = await decryptToken(encrypted);
    expect(decrypted).toBe(plaintext);
  });
  
  it('should produce different ciphertexts for the same plaintext', async () => {
    const plaintext = 'sk-test-1234567890abcdef';
    
    const encrypted1 = await encryptToken(plaintext);
    const encrypted2 = await encryptToken(plaintext);
    
    // Different IVs should produce different ciphertexts
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both should decrypt to the same plaintext
    expect(await decryptToken(encrypted1)).toBe(plaintext);
    expect(await decryptToken(encrypted2)).toBe(plaintext);
  });
  
  it('should throw error when encrypting empty token', async () => {
    await expect(encryptToken('')).rejects.toThrow('Cannot encrypt empty token');
  });
  
  it('should throw error when decrypting empty token', async () => {
    await expect(decryptToken('')).rejects.toThrow('Cannot decrypt empty token');
  });
  
  it('should throw error when decrypting invalid ciphertext', async () => {
    await expect(decryptToken('invalid-base64')).rejects.toThrow('Failed to decrypt token');
  });
  
  it('should throw error when encryption key is not set', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    
    await expect(encryptToken('test')).rejects.toThrow('TOKEN_ENCRYPTION_KEY environment variable is not set');
  });
  
  it('should throw error when encryption key is wrong length', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from('short').toString('base64');
    
    await expect(encryptToken('test')).rejects.toThrow('TOKEN_ENCRYPTION_KEY must be 32 bytes');
  });
});

describe('Encryption Key Generation', () => {
  it('should generate a valid encryption key', () => {
    const key = generateEncryptionKey();
    
    expect(key).toBeTruthy();
    expect(isValidEncryptionKey(key)).toBe(true);
  });
  
  it('should generate different keys each time', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    
    expect(key1).not.toBe(key2);
  });
  
  it('should validate correct key format', () => {
    const validKey = generateEncryptionKey();
    expect(isValidEncryptionKey(validKey)).toBe(true);
  });
  
  it('should reject invalid key formats', () => {
    expect(isValidEncryptionKey('short')).toBe(false);
    expect(isValidEncryptionKey('not-base64!!!')).toBe(false);
    expect(isValidEncryptionKey('')).toBe(false);
  });
});

// ============================================================================
// UNIT TESTS - Logging Sanitization
// ============================================================================

describe('Secure Logging', () => {
  it('should redact access tokens in logs', () => {
    const logger = createLogger('Test');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('Token received', {
      access_token: 'sk-secret-token-1234567890',
      expires_in: 3600,
    });
    
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.data.access_token).toMatch(/^sk-s\.\.\.\[REDACTED\]$/);
    expect(loggedData.data.expires_in).toBe(3600);
    
    consoleSpy.mockRestore();
  });
  
  it('should redact refresh tokens in logs', () => {
    const logger = createLogger('Test');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('Token refreshed', {
      refreshToken: 'rt-secret-refresh-token',
    });
    
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.data.refreshToken).toMatch(/^rt-s\.\.\.\[REDACTED\]$/);
    
    consoleSpy.mockRestore();
  });
  
  it('should redact encrypted tokens in logs', () => {
    const logger = createLogger('Test');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('Storing connection', {
      access_token_encrypted: 'base64-encrypted-data',
      refresh_token_encrypted: 'base64-encrypted-data',
    });
    
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.data.access_token_encrypted).toMatch(/\[REDACTED\]$/);
    expect(loggedData.data.refresh_token_encrypted).toMatch(/\[REDACTED\]$/);
    
    consoleSpy.mockRestore();
  });
  
  it('should redact code_verifier in logs', () => {
    const logger = createLogger('Test');
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    
    logger.debug('PKCE parameters', {
      code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    });
    
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.data.code_verifier).toMatch(/\[REDACTED\]$/);
    expect(loggedData.data.code_challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    
    consoleSpy.mockRestore();
  });
  
  it('should handle nested objects', () => {
    const logger = createLogger('Test');
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('OAuth response', {
      provider: 'openai',
      tokens: {
        access_token: 'secret-token-123',
        refresh_token: 'secret-refresh-456',
      },
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    });
    
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(loggedData.data.provider).toBe('openai');
    
    // Check if tokens object exists and fields are redacted
    expect(loggedData.data.tokens).toBeDefined();
    expect(loggedData.data.tokens.access_token).toBeDefined();
    expect(loggedData.data.tokens.access_token).toMatch(/\[REDACTED\]$/);
    expect(loggedData.data.tokens.refresh_token).toMatch(/\[REDACTED\]$/);
    expect(loggedData.data.user.id).toBe('user123');
    expect(loggedData.data.user.email).toBe('test@example.com');
    
    consoleSpy.mockRestore();
  });
});

// ============================================================================
// PROPERTY-BASED TESTS
// ============================================================================

describe('Property Tests - Token Encryption', () => {
  // Feature: sprint1-pocket-room, Property 4: Token 安全存储
  // 对于任意存储的 Provider Connection，access_token 和 refresh_token 必须以加密形式存储，
  // 且不应该以明文形式出现在任何日志中。
  
  it('Property 4.1: Encryption is reversible for any token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (token) => {
          const encrypted = await encryptToken(token);
          const decrypted = await decryptToken(encrypted);
          
          // Decryption should recover original token
          expect(decrypted).toBe(token);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 4.2: Encrypted tokens are never equal to plaintext', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (token) => {
          const encrypted = await encryptToken(token);
          
          // Encrypted token should never equal plaintext
          expect(encrypted).not.toBe(token);
          
          // Encrypted token is base64, so it might accidentally contain the plaintext
          // But the full encrypted string should be longer due to IV + auth tag
          expect(encrypted.length).toBeGreaterThan(token.length);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 4.3: Same plaintext produces different ciphertexts (random IV)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (token) => {
          const encrypted1 = await encryptToken(token);
          const encrypted2 = await encryptToken(token);
          
          // Different IVs should produce different ciphertexts
          expect(encrypted1).not.toBe(encrypted2);
          
          // But both should decrypt to same plaintext
          expect(await decryptToken(encrypted1)).toBe(token);
          expect(await decryptToken(encrypted2)).toBe(token);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 4.4: Tokens are redacted in logs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0), // Non-whitespace strings
        fc.constantFrom('access_token', 'refresh_token', 'accessToken', 'refreshToken'),
        (tokenValue, fieldName) => {
          const logger = createLogger('Test');
          const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
          
          const logData: any = {};
          logData[fieldName] = tokenValue;
          
          logger.info('Test log', logData);
          
          // Check that console.info was called
          if (consoleSpy.mock.calls.length === 0) {
            consoleSpy.mockRestore();
            throw new Error('Logger did not call console.info');
          }
          
          const loggedData = JSON.parse(consoleSpy.mock.calls[0][0]);
          const loggedValue = loggedData.data[fieldName];
          
          // Token should be redacted
          expect(loggedValue).toMatch(/\[REDACTED\]$/);
          
          // Token should not appear in plaintext
          expect(loggedValue).not.toBe(tokenValue);
          
          consoleSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle very long tokens', async () => {
    const longToken = 'a'.repeat(10000);
    
    const encrypted = await encryptToken(longToken);
    const decrypted = await decryptToken(encrypted);
    
    expect(decrypted).toBe(longToken);
  });
  
  it('should handle tokens with special characters', async () => {
    const specialToken = 'token-with-special-chars: !@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    
    const encrypted = await encryptToken(specialToken);
    const decrypted = await decryptToken(encrypted);
    
    expect(decrypted).toBe(specialToken);
  });
  
  it('should handle tokens with unicode characters', async () => {
    const unicodeToken = 'token-with-unicode: 你好世界 🚀 émojis';
    
    const encrypted = await encryptToken(unicodeToken);
    const decrypted = await decryptToken(encrypted);
    
    expect(decrypted).toBe(unicodeToken);
  });
  
  it('should handle base64-encoded tokens', async () => {
    const base64Token = Buffer.from('test-token').toString('base64');
    
    const encrypted = await encryptToken(base64Token);
    const decrypted = await decryptToken(encrypted);
    
    expect(decrypted).toBe(base64Token);
  });
});
