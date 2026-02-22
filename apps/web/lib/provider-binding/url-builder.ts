/**
 * Authorization URL Builder
 * 
 * Utility functions for building OAuth authorization URLs.
 */

/**
 * Build OAuth authorization URL with PKCE parameters
 * 
 * @param config - Authorization URL configuration
 * @returns Complete authorization URL
 */
export interface AuthUrlConfig {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
  codeChallengeMethod?: 'S256' | 'plain';
  additionalParams?: Record<string, string>;
}

export function buildAuthorizationUrl(config: AuthUrlConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state: config.state,
    code_challenge: config.codeChallenge,
    code_challenge_method: config.codeChallengeMethod || 'S256',
  });
  
  // Add any additional provider-specific parameters
  if (config.additionalParams) {
    Object.entries(config.additionalParams).forEach(([key, value]) => {
      params.append(key, value);
    });
  }
  
  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Parse OAuth callback URL parameters
 * 
 * @param url - Callback URL or search params string
 * @returns Parsed parameters
 */
export interface CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export function parseCallbackParams(url: string | URLSearchParams): CallbackParams {
  const params = typeof url === 'string' 
    ? new URLSearchParams(url.split('?')[1]?.split('#')[0] || '')
    : url;
  
  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
    error_description: params.get('error_description') || undefined,
  };
}

/**
 * Validate callback parameters
 * 
 * @param params - Callback parameters
 * @returns Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCallbackParams(params: CallbackParams): ValidationResult {
  // Check for OAuth error
  if (params.error) {
    return {
      valid: false,
      error: params.error_description || params.error,
    };
  }
  
  // Check for required parameters
  if (!params.code) {
    return {
      valid: false,
      error: 'Missing authorization code',
    };
  }
  
  if (!params.state) {
    return {
      valid: false,
      error: 'Missing state parameter',
    };
  }
  
  return { valid: true };
}
