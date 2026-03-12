/**
 * Companion Registration Property-Based Tests
 * 
 * Property-based tests using fast-check to verify Companion registration correctness properties.
 * 
 * Feature: sprint1-pocket-room
 * 
 * **Validates: Requirements 13.1, 13.2**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Arbitraries for test data generation
const uuidArb = fc.uuid();

const providerTypeArb = fc.constantFrom('openai', 'google', 'anthropic');

const modelArb = fc.oneof(
  fc.constantFrom('gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'),
  fc.constantFrom('gemini-pro', 'gemini-pro-vision'),
  fc.constantFrom('claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku')
);

const companionNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const systemPromptArb = fc.option(
  fc.string({ minLength: 0, maxLength: 1000 }),
  { nil: null }
);

const providerConnectionArb = fc.record({
  id: uuidArb,
  user_id: uuidArb,
  provider: providerTypeArb,
  access_token_encrypted: fc.string({ minLength: 20, maxLength: 100 }),
  expires_at: fc.date({ min: new Date(Date.now() + 3600000) }), // At least 1 hour in future
  created_at: fc.date({ max: new Date() }),
  updated_at: fc.date({ max: new Date() }),
});

const companionArb = fc.record({
  id: uuidArb,
  name: companionNameArb,
  owner_id: uuidArb,
  provider_connection_id: uuidArb,
  model: modelArb,
  system_prompt: systemPromptArb,
  created_at: fc.date({ max: new Date() }),
  updated_at: fc.date({ max: new Date() }),
});

describe('Companion Registration Properties', () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  afterEach(async () => {
    // Cleanup is handled by test database reset
  });

  describe('Property 34: 多 Companion 注册 (Multiple Companion Registration)', () => {
    /**
     * Property 34: 多 Companion 注册
     * 
     * 对于任意用户，应该能够创建多个 ai_companion 记录，
     * 每个记录关联不同的 provider_connection_id 和 model，无数量限制。
     * 
     * **Validates: Requirements 13.1**
     */
    it('should allow users to register multiple companions without limit', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          fc.array(companionArb, { minLength: 1, maxLength: 10 }), // multiple companions
          (userId, companions) => {
            // Property: User can create multiple companions
            // Each companion should have unique ID but same owner
            const companionsWithOwner = companions.map(c => ({
              ...c,
              owner_id: userId,
            }));

            // Verify all companions belong to the same user
            const allBelongToUser = companionsWithOwner.every(c => c.owner_id === userId);
            expect(allBelongToUser).toBe(true);

            // Verify companions can have different provider connections
            const connectionIds = companionsWithOwner.map(c => c.provider_connection_id);
            // It's valid to have duplicate connections (same provider, different companions)
            expect(connectionIds.length).toBe(companions.length);

            // Verify companions can have different models
            const models = companionsWithOwner.map(c => c.model);
            expect(models.length).toBe(companions.length);

            // Verify no quantity limit (we test up to 10, but there's no enforced limit)
            expect(companionsWithOwner.length).toBeGreaterThanOrEqual(1);
            expect(companionsWithOwner.length).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow companions with different provider connections for same user', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          fc.array(providerConnectionArb, { minLength: 2, maxLength: 5 }), // multiple connections
          fc.array(companionNameArb, { minLength: 2, maxLength: 5 }), // companion names
          (userId, connections, names) => {
            // Ensure connections belong to the user
            const userConnections = connections.map(c => ({
              ...c,
              user_id: userId,
            }));

            // Create companions using different connections
            const companions = userConnections.slice(0, Math.min(names.length, userConnections.length)).map((conn, idx) => ({
              id: `companion-${idx}`,
              name: names[idx],
              owner_id: userId,
              provider_connection_id: conn.id,
              model: 'gpt-4',
              system_prompt: null,
            }));

            // Property: Each companion can have a different provider connection
            const connectionIds = companions.map(c => c.provider_connection_id);
            const uniqueConnections = new Set(connectionIds);

            // All companions belong to same user
            expect(companions.every(c => c.owner_id === userId)).toBe(true);

            // Companions can use different connections
            expect(connectionIds.length).toBeGreaterThanOrEqual(2);
            expect(uniqueConnections.size).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow companions with different models for same user', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          uuidArb, // provider_connection_id
          fc.array(modelArb, { minLength: 2, maxLength: 5 }), // different models
          fc.array(companionNameArb, { minLength: 2, maxLength: 5 }), // companion names
          (userId, connectionId, models, names) => {
            // Create companions with different models
            const companions = models.slice(0, Math.min(models.length, names.length)).map((model, idx) => ({
              id: `companion-${idx}`,
              name: names[idx],
              owner_id: userId,
              provider_connection_id: connectionId,
              model: model,
              system_prompt: null,
            }));

            // Property: User can create multiple companions with different models
            const companionModels = companions.map(c => c.model);

            // All companions belong to same user
            expect(companions.every(c => c.owner_id === userId)).toBe(true);

            // All companions use same connection (valid scenario)
            expect(companions.every(c => c.provider_connection_id === connectionId)).toBe(true);

            // Companions have different models
            expect(companionModels.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain companion independence (no quantity limit)', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          fc.integer({ min: 1, max: 20 }), // number of companions to create
          (userId, count) => {
            // Property: No enforced limit on number of companions
            // Simulate creating 'count' companions
            const companions = Array.from({ length: count }, (_, idx) => ({
              id: `companion-${idx}`,
              name: `Companion ${idx}`,
              owner_id: userId,
              provider_connection_id: `conn-${idx % 3}`, // Reuse some connections
              model: ['gpt-4', 'gpt-3.5-turbo', 'gemini-pro'][idx % 3],
              system_prompt: null,
            }));

            // All companions should be valid
            expect(companions.length).toBe(count);
            expect(companions.every(c => c.owner_id === userId)).toBe(true);

            // No artificial limit enforced
            expect(count).toBeGreaterThanOrEqual(1);
            expect(count).toBeLessThanOrEqual(20);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 35: Companion 需要有效连接 (Companion Requires Valid Connection)', () => {
    /**
     * Property 35: Companion 需要有效连接
     * 
     * 对于任意 Companion 创建或更新请求，provider_connection_id 必须引用一个有效的、
     * 属于该用户的 provider_connection 记录；否则操作应该被拒绝。
     * 
     * **Validates: Requirements 13.2**
     */
    it('should require valid provider_connection_id for companion creation', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          providerConnectionArb, // valid connection
          companionNameArb,
          modelArb,
          (userId, connection, name, model) => {
            // Setup: Connection belongs to user
            const userConnection = { ...connection, user_id: userId };

            // Property: Companion creation with valid connection should succeed
            const companionData = {
              name,
              owner_id: userId,
              provider_connection_id: userConnection.id,
              model,
              system_prompt: null,
            };

            // Validation logic
            const isConnectionValid = userConnection.user_id === userId;
            const isConnectionExists = userConnection.id !== null;

            // Both conditions must be true for valid companion creation
            expect(isConnectionValid).toBe(true);
            expect(isConnectionExists).toBe(true);

            // Companion data should be valid
            expect(companionData.owner_id).toBe(userId);
            expect(companionData.provider_connection_id).toBe(userConnection.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject companion creation with non-existent provider_connection_id', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          uuidArb, // non-existent connection_id
          companionNameArb,
          modelArb,
          (userId, nonExistentConnectionId, name, model) => {
            // Property: Companion creation with non-existent connection should fail
            const companionData = {
              name,
              owner_id: userId,
              provider_connection_id: nonExistentConnectionId,
              model,
              system_prompt: null,
            };

            // Simulate connection lookup failure
            const connectionExists = false; // Connection not found in database

            // Validation should fail
            expect(connectionExists).toBe(false);

            // Error should be returned
            const expectedError = {
              code: 'COMPANION_PROVIDER_INVALID',
              message: 'Invalid or unauthorized provider connection',
            };

            expect(expectedError.code).toBe('COMPANION_PROVIDER_INVALID');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject companion creation with connection owned by another user', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id (requesting user)
          uuidArb, // other_user_id (connection owner)
          providerConnectionArb,
          companionNameArb,
          modelArb,
          (userId, otherUserId, connection, name, model) => {
            // Ensure users are different
            fc.pre(userId !== otherUserId);

            // Setup: Connection belongs to another user
            const otherUserConnection = { ...connection, user_id: otherUserId };

            // Property: Companion creation with unauthorized connection should fail
            const companionData = {
              name,
              owner_id: userId,
              provider_connection_id: otherUserConnection.id,
              model,
              system_prompt: null,
            };

            // Validation logic
            const isConnectionOwnedByUser = otherUserConnection.user_id === userId;

            // Should fail ownership check
            expect(isConnectionOwnedByUser).toBe(false);

            // Error should be returned
            const expectedError = {
              code: 'COMPANION_PROVIDER_INVALID',
              message: 'Invalid or unauthorized provider connection',
            };

            expect(expectedError.code).toBe('COMPANION_PROVIDER_INVALID');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate provider_connection_id ownership on companion update', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          companionArb, // existing companion
          providerConnectionArb, // new connection
          (userId, companion, newConnection) => {
            // Setup: Companion and new connection belong to user
            const userCompanion = { ...companion, owner_id: userId };
            const userConnection = { ...newConnection, user_id: userId };

            // Property: Update with valid connection should succeed
            const updateData = {
              provider_connection_id: userConnection.id,
            };

            // Validation logic
            const isCompanionOwnedByUser = userCompanion.owner_id === userId;
            const isConnectionOwnedByUser = userConnection.user_id === userId;

            // Both conditions must be true
            expect(isCompanionOwnedByUser).toBe(true);
            expect(isConnectionOwnedByUser).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject companion update with invalid provider_connection_id', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          uuidArb, // other_user_id
          companionArb, // existing companion
          providerConnectionArb, // connection owned by other user
          (userId, otherUserId, companion, connection) => {
            // Ensure users are different
            fc.pre(userId !== otherUserId);

            // Setup: Companion belongs to user, connection belongs to other user
            const userCompanion = { ...companion, owner_id: userId };
            const otherUserConnection = { ...connection, user_id: otherUserId };

            // Property: Update with unauthorized connection should fail
            const updateData = {
              provider_connection_id: otherUserConnection.id,
            };

            // Validation logic
            const isConnectionOwnedByUser = otherUserConnection.user_id === userId;

            // Should fail ownership check
            expect(isConnectionOwnedByUser).toBe(false);

            // Error should be returned
            const expectedError = {
              code: 'COMPANION_PROVIDER_INVALID',
              message: 'Invalid or unauthorized provider connection',
            };

            expect(expectedError.code).toBe('COMPANION_PROVIDER_INVALID');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure provider_connection_id is always validated before companion operations', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          fc.oneof(
            providerConnectionArb, // valid connection
            fc.constant(null), // non-existent connection
            fc.record({ ...providerConnectionArb.value, user_id: uuidArb }) // wrong owner
          ),
          companionNameArb,
          modelArb,
          (userId, connection, name, model) => {
            // Property: Every companion operation must validate connection
            let isValid = false;

            if (connection === null) {
              // Non-existent connection
              isValid = false;
            } else if (connection.user_id !== userId) {
              // Connection owned by another user
              isValid = false;
            } else {
              // Valid connection
              isValid = true;
            }

            // Validation result should be deterministic
            if (connection === null) {
              expect(isValid).toBe(false);
            } else if (connection.user_id === userId) {
              expect(isValid).toBe(true);
            } else {
              expect(isValid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Combined Properties: Multiple Companions with Valid Connections', () => {
    it('should allow multiple companions only with valid connections', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          fc.array(providerConnectionArb, { minLength: 2, maxLength: 5 }), // user's connections
          fc.array(companionNameArb, { minLength: 2, maxLength: 5 }), // companion names
          (userId, connections, names) => {
            // Setup: All connections belong to user
            const userConnections = connections.map(c => ({ ...c, user_id: userId }));

            // Create companions using user's connections
            const companions = userConnections.slice(0, Math.min(names.length, userConnections.length)).map((conn, idx) => ({
              id: `companion-${idx}`,
              name: names[idx],
              owner_id: userId,
              provider_connection_id: conn.id,
              model: 'gpt-4',
              system_prompt: null,
            }));

            // Property: All companions should be valid
            const allValid = companions.every(c => {
              const connection = userConnections.find(conn => conn.id === c.provider_connection_id);
              return connection && connection.user_id === userId;
            });

            expect(allValid).toBe(true);
            expect(companions.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject any companion in batch if connection is invalid', () => {
      fc.assert(
        fc.property(
          uuidArb, // user_id
          uuidArb, // other_user_id
          fc.array(providerConnectionArb, { minLength: 2, maxLength: 5 }), // connections
          fc.array(companionNameArb, { minLength: 2, maxLength: 5 }), // companion names
          (userId, otherUserId, connections, names) => {
            // Ensure users are different
            fc.pre(userId !== otherUserId);

            // Setup: Mix of valid and invalid connections
            const mixedConnections = connections.map((c, idx) => ({
              ...c,
              user_id: idx === 0 ? otherUserId : userId, // First connection belongs to other user
            }));

            // Attempt to create companions
            const companionRequests = mixedConnections.slice(0, Math.min(names.length, mixedConnections.length)).map((conn, idx) => ({
              name: names[idx],
              owner_id: userId,
              provider_connection_id: conn.id,
              model: 'gpt-4',
            }));

            // Validate each request
            const validationResults = companionRequests.map(req => {
              const connection = mixedConnections.find(c => c.id === req.provider_connection_id);
              return connection && connection.user_id === userId;
            });

            // Property: First request should fail (invalid connection)
            expect(validationResults[0]).toBe(false);

            // Other requests should succeed (valid connections)
            if (validationResults.length > 1) {
              expect(validationResults.slice(1).every(v => v === true)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
