/**
 * PKCE (Proof Key for Code Exchange) Implementation
 * 
 * Implements RFC 7636 with S256 code challenge method.
 * Used to prevent authorization code interception attacks.
 */

/**
 * Generate a cryptographically secure random string for code_verifier
 * 
 * Requirements:
 * - Length: 43-128 characters
 * - Characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * 
 * @returns code_verifier string (64 characters)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to base64url encoding (RFC 4648)
  return base64UrlEncode(array);
}

/**
 * Generate code_challenge from code_verifier using S256 method
 * 
 * S256: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
 * 
 * @param codeVerifier - The code verifier string
 * @returns code_challenge string
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  // SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Base64URL encode
  return base64UrlEncode(hashArray);
}

/**
 * Generate a cryptographically secure random state parameter
 * 
 * Used for CSRF protection in OAuth flow.
 * 
 * @returns state string (32 characters)
 */
export function generateState(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64URL encode (RFC 4648 Section 5)
 * 
 * Converts Uint8Array to base64url string:
 * - Replace + with -
 * - Replace / with _
 * - Remove padding =
 * 
 * @param buffer - Uint8Array to encode
 * @returns base64url encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert to base64 using Array.from to avoid spread operator issues
  const base64 = btoa(String.fromCharCode(...Array.from(buffer)));
  
  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate code_verifier format
 * 
 * @param codeVerifier - The code verifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  // Length: 43-128 characters
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }
  
  // Characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(codeVerifier);
}

/**
 * Validate state parameter format
 * 
 * @param state - The state parameter to validate
 * @returns true if valid, false otherwise
 */
export function isValidState(state: string): boolean {
  // Should be a non-empty string
  if (!state || state.length === 0) {
    return false;
  }
  
  // Should only contain base64url characters
  const validPattern = /^[A-Za-z0-9\-_]+$/;
  return validPattern.test(state);
}

/**
 * Verify that two state parameters match
 * 
 * Used to verify OAuth callback state matches the original state.
 * Provides CSRF protection.
 * 
 * @param expectedState - The state parameter from stored OAuth state
 * @param receivedState - The state parameter from OAuth callback
 * @returns true if states match, false otherwise
 */
export function verifyState(expectedState: string, receivedState: string): boolean {
  // Both must be non-empty
  if (!expectedState || !receivedState) {
    return false;
  }
  
  // Must match exactly (constant-time comparison would be ideal but not critical for state)
  return expectedState === receivedState;
}
