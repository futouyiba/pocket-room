/**
 * AuthProvider Interface and Base Implementation
 * 
 * Defines the contract for OAuth 2.0 + PKCE provider implementations.
 * Each AI service provider (OpenAI, Google, etc.) implements this interface.
 */

import { Connection, ProviderConfig, TokenResponse, ProviderType } from './types';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';
import { storeOAuthState } from './state-manager';

/**
 * AuthProvider interface
 * 
 * All provider implementations must implement this interface.
 */
export interface AuthProvider {
  /**
   * Get provider type
   */
  getProviderType(): ProviderType;
  
  /**
   * Start OAuth authorization flow
   * 
   * Generates PKCE parameters, stores state, and returns authorization URL.
   * 
   * @returns Authorization URL and state parameter
   */
  startLogin(): Promise<{ authUrl: string; state: string }>;
  
  /**
   * Handle OAuth callback
   * 
   * Validates state, exchanges authorization code for tokens using code_verifier.
   * 
   * @param code - Authorization code from callback
   * @param state - State parameter from callback
   * @param codeVerifier - Code verifier from stored state
   * @returns Connection object with tokens
   */
  handleCallback(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<Omit<Connection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
  
  /**
   * Refresh access token
   * 
   * @param connection - Existing connection with refresh token
   * @returns Updated connection with new tokens
   */
  refresh(connection: Connection): Promise<Connection>;
  
  /**
   * Revoke connection
   * 
   * @param connection - Connection to revoke
   */
  revoke(connection: Connection): Promise<void>;
}

/**
 * Base AuthProvider implementation
 * 
 * Provides common OAuth 2.0 + PKCE logic.
 * Provider-specific implementations extend this class.
 */
export abstract class BaseAuthProvider implements AuthProvider {
  protected config: ProviderConfig;
  
  constructor(config: ProviderConfig) {
    this.config = config;
  }
  
  abstract getProviderType(): ProviderType;
  
  /**
   * Build authorization URL with PKCE parameters
   */
  async startLogin(): Promise<{ authUrl: string; state: string }> {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    
    // Store state and code_verifier for callback
    storeOAuthState({
      state,
      codeVerifier,
      provider: this.getProviderType(),
      redirectUri: this.config.redirectUri,
      createdAt: Date.now(),
    });
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    
    const authUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;
    
    return { authUrl, state };
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<Omit<Connection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code, codeVerifier);
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    
    // Build connection object (without encryption for now)
    return {
      provider: this.getProviderType(),
      accountId: undefined, // Will be set by provider-specific implementation
      scopes: tokenResponse.scope?.split(' ') || this.config.scopes,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      metadata: {},
    };
  }
  
  /**
   * Exchange authorization code for tokens
   * 
   * @param code - Authorization code
   * @param codeVerifier - PKCE code verifier
   * @returns Token response
   */
  protected async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier,
    });
    
    // Add client_secret if available (some providers require it)
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }
    
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    return response.json();
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refresh(connection: Connection): Promise<Connection> {
    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
      client_id: this.config.clientId,
    });
    
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }
    
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }
    
    const tokenResponse: TokenResponse = await response.json();
    
    // Update connection with new tokens
    return {
      ...connection,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || connection.refreshToken,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      updatedAt: new Date(),
    };
  }
  
  /**
   * Revoke connection (default implementation)
   * 
   * Provider-specific implementations should override this if they support revocation.
   */
  async revoke(connection: Connection): Promise<void> {
    // Default implementation does nothing
    // Provider-specific implementations should override this
    console.warn(`Revocation not implemented for ${this.getProviderType()}`);
  }
}
