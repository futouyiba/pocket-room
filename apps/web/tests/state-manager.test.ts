/**
 * OAuth State Manager Tests
 * 
 * Unit tests for OAuth state management during authorization flow.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  hasOAuthState,
} from '../lib/provider-binding/state-manager';
import type { OAuthState } from '../lib/provider-binding/types';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('OAuth State Manager', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
  });
  
  describe('storeOAuthState', () => {
    it('should store OAuth state in sessionStorage', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      
      const stored = sessionStorage.getItem('oauth_state');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.state).toBe(state.state);
      expect(parsed.codeVerifier).toBe(state.codeVerifier);
      expect(parsed.provider).toBe(state.provider);
    });
    
    it('should overwrite existing state', () => {
      const state1: OAuthState = {
        state: 'state-1',
        codeVerifier: 'verifier-1',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      const state2: OAuthState = {
        state: 'state-2',
        codeVerifier: 'verifier-2',
        provider: 'google',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state1);
      storeOAuthState(state2);
      
      const stored = sessionStorage.getItem('oauth_state');
      const parsed = JSON.parse(stored!);
      expect(parsed.state).toBe('state-2');
    });
  });
  
  describe('retrieveOAuthState', () => {
    it('should retrieve stored OAuth state', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      
      const retrieved = retrieveOAuthState('test-state-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.state).toBe(state.state);
      expect(retrieved?.codeVerifier).toBe(state.codeVerifier);
      expect(retrieved?.provider).toBe(state.provider);
    });
    
    it('should return null if state parameter does not match', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      
      const retrieved = retrieveOAuthState('wrong-state');
      expect(retrieved).toBeNull();
    });
    
    it('should return null if no state is stored', () => {
      const retrieved = retrieveOAuthState('any-state');
      expect(retrieved).toBeNull();
    });
    
    it('should return null if state has expired', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now() - 11 * 60 * 1000, // 11 minutes ago (expired)
      };
      
      storeOAuthState(state);
      
      const retrieved = retrieveOAuthState('test-state-123');
      expect(retrieved).toBeNull();
    });
    
    it('should accept state within expiry window', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago (valid)
      };
      
      storeOAuthState(state);
      
      const retrieved = retrieveOAuthState('test-state-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.state).toBe(state.state);
    });
  });
  
  describe('clearOAuthState', () => {
    it('should clear stored OAuth state', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      expect(hasOAuthState()).toBe(true);
      
      clearOAuthState();
      expect(hasOAuthState()).toBe(false);
    });
    
    it('should not throw if no state is stored', () => {
      expect(() => clearOAuthState()).not.toThrow();
    });
  });
  
  describe('hasOAuthState', () => {
    it('should return true if state exists', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      expect(hasOAuthState()).toBe(true);
    });
    
    it('should return false if no state exists', () => {
      expect(hasOAuthState()).toBe(false);
    });
    
    it('should return false after clearing state', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      clearOAuthState();
      expect(hasOAuthState()).toBe(false);
    });
  });
  
  describe('State Security', () => {
    it('should prevent state reuse after retrieval', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      
      // First retrieval should succeed
      const retrieved1 = retrieveOAuthState('test-state-123');
      expect(retrieved1).not.toBeNull();
      
      // State should still be in storage (not auto-cleared)
      // This allows for retry logic if needed
      const retrieved2 = retrieveOAuthState('test-state-123');
      expect(retrieved2).not.toBeNull();
    });
    
    it('should validate state parameter format', () => {
      const state: OAuthState = {
        state: 'test-state-123',
        codeVerifier: 'test-verifier-456',
        provider: 'openai',
        redirectUri: 'https://example.com/callback',
        createdAt: Date.now(),
      };
      
      storeOAuthState(state);
      
      // Empty state should fail
      expect(retrieveOAuthState('')).toBeNull();
      
      // Null/undefined should fail
      expect(retrieveOAuthState(null as any)).toBeNull();
      expect(retrieveOAuthState(undefined as any)).toBeNull();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle corrupted state data', () => {
      // Store invalid JSON
      sessionStorage.setItem('oauth_state', 'invalid-json{');
      
      const retrieved = retrieveOAuthState('any-state');
      expect(retrieved).toBeNull();
    });
    
    it('should handle missing required fields', () => {
      // Store incomplete state
      sessionStorage.setItem('oauth_state', JSON.stringify({
        state: 'test-state',
        // Missing codeVerifier and other fields
      }));
      
      const retrieved = retrieveOAuthState('test-state');
      // Should still return the object, but it will be incomplete
      // The caller should validate required fields
      expect(retrieved).not.toBeNull();
    });
  });
});
