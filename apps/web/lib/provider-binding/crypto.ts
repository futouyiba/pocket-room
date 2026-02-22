/**
 * Token Encryption/Decryption Utilities
 * 
 * Application-layer encryption for OAuth tokens using AES-256-GCM.
 * Tokens are encrypted before storage and decrypted when needed.
 * 
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Random IV (Initialization Vector) for each encryption
 * - Base64 encoding for storage
 * - No plaintext tokens in logs
 */

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) encoded in base64
 */
function getEncryptionKey(): CryptoKey {
  const keyBase64 = process.env.TOKEN_ENCRYPTION_KEY;
  
  if (!keyBase64) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  
  // Decode base64 key
  const keyBuffer = Buffer.from(keyBase64, 'base64');
  
  if (keyBuffer.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (256 bits)');
  }
  
  // Import key for Web Crypto API
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a token using AES-256-GCM
 * 
 * @param plaintext - The token to encrypt
 * @returns Base64-encoded encrypted token with IV prepended
 * 
 * Format: base64(iv + ciphertext + authTag)
 * - IV: 12 bytes (96 bits)
 * - Ciphertext: variable length
 * - Auth Tag: 16 bytes (128 bits)
 */
export async function encryptToken(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty token');
  }
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Get encryption key
  const key = await getEncryptionKey();
  
  // Encrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 16 bytes auth tag
    },
    key,
    data
  );
  
  // Combine IV + ciphertext (includes auth tag)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Encode to base64 for storage
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt a token using AES-256-GCM
 * 
 * @param encrypted - Base64-encoded encrypted token
 * @returns Decrypted plaintext token
 */
export async function decryptToken(encrypted: string): Promise<string> {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty token');
  }
  
  try {
    // Decode from base64
    const combined = Buffer.from(encrypted, 'base64');
    
    // Extract IV (first 12 bytes)
    const iv = combined.slice(0, 12);
    
    // Extract ciphertext + auth tag (remaining bytes)
    const ciphertext = combined.slice(12);
    
    // Get encryption key
    const key = await getEncryptionKey();
    
    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );
    
    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    // Don't leak encrypted token in error message
    throw new Error('Failed to decrypt token: invalid key or corrupted data');
  }
}

/**
 * Generate a random encryption key (32 bytes, base64-encoded)
 * Use this to generate TOKEN_ENCRYPTION_KEY for .env
 * 
 * @returns Base64-encoded 256-bit key
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(key).toString('base64');
}

/**
 * Validate that an encryption key is properly formatted
 * 
 * @param keyBase64 - Base64-encoded key to validate
 * @returns true if valid, false otherwise
 */
export function isValidEncryptionKey(keyBase64: string): boolean {
  try {
    const keyBuffer = Buffer.from(keyBase64, 'base64');
    return keyBuffer.length === 32;
  } catch {
    return false;
  }
}
