/**
 * Provider Adapter Tests
 * 
 * Unit tests for OpenAI and Google provider adapters.
 * Tests provider-specific OAuth flow, token management, and API integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from '../lib/provider-binding/providers/openai';
import { GoogleProvider } from '../lib/provider-binding/providers/google';
import { Connection } from '../lib/provider-binding/types';

// Mock environment variables
const mockEnv = {
  OPENAI_CLIENT_ID: 'test-openai-client-id',
  OPENAI_CLIENT_SECRET: 'test-openai-client-secret',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

// Set up environment variables
beforeEach(() => {
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
});

describe('OpenAI Provider Adapter', () => {
  describe('Provider Configuration', () => {
    it('should initialize with correct provider type', () => {
      const provider = new OpenAIProvider();
      expect(provider.getProviderType()).toBe('openai');
    });
    
    it('should throw error if OPENAI_CLIENT_ID is not set', () => {
      delete process.env.OPENAI_CLIENT_ID;
      
      expect(() => new OpenAIProvider()).toThrow('OPENAI_CLIENT_ID environment variable is not set');
    });
    
    it('should use correct OAuth endpoints', async () => {
      const provider = new OpenAIProvider();
      const { authUrl } = await provider.startLogin();
      
      expect(authUrl).toContain('https://auth.openai.com/authorize');
      expect(authUrl).toContain('client_id=test-openai-client-id');
      expect(authUrl).toContain('scope=openai.api');
    });
  });
  
  describe('OAuth Flow', () => {
    it('should generate authorization URL with PKCE parameters', async () => {
      const provider = new OpenAIProvider();
      const { authUrl, state } = await provider.startLogin();
      
      // Check URL structure
      expect(authUrl).toContain('https://auth.openai.com/authorize');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('code_challenge_method=S256');
      
      // Check state is returned
      expect(state).toBeTruthy();
      expect(state.length).toBeGreaterThan(0);
      
      // Check code_challenge is present
      expect(authUrl).toContain('code_challenge=');
    });
    
    it('should include correct redirect URI', async () => {
      const provider = new OpenAIProvider();
      const { authUrl } = await provider.startLogin();
      
      const expectedRedirectUri = encodeURIComponent('http://localhost:3000/api/auth/callback/openai');
      expect(authUrl).toContain(`redirect_uri=${expectedRedirectUri}`);
    });
    
    it('should include correct scopes', async () => {
      const provider = new OpenAIProvider();
      const { authUrl } = await provider.startLogin();
      
      const expectedScope = encodeURIComponent('openai.api');
      expect(authUrl).toContain(`scope=${expectedScope}`);
    });
  });
  
  describe('Token Exchange', () => {
    it('should handle callback and extract account ID', async () => {
      const provider = new OpenAIProvider();
      
      // Mock fetch for token exchange
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openai.api',
          }),
        } as Response)
        // Mock fetch for user info
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'openai-user-123',
            email: 'test@example.com',
            name: 'Test User',
          }),
        } as Response);
      
      const connection = await provider.handleCallback(
        'test-code',
        'test-state',
        'test-code-verifier'
      );
      
      expect(connection.provider).toBe('openai');
      expect(connection.accessToken).toBe('test-access-token');
      expect(connection.refreshToken).toBe('test-refresh-token');
      expect(connection.accountId).toBe('openai-user-123');
      expect(connection.metadata.email).toBe('test@example.com');
      expect(connection.metadata.name).toBe('Test User');
    });
    
    it('should handle callback without account ID if user info fails', async () => {
      const provider = new OpenAIProvider();
      
      // Mock fetch for token exchange
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        } as Response)
        // Mock fetch for user info (fails)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        } as Response);
      
      const connection = await provider.handleCallback(
        'test-code',
        'test-state',
        'test-code-verifier'
      );
      
      expect(connection.provider).toBe('openai');
      expect(connection.accessToken).toBe('test-access-token');
      expect(connection.accountId).toBeUndefined();
    });
  });
  
  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      const provider = new OpenAIProvider();
      
      const existingConnection: Connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'openai',
        accountId: 'openai-user-123',
        scopes: ['openai.api'],
        accessToken: 'old-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Mock fetch for token refresh
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      } as Response);
      
      const refreshedConnection = await provider.refresh(existingConnection);
      
      expect(refreshedConnection.accessToken).toBe('new-access-token');
      expect(refreshedConnection.refreshToken).toBe('new-refresh-token');
      expect(refreshedConnection.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
  
  describe('Token Revocation', () => {
    it('should handle revocation gracefully', async () => {
      const provider = new OpenAIProvider();
      
      const connection: Connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'openai',
        accountId: 'openai-user-123',
        scopes: ['openai.api'],
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Should not throw
      await expect(provider.revoke(connection)).resolves.toBeUndefined();
    });
  });
});

describe('Google Provider Adapter', () => {
  describe('Provider Configuration', () => {
    it('should initialize with correct provider type', () => {
      const provider = new GoogleProvider();
      expect(provider.getProviderType()).toBe('google');
    });
    
    it('should throw error if GOOGLE_CLIENT_ID is not set', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      
      expect(() => new GoogleProvider()).toThrow('GOOGLE_CLIENT_ID environment variable is not set');
    });
    
    it('should use correct OAuth endpoints', async () => {
      const provider = new GoogleProvider();
      const { authUrl } = await provider.startLogin();
      
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-google-client-id');
    });
    
    it('should include all required scopes', async () => {
      const provider = new GoogleProvider();
      const { authUrl } = await provider.startLogin();
      
      // Check that URL contains encoded scopes
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('generative-language');
      expect(authUrl).toContain('userinfo.email');
      expect(authUrl).toContain('userinfo.profile');
    });
  });
  
  describe('OAuth Flow', () => {
    it('should generate authorization URL with PKCE parameters', async () => {
      const provider = new GoogleProvider();
      const { authUrl, state } = await provider.startLogin();
      
      // Check URL structure
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('code_challenge_method=S256');
      
      // Check state is returned
      expect(state).toBeTruthy();
      expect(state.length).toBeGreaterThan(0);
      
      // Check code_challenge is present
      expect(authUrl).toContain('code_challenge=');
    });
    
    it('should include correct redirect URI', async () => {
      const provider = new GoogleProvider();
      const { authUrl } = await provider.startLogin();
      
      const expectedRedirectUri = encodeURIComponent('http://localhost:3000/api/auth/callback/google');
      expect(authUrl).toContain(`redirect_uri=${expectedRedirectUri}`);
    });
  });
  
  describe('Token Exchange', () => {
    it('should handle callback and extract account ID', async () => {
      const provider = new GoogleProvider();
      
      // Mock fetch for token exchange
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://www.googleapis.com/auth/generative-language',
          }),
        } as Response)
        // Mock fetch for user info
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sub: 'google-user-123',
            email: 'test@gmail.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
          }),
        } as Response);
      
      const connection = await provider.handleCallback(
        'test-code',
        'test-state',
        'test-code-verifier'
      );
      
      expect(connection.provider).toBe('google');
      expect(connection.accessToken).toBe('test-access-token');
      expect(connection.refreshToken).toBe('test-refresh-token');
      expect(connection.accountId).toBe('google-user-123');
      expect(connection.metadata.email).toBe('test@gmail.com');
      expect(connection.metadata.name).toBe('Test User');
      expect(connection.metadata.picture).toBe('https://example.com/avatar.jpg');
    });
    
    it('should handle callback without account ID if user info fails', async () => {
      const provider = new GoogleProvider();
      
      // Mock fetch for token exchange
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        } as Response)
        // Mock fetch for user info (fails)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        } as Response);
      
      const connection = await provider.handleCallback(
        'test-code',
        'test-state',
        'test-code-verifier'
      );
      
      expect(connection.provider).toBe('google');
      expect(connection.accessToken).toBe('test-access-token');
      expect(connection.accountId).toBeUndefined();
    });
  });
  
  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      const provider = new GoogleProvider();
      
      const existingConnection: Connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        accountId: 'google-user-123',
        scopes: ['https://www.googleapis.com/auth/generative-language'],
        accessToken: 'old-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Mock fetch for token refresh
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      } as Response);
      
      const refreshedConnection = await provider.refresh(existingConnection);
      
      expect(refreshedConnection.accessToken).toBe('new-access-token');
      expect(refreshedConnection.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
  
  describe('Token Revocation', () => {
    it('should revoke token via Google revocation endpoint', async () => {
      const provider = new GoogleProvider();
      
      const connection: Connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        accountId: 'google-user-123',
        scopes: ['https://www.googleapis.com/auth/generative-language'],
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Mock fetch for revocation
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      } as Response);
      
      await provider.revoke(connection);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://oauth2.googleapis.com/revoke'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
    
    it('should throw error if revocation fails', async () => {
      const provider = new GoogleProvider();
      
      const connection: Connection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'google',
        accountId: 'google-user-123',
        scopes: ['https://www.googleapis.com/auth/generative-language'],
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Mock fetch for revocation (fails)
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);
      
      await expect(provider.revoke(connection)).rejects.toThrow('Token revocation failed');
    });
  });
});

describe('Provider Adapter Integration', () => {
  describe('Unified Interface', () => {
    it('should provide consistent interface across providers', async () => {
      const openaiProvider = new OpenAIProvider();
      const googleProvider = new GoogleProvider();
      
      // Both should implement the same interface
      expect(typeof openaiProvider.startLogin).toBe('function');
      expect(typeof openaiProvider.handleCallback).toBe('function');
      expect(typeof openaiProvider.refresh).toBe('function');
      expect(typeof openaiProvider.revoke).toBe('function');
      
      expect(typeof googleProvider.startLogin).toBe('function');
      expect(typeof googleProvider.handleCallback).toBe('function');
      expect(typeof googleProvider.refresh).toBe('function');
      expect(typeof googleProvider.revoke).toBe('function');
    });
    
    it('should return consistent connection structure', async () => {
      const openaiProvider = new OpenAIProvider();
      
      // Mock fetch
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            refresh_token: 'test-refresh',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'user-123',
            email: 'test@example.com',
          }),
        } as Response);
      
      const connection = await openaiProvider.handleCallback(
        'test-code',
        'test-state',
        'test-verifier'
      );
      
      // Check connection structure
      expect(connection).toHaveProperty('provider');
      expect(connection).toHaveProperty('accessToken');
      expect(connection).toHaveProperty('refreshToken');
      expect(connection).toHaveProperty('expiresAt');
      expect(connection).toHaveProperty('scopes');
      expect(connection).toHaveProperty('metadata');
    });
  });
  
  describe('Provider-Specific Differences Encapsulation', () => {
    it('should encapsulate OpenAI-specific OAuth endpoints', async () => {
      const provider = new OpenAIProvider();
      const { authUrl } = await provider.startLogin();
      
      // Business logic doesn't need to know about OpenAI-specific endpoints
      expect(authUrl).toContain('auth.openai.com');
    });
    
    it('should encapsulate Google-specific OAuth endpoints', async () => {
      const provider = new GoogleProvider();
      const { authUrl } = await provider.startLogin();
      
      // Business logic doesn't need to know about Google-specific endpoints
      expect(authUrl).toContain('accounts.google.com');
    });
    
    it('should encapsulate provider-specific scopes', async () => {
      const openaiProvider = new OpenAIProvider();
      const googleProvider = new GoogleProvider();
      
      const { authUrl: openaiUrl } = await openaiProvider.startLogin();
      const { authUrl: googleUrl } = await googleProvider.startLogin();
      
      // Different providers have different scopes
      expect(openaiUrl).toContain('openai.api');
      expect(googleUrl).toContain('generative-language');
    });
  });
});
