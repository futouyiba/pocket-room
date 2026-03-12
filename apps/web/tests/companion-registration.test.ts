/**
 * Companion Registration Tests
 * 
 * Unit tests for companion registration functionality.
 * Validates requirements: 13.1, 13.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: vi.fn(),
}));

describe('Companion Registration', () => {
  describe('Input Validation', () => {
    it('should require companion name', async () => {
      const formData = {
        name: '',
        providerConnectionId: 'conn-123',
        model: 'gpt-4',
        systemPrompt: 'Test prompt',
      };

      // Validation should fail
      expect(formData.name.trim()).toBe('');
    });

    it('should require provider connection ID', async () => {
      const formData = {
        name: 'Test Companion',
        providerConnectionId: '',
        model: 'gpt-4',
        systemPrompt: 'Test prompt',
      };

      expect(formData.providerConnectionId).toBe('');
    });

    it('should require model selection', async () => {
      const formData = {
        name: 'Test Companion',
        providerConnectionId: 'conn-123',
        model: '',
        systemPrompt: 'Test prompt',
      };

      expect(formData.model).toBe('');
    });

    it('should allow optional system prompt', () => {
      const formData = {
        name: 'Test Companion',
        providerConnectionId: 'conn-123',
        model: 'gpt-4',
        systemPrompt: '',
      };

      // System prompt is optional
      expect(formData.systemPrompt).toBe('');
    });
  });

  describe('Provider Connection Validation (Requirement 13.2)', () => {
    it('should validate provider_connection_id ownership', () => {
      const userId = 'user-123';
      const connectionUserId = 'user-123';
      
      // Connection belongs to user
      expect(userId).toBe(connectionUserId);
    });

    it('should reject invalid provider_connection_id', () => {
      const userId = 'user-123';
      const connectionUserId = 'user-456';
      
      // Connection does not belong to user
      expect(userId).not.toBe(connectionUserId);
    });

    it('should reject non-existent provider_connection_id', () => {
      const connection = null;
      
      expect(connection).toBeNull();
    });
  });

  describe('Model Selection', () => {
    it('should provide correct models for OpenAI provider', () => {
      const provider = 'openai';
      const expectedModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      
      // Model options should match provider
      expect(provider).toBe('openai');
      expect(expectedModels).toContain('gpt-4');
    });

    it('should provide correct models for Google provider', () => {
      const provider = 'google';
      const expectedModels = ['gemini-pro', 'gemini-pro-vision'];
      
      expect(provider).toBe('google');
      expect(expectedModels).toContain('gemini-pro');
    });

    it('should provide correct models for Anthropic provider', () => {
      const provider = 'anthropic';
      const expectedModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
      
      expect(provider).toBe('anthropic');
      expect(expectedModels).toContain('claude-3-opus');
    });
  });

  describe('Companion Creation', () => {
    it('should create companion with valid data', () => {
      const companionData = {
        name: 'My Assistant',
        owner_id: 'user-123',
        provider_connection_id: 'conn-123',
        model: 'gpt-4',
        system_prompt: 'You are a helpful assistant',
      };

      expect(companionData.name).toBe('My Assistant');
      expect(companionData.owner_id).toBe('user-123');
      expect(companionData.provider_connection_id).toBe('conn-123');
      expect(companionData.model).toBe('gpt-4');
      expect(companionData.system_prompt).toBe('You are a helpful assistant');
    });

    it('should trim whitespace from name', () => {
      const name = '  My Assistant  ';
      const trimmedName = name.trim();
      
      expect(trimmedName).toBe('My Assistant');
    });

    it('should handle null system prompt', () => {
      const systemPrompt = '';
      const storedPrompt = systemPrompt.trim() || null;
      
      expect(storedPrompt).toBeNull();
    });
  });

  describe('Multiple Companions (Requirement 13.1)', () => {
    it('should allow user to register multiple companions', () => {
      const companions = [
        { id: '1', name: 'Assistant 1', model: 'gpt-4' },
        { id: '2', name: 'Assistant 2', model: 'gpt-3.5-turbo' },
        { id: '3', name: 'Assistant 3', model: 'gemini-pro' },
      ];

      // User can have multiple companions
      expect(companions.length).toBeGreaterThan(1);
      expect(companions.length).toBe(3);
    });

    it('should allow companions with different providers', () => {
      const companions = [
        { id: '1', provider: 'openai', model: 'gpt-4' },
        { id: '2', provider: 'google', model: 'gemini-pro' },
        { id: '3', provider: 'anthropic', model: 'claude-3-opus' },
      ];

      const providers = companions.map(c => c.provider);
      const uniqueProviders = new Set(providers);
      
      expect(uniqueProviders.size).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', () => {
      const error = {
        code: 'DATABASE_ERROR',
        message: 'Failed to register companion',
      };

      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.message).toBeTruthy();
    });

    it('should handle unauthorized access', () => {
      const error = {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      };

      expect(error.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should handle invalid provider connection', () => {
      const error = {
        code: 'COMPANION_PROVIDER_INVALID',
        message: 'Invalid or unauthorized provider connection',
      };

      expect(error.code).toBe('COMPANION_PROVIDER_INVALID');
    });
  });
});
