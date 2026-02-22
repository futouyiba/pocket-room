/**
 * Provider Binding Types
 * 
 * Type definitions for OAuth 2.0 + PKCE provider binding system.
 * This is separate from Gate Auth (user authentication).
 */

/**
 * Supported AI service providers
 */
export type ProviderType = 'openai' | 'google' | 'anthropic';

/**
 * OAuth connection record
 */
export interface Connection {
  id: string;
  userId: string;
  provider: ProviderType;
  accountId?: string;
  scopes: string[];
  accessToken: string; // Encrypted
  refreshToken?: string; // Encrypted
  expiresAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth state stored during authorization flow
 */
export interface OAuthState {
  state: string;
  codeVerifier: string;
  provider: ProviderType;
  redirectUri: string;
  createdAt: number;
}

/**
 * OAuth token response from provider
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  redirectUri: string;
}
