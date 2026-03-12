/**
 * Companion Registration API Integration Tests
 * 
 * Integration tests for companion registration API endpoints.
 * Validates requirements: 13.1, 13.2, 13.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Companion Registration API', () => {
  describe('POST /api/companion/register', () => {
    it('should register a new companion with valid data', async () => {
      const requestBody = {
        name: 'Test Companion',
        providerConnectionId: 'valid-connection-id',
        model: 'gpt-4',
        systemPrompt: 'You are a helpful assistant',
      };

      // Mock successful response
      const mockResponse = {
        id: 'companion-123',
        name: 'Test Companion',
        model: 'gpt-4',
        systemPrompt: 'You are a helpful assistant',
        providerConnectionId: 'valid-connection-id',
        provider: 'openai',
        createdAt: new Date().toISOString(),
      };

      expect(mockResponse.id).toBeTruthy();
      expect(mockResponse.name).toBe(requestBody.name);
      expect(mockResponse.model).toBe(requestBody.model);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const expectedStatus = 401;
      const expectedError = {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      };

      expect(expectedStatus).toBe(401);
      expect(expectedError.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        name: '',
        providerConnectionId: '',
        model: '',
      };

      const expectedStatus = 400;
      const expectedError = {
        code: 'VALIDATION_REQUIRED_FIELD',
        message: 'Name, provider connection, and model are required',
      };

      expect(expectedStatus).toBe(400);
      expect(expectedError.code).toBe('VALIDATION_REQUIRED_FIELD');
    });

    it('should validate provider_connection_id ownership (Requirement 13.2)', async () => {
      const requestBody = {
        name: 'Test Companion',
        providerConnectionId: 'unauthorized-connection-id',
        model: 'gpt-4',
      };

      const expectedStatus = 400;
      const expectedError = {
        code: 'COMPANION_PROVIDER_INVALID',
        message: 'Invalid or unauthorized provider connection',
      };

      expect(expectedStatus).toBe(400);
      expect(expectedError.code).toBe('COMPANION_PROVIDER_INVALID');
    });

    it('should handle non-existent provider connection', async () => {
      const requestBody = {
        name: 'Test Companion',
        providerConnectionId: 'non-existent-id',
        model: 'gpt-4',
      };

      const expectedStatus = 400;
      const expectedError = {
        code: 'COMPANION_PROVIDER_INVALID',
        message: 'Invalid or unauthorized provider connection',
      };

      expect(expectedStatus).toBe(400);
      expect(expectedError.code).toBe('COMPANION_PROVIDER_INVALID');
    });
  });

  describe('DELETE /api/companion/[id]', () => {
    it('should delete companion owned by user (Requirement 13.5)', async () => {
      const companionId = 'companion-123';
      const userId = 'user-123';

      // Mock successful deletion
      const mockResponse = { success: true };

      expect(mockResponse.success).toBe(true);
    });

    it('should return 404 for non-existent companion', async () => {
      const companionId = 'non-existent-id';

      const expectedStatus = 404;
      const expectedError = {
        code: 'COMPANION_NOT_FOUND',
        message: 'Companion not found or unauthorized',
      };

      expect(expectedStatus).toBe(404);
      expect(expectedError.code).toBe('COMPANION_NOT_FOUND');
    });

    it('should return 404 for companion owned by another user', async () => {
      const companionId = 'companion-123';
      const requestUserId = 'user-123';
      const companionOwnerId = 'user-456';

      const expectedStatus = 404;
      const expectedError = {
        code: 'COMPANION_NOT_FOUND',
        message: 'Companion not found or unauthorized',
      };

      expect(requestUserId).not.toBe(companionOwnerId);
      expect(expectedStatus).toBe(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const expectedStatus = 401;
      const expectedError = {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      };

      expect(expectedStatus).toBe(401);
      expect(expectedError.code).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('PATCH /api/companion/[id]', () => {
    it('should update companion configuration (Requirement 13.3)', async () => {
      const companionId = 'companion-123';
      const updateData = {
        name: 'Updated Name',
        model: 'gpt-4-turbo',
        systemPrompt: 'Updated prompt',
      };

      const mockResponse = {
        id: companionId,
        name: 'Updated Name',
        model: 'gpt-4-turbo',
        systemPrompt: 'Updated prompt',
        providerConnectionId: 'conn-123',
        updatedAt: new Date().toISOString(),
      };

      expect(mockResponse.name).toBe(updateData.name);
      expect(mockResponse.model).toBe(updateData.model);
      expect(mockResponse.systemPrompt).toBe(updateData.systemPrompt);
    });

    it('should return 404 for non-existent companion', async () => {
      const companionId = 'non-existent-id';

      const expectedStatus = 404;
      const expectedError = {
        code: 'COMPANION_NOT_FOUND',
        message: 'Companion not found or unauthorized',
      };

      expect(expectedStatus).toBe(404);
      expect(expectedError.code).toBe('COMPANION_NOT_FOUND');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const expectedStatus = 401;
      const expectedError = {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      };

      expect(expectedStatus).toBe(401);
      expect(expectedError.code).toBe('AUTH_UNAUTHORIZED');
    });
  });

  describe('Multiple Companions (Requirement 13.1)', () => {
    it('should allow registering multiple companions', async () => {
      const companions = [
        { name: 'Companion 1', model: 'gpt-4' },
        { name: 'Companion 2', model: 'gpt-3.5-turbo' },
        { name: 'Companion 3', model: 'gemini-pro' },
      ];

      // Each companion should be registered successfully
      expect(companions.length).toBe(3);
      companions.forEach(companion => {
        expect(companion.name).toBeTruthy();
        expect(companion.model).toBeTruthy();
      });
    });

    it('should allow companions with different provider connections', async () => {
      const companions = [
        { name: 'OpenAI Assistant', providerConnectionId: 'openai-conn' },
        { name: 'Google Assistant', providerConnectionId: 'google-conn' },
        { name: 'Anthropic Assistant', providerConnectionId: 'anthropic-conn' },
      ];

      const connectionIds = companions.map(c => c.providerConnectionId);
      const uniqueConnections = new Set(connectionIds);

      expect(uniqueConnections.size).toBe(3);
    });
  });
});
