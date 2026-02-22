/**
 * PKCE Implementation Tests
 * 
 * Unit tests for PKCE (Proof Key for Code Exchange) implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  isValidCodeVerifier,
  isValidState,
} from '../lib/provider-binding/pkce';

describe('PKCE Implementation', () => {
  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with correct length', () => {
      const verifier = generateCodeVerifier();
      
      // RFC 7636: code_verifier length must be 43-128 characters
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });
    
    it('should generate code verifier with valid characters', () => {
      const verifier = generateCodeVerifier();
      
      // RFC 7636: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      const validPattern = /^[A-Za-z0-9\-._~]+$/;
      expect(validPattern.test(verifier)).toBe(true);
    });
    
    it('should generate unique code verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      
      expect(verifier1).not.toBe(verifier2);
    });
    
    it('should generate cryptographically secure random values', () => {
      // Generate multiple verifiers and check they are all different
      const verifiers = new Set();
      for (let i = 0; i < 100; i++) {
        verifiers.add(generateCodeVerifier());
      }
      
      // All 100 should be unique
      expect(verifiers.size).toBe(100);
    });
  });
  
  describe('generateCodeChallenge', () => {
    it('should generate code challenge from verifier', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      
      // Challenge should be base64url encoded (43 chars for SHA-256)
      expect(challenge.length).toBe(43);
      expect(/^[A-Za-z0-9\-_]+$/.test(challenge)).toBe(true);
    });
    
    it('should generate same challenge for same verifier', async () => {
      const verifier = 'test-verifier-1234567890-abcdefghijklmnopqrstuvwxyz';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);
      
      expect(challenge1).toBe(challenge2);
    });
    
    it('should generate different challenges for different verifiers', async () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      
      const challenge1 = await generateCodeChallenge(verifier1);
      const challenge2 = await generateCodeChallenge(verifier2);
      
      expect(challenge1).not.toBe(challenge2);
    });
    
    it('should use S256 method (SHA-256)', async () => {
      // Test with known input/output from RFC 7636 Appendix B
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
      
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBe(expectedChallenge);
    });
  });
  
  describe('generateState', () => {
    it('should generate a state parameter', () => {
      const state = generateState();
      
      expect(state.length).toBeGreaterThan(0);
      expect(/^[A-Za-z0-9\-_]+$/.test(state)).toBe(true);
    });
    
    it('should generate unique state parameters', () => {
      const state1 = generateState();
      const state2 = generateState();
      
      expect(state1).not.toBe(state2);
    });
    
    it('should generate cryptographically secure random values', () => {
      const states = new Set();
      for (let i = 0; i < 100; i++) {
        states.add(generateState());
      }
      
      expect(states.size).toBe(100);
    });
  });
  
  describe('isValidCodeVerifier', () => {
    it('should validate correct code verifier', () => {
      const verifier = generateCodeVerifier();
      expect(isValidCodeVerifier(verifier)).toBe(true);
    });
    
    it('should reject verifier that is too short', () => {
      const shortVerifier = 'abc'; // Less than 43 characters
      expect(isValidCodeVerifier(shortVerifier)).toBe(false);
    });
    
    it('should reject verifier that is too long', () => {
      const longVerifier = 'a'.repeat(129); // More than 128 characters
      expect(isValidCodeVerifier(longVerifier)).toBe(false);
    });
    
    it('should reject verifier with invalid characters', () => {
      const invalidVerifier = 'abc123!@#$%^&*()+=[]{}|;:,<>?/\\'; // Contains invalid chars
      expect(isValidCodeVerifier(invalidVerifier)).toBe(false);
    });
    
    it('should accept verifier with valid characters', () => {
      const validVerifier = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      expect(isValidCodeVerifier(validVerifier)).toBe(true);
    });
  });
  
  describe('isValidState', () => {
    it('should validate correct state parameter', () => {
      const state = generateState();
      expect(isValidState(state)).toBe(true);
    });
    
    it('should reject empty state', () => {
      expect(isValidState('')).toBe(false);
    });
    
    it('should reject state with invalid characters', () => {
      const invalidState = 'abc123!@#$%^&*()';
      expect(isValidState(invalidState)).toBe(false);
    });
    
    it('should accept state with base64url characters', () => {
      const validState = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      expect(isValidState(validState)).toBe(true);
    });
  });
  
  describe('PKCE Flow Integration', () => {
    it('should complete full PKCE flow', async () => {
      // 1. Generate code verifier
      const codeVerifier = generateCodeVerifier();
      expect(isValidCodeVerifier(codeVerifier)).toBe(true);
      
      // 2. Generate code challenge
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      expect(codeChallenge.length).toBe(43);
      
      // 3. Generate state
      const state = generateState();
      expect(isValidState(state)).toBe(true);
      
      // 4. Verify challenge is deterministic
      const challengeVerify = await generateCodeChallenge(codeVerifier);
      expect(challengeVerify).toBe(codeChallenge);
    });
  });
});
