/**
 * Authorization URL Builder Tests
 * 
 * Unit tests for OAuth authorization URL building and parsing.
 */

import { describe, it, expect } from 'vitest';
import {
  buildAuthorizationUrl,
  parseCallbackParams,
  validateCallbackParams,
} from '../lib/provider-binding/url-builder';
import type { AuthUrlConfig, CallbackParams } from '../lib/provider-binding/url-builder';

describe('Authorization URL Builder', () => {
  describe('buildAuthorizationUrl', () => {
    it('should build complete authorization URL', () => {
      const config: AuthUrlConfig = {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'profile', 'email'],
        state: 'test-state-123',
        codeChallenge: 'test-challenge-456',
      };
      
      const url = buildAuthorizationUrl(config);
      
      expect(url).toContain('https://auth.example.com/authorize?');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback');
      expect(url).toContain('scope=openid+profile+email');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('code_challenge=test-challenge-456');
      expect(url).toContain('code_challenge_method=S256');
    });
    
    it('should use S256 as default code challenge method', () => {
      const config: AuthUrlConfig = {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid'],
        state: 'test-state',
        codeChallenge: 'test-challenge',
      };
      
      const url = buildAuthorizationUrl(config);
      expect(url).toContain('code_challenge_method=S256');
    });
    
    it('should allow custom code challenge method', () => {
      const config: AuthUrlConfig = {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid'],
        state: 'test-state',
        codeChallenge: 'test-challenge',
        codeChallengeMethod: 'plain',
      };
      
      const url = buildAuthorizationUrl(config);
      expect(url).toContain('code_challenge_method=plain');
    });
    
    it('should include additional parameters', () => {
      const config: AuthUrlConfig = {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid'],
        state: 'test-state',
        codeChallenge: 'test-challenge',
        additionalParams: {
          prompt: 'consent',
          access_type: 'offline',
        },
      };
      
      const url = buildAuthorizationUrl(config);
      expect(url).toContain('prompt=consent');
      expect(url).toContain('access_type=offline');
    });
    
    it('should properly encode special characters', () => {
      const config: AuthUrlConfig = {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback?foo=bar&baz=qux',
        scopes: ['openid', 'profile'],
        state: 'test-state',
        codeChallenge: 'test-challenge',
      };
      
      const url = buildAuthorizationUrl(config);
      expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback%3Ffoo%3Dbar%26baz%3Dqux');
    });
  });
  
  describe('parseCallbackParams', () => {
    it('should parse successful callback URL', () => {
      const url = 'https://app.example.com/callback?code=test-code-123&state=test-state-456';
      const params = parseCallbackParams(url);
      
      expect(params.code).toBe('test-code-123');
      expect(params.state).toBe('test-state-456');
      expect(params.error).toBeUndefined();
    });
    
    it('should parse error callback URL', () => {
      const url = 'https://app.example.com/callback?error=access_denied&error_description=User+denied+access';
      const params = parseCallbackParams(url);
      
      expect(params.error).toBe('access_denied');
      expect(params.error_description).toBe('User denied access');
      expect(params.code).toBeUndefined();
    });
    
    it('should parse URLSearchParams directly', () => {
      const searchParams = new URLSearchParams('code=test-code&state=test-state');
      const params = parseCallbackParams(searchParams);
      
      expect(params.code).toBe('test-code');
      expect(params.state).toBe('test-state');
    });
    
    it('should handle missing parameters', () => {
      const url = 'https://app.example.com/callback';
      const params = parseCallbackParams(url);
      
      expect(params.code).toBeUndefined();
      expect(params.state).toBeUndefined();
      expect(params.error).toBeUndefined();
    });
    
    it('should handle URL with hash fragment', () => {
      const url = 'https://app.example.com/callback?code=test-code&state=test-state#fragment';
      const params = parseCallbackParams(url);
      
      expect(params.code).toBe('test-code');
      expect(params.state).toBe('test-state');
    });
  });
  
  describe('validateCallbackParams', () => {
    it('should validate successful callback', () => {
      const params: CallbackParams = {
        code: 'test-code-123',
        state: 'test-state-456',
      };
      
      const result = validateCallbackParams(params);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject callback with error', () => {
      const params: CallbackParams = {
        error: 'access_denied',
        error_description: 'User denied access',
      };
      
      const result = validateCallbackParams(params);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('User denied access');
    });
    
    it('should use error code if description is missing', () => {
      const params: CallbackParams = {
        error: 'invalid_request',
      };
      
      const result = validateCallbackParams(params);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_request');
    });
    
    it('should reject callback without code', () => {
      const params: CallbackParams = {
        state: 'test-state',
      };
      
      const result = validateCallbackParams(params);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing authorization code');
    });
    
    it('should reject callback without state', () => {
      const params: CallbackParams = {
        code: 'test-code',
      };
      
      const result = validateCallbackParams(params);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing state parameter');
    });
    
    it('should reject empty parameters', () => {
      const params: CallbackParams = {};
      
      const result = validateCallbackParams(params);
      expect(result.valid).toBe(false);
    });
  });
  
  describe('OAuth Flow Integration', () => {
    it('should build and parse complete OAuth flow', () => {
      // 1. Build authorization URL
      const config: AuthUrlConfig = {
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'profile'],
        state: 'test-state-123',
        codeChallenge: 'test-challenge-456',
      };
      
      const authUrl = buildAuthorizationUrl(config);
      
      // 2. Simulate callback URL
      const callbackUrl = 'https://app.example.com/callback?code=auth-code-789&state=test-state-123';
      
      // 3. Parse callback
      const params = parseCallbackParams(callbackUrl);
      
      // 4. Validate callback
      const validation = validateCallbackParams(params);
      
      expect(validation.valid).toBe(true);
      expect(params.code).toBe('auth-code-789');
      expect(params.state).toBe('test-state-123');
    });
    
    it('should handle error flow', () => {
      // Simulate error callback
      const callbackUrl = 'https://app.example.com/callback?error=access_denied&error_description=User+cancelled';
      
      const params = parseCallbackParams(callbackUrl);
      const validation = validateCallbackParams(params);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('User cancelled');
    });
  });
});
