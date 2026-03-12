/**
 * Property-Based Tests for Row Level Security (RLS) Policies
 * 
 * These tests verify that RLS policies correctly enforce access control
 * across all tables in the Pocket Room database.
 * 
 * Test Framework: Vitest + fast-check
 * Iterations: 100 per property
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Skip these tests if using mock Supabase (test.supabase.co)
const isRealSupabase = SUPABASE_URL && !SUPABASE_URL.includes('test.supabase.co');

// Service role client (bypasses RLS for test setup)
let adminClient: SupabaseClient;

// User clients (subject to RLS)
let user1Client: SupabaseClient;
let user2Client: SupabaseClient;

// Test user IDs
let user1Id: string;
let user2Id: string;

// ============================================================================
// Test Setup and Teardown
// ============================================================================

beforeAll(async () => {
  if (!isRealSupabase) return;
  
  // Initialize admin client
  adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Create test users
  const { data: user1, error: error1 } = await adminClient.auth.admin.createUser({
    email: `test-user-1-${Date.now()}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  });

  const { data: user2, error: error2 } = await adminClient.auth.admin.createUser({
    email: `test-user-2-${Date.now()}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (error1 || error2 || !user1?.user || !user2?.user) {
    throw new Error('Failed to create test users');
  }

  user1Id = user1.user.id;
  user2Id = user2.user.id;

  // Create user clients with their sessions
  const { data: session1 } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: user1.user.email!,
  });

  const { data: session2 } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: user2.user.email!,
  });

  // Initialize user clients (these will be subject to RLS)
  user1Client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  user2Client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Set auth context for user clients
  await user1Client.auth.setSession({
    access_token: session1.properties?.access_token || '',
    refresh_token: session1.properties?.refresh_token || '',
  });

  await user2Client.auth.setSession({
    access_token: session2.properties?.access_token || '',
    refresh_token: session2.properties?.refresh_token || '',
  });
});

afterAll(async () => {
  // Clean up test users
  if (user1Id) {
    await adminClient.auth.admin.deleteUser(user1Id);
  }
  if (user2Id) {
    await adminClient.auth.admin.deleteUser(user2Id);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test room with the admin client
 */
async function createTestRoom(ownerId: string, status: 'pending' | 'active' | 'archived' = 'active') {
  const { data, error } = await adminClient
    .from('rooms')
    .insert({
      name: `Test Room ${Date.now()}`,
      description: 'Test room for RLS testing',
      owner_id: ownerId,
      status,
      join_strategy: 'approval',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add a user as a room member
 */
async function addRoomMember(roomId: string, userId: string, joinedAt: Date = new Date()) {
  const { data, error } = await adminClient
    .from('room_members')
    .insert({
      room_id: roomId,
      user_id: userId,
      joined_at: joinedAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test message
 */
async function createTestMessage(roomId: string, userId: string, createdAt: Date = new Date()) {
  const { data, error } = await adminClient
    .from('messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      content: `Test message ${Date.now()}`,
      created_at: createdAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test provider connection
 */
async function createTestProviderConnection(userId: string) {
  const { data, error } = await adminClient
    .from('provider_connections')
    .insert({
      user_id: userId,
      provider: 'openai',
      scopes: ['api.read'],
      access_token_encrypted: 'encrypted_token',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test AI companion
 */
async function createTestCompanion(ownerId: string, connectionId: string) {
  const { data, error } = await adminClient
    .from('ai_companions')
    .insert({
      name: `Test Companion ${Date.now()}`,
      owner_id: ownerId,
      provider_connection_id: connectionId,
      model: 'gpt-4',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a test AI invocation
 */
async function createTestInvocation(companionId: string, roomId: string, triggeredBy: string) {
  const { data, error } = await adminClient
    .from('ai_invocations')
    .insert({
      companion_id: companionId,
      room_id: roomId,
      triggered_by: triggeredBy,
      status: 'summoned',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Property 43: RLS 强制表级隔离
// ============================================================================

describe.skipIf(!isRealSupabase)('Property 43: RLS 强制表级隔离', () => {
  /**
   * **Validates: Requirements 17.1, 17.5**
   * 
   * 对于任意启用 RLS 的表（rooms、messages、room_members、segments、ai_companions、
   * provider_connections），未授权用户的查询应该返回空结果集，不应该返回权限错误或
   * 泄露资源存在性。
   */
  it('should return empty results for unauthorized access without leaking resource existence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('rooms', 'messages', 'room_members', 'segments', 'ai_companions', 'provider_connections', 'ai_invocations'),
        async (tableName) => {
          // Create a resource owned by user1
          let resourceId: string;

          switch (tableName) {
            case 'rooms':
              const room = await createTestRoom(user1Id);
              resourceId = room.id;
              break;

            case 'messages':
              const testRoom = await createTestRoom(user1Id);
              await addRoomMember(testRoom.id, user1Id);
              const message = await createTestMessage(testRoom.id, user1Id);
              resourceId = message.id;
              break;

            case 'room_members':
              const memberRoom = await createTestRoom(user1Id);
              const member = await addRoomMember(memberRoom.id, user1Id);
              resourceId = member.user_id;
              break;

            case 'segments':
              const segmentRoom = await createTestRoom(user1Id);
              const { data: segment } = await adminClient
                .from('segments')
                .insert({
                  name: 'Test Segment',
                  created_by: user1Id,
                  room_id: segmentRoom.id,
                })
                .select()
                .single();
              resourceId = segment!.id;
              break;

            case 'ai_companions':
              const connection = await createTestProviderConnection(user1Id);
              const companion = await createTestCompanion(user1Id, connection.id);
              resourceId = companion.id;
              break;

            case 'provider_connections':
              const providerConn = await createTestProviderConnection(user1Id);
              resourceId = providerConn.id;
              break;

            case 'ai_invocations':
              const invRoom = await createTestRoom(user1Id);
              await addRoomMember(invRoom.id, user1Id);
              const invConnection = await createTestProviderConnection(user1Id);
              const invCompanion = await createTestCompanion(user1Id, invConnection.id);
              const invocation = await createTestInvocation(invCompanion.id, invRoom.id, user1Id);
              resourceId = invocation.id;
              break;

            default:
              throw new Error(`Unknown table: ${tableName}`);
          }

          // User2 (unauthorized) tries to access the resource
          const { data, error } = await user2Client
            .from(tableName as any)
            .select('*')
            .eq('id', resourceId);

          // Should return empty results, not an error
          expect(error).toBeNull();
          expect(data).toEqual([]);

          // Clean up
          await adminClient.from(tableName as any).delete().eq('id', resourceId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 44: 消息 RLS 成员检查
// ============================================================================

describe.skipIf(!isRealSupabase)('Property 44: 消息 RLS 成员检查', () => {
  /**
   * **Validates: Requirements 17.2**
   * 
   * 对于任意 messages 表的 SELECT 查询，RLS 策略应该确保：
   * (1) 用户是 Room Member
   * (2) message.created_at >= room_member.joined_at
   * 不满足条件的消息不应该出现在结果中。
   */
  it('should only show messages created after user joined the room', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of messages before join
        fc.integer({ min: 1, max: 10 }), // Number of messages after join
        async (messagesBefore, messagesAfter) => {
          // Create a room with user1 as owner
          const room = await createTestRoom(user1Id);

          // Create messages before user2 joins
          const beforeJoinTime = new Date();
          const beforeMessages = [];
          for (let i = 0; i < messagesBefore; i++) {
            const msg = await createTestMessage(
              room.id,
              user1Id,
              new Date(beforeJoinTime.getTime() - (messagesBefore - i) * 1000)
            );
            beforeMessages.push(msg);
          }

          // User2 joins the room
          const joinTime = new Date();
          await addRoomMember(room.id, user2Id, joinTime);

          // Create messages after user2 joins
          const afterMessages = [];
          for (let i = 0; i < messagesAfter; i++) {
            const msg = await createTestMessage(
              room.id,
              user1Id,
              new Date(joinTime.getTime() + (i + 1) * 1000)
            );
            afterMessages.push(msg);
          }

          // User2 queries messages
          const { data, error } = await user2Client
            .from('messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: true });

          expect(error).toBeNull();
          expect(data).toBeDefined();

          // User2 should only see messages created after joining
          const visibleMessageIds = data!.map(m => m.id);
          const afterMessageIds = afterMessages.map(m => m.id);

          // All after messages should be visible
          afterMessageIds.forEach(id => {
            expect(visibleMessageIds).toContain(id);
          });

          // No before messages should be visible
          beforeMessages.forEach(msg => {
            expect(visibleMessageIds).not.toContain(msg.id);
          });

          // Clean up
          await adminClient.from('rooms').delete().eq('id', room.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not show messages from rooms where user is not a member', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (numMessages) => {
          // Create a room with user1 as owner and member
          const room = await createTestRoom(user1Id);
          await addRoomMember(room.id, user1Id);

          // Create messages in the room
          const messages = [];
          for (let i = 0; i < numMessages; i++) {
            const msg = await createTestMessage(room.id, user1Id);
            messages.push(msg);
          }

          // User2 (not a member) tries to query messages
          const { data, error } = await user2Client
            .from('messages')
            .select('*')
            .eq('room_id', room.id);

          expect(error).toBeNull();
          expect(data).toEqual([]);

          // Clean up
          await adminClient.from('rooms').delete().eq('id', room.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 45: 资源所有权 RLS
// ============================================================================

describe.skipIf(!isRealSupabase)('Property 45: 资源所有权 RLS', () => {
  /**
   * **Validates: Requirements 17.3**
   * 
   * 对于任意 ai_companions 或 provider_connections 表的查询或修改操作，
   * RLS 策略应该确保 owner_id = auth.uid()；用户不应该能够访问或修改
   * 其他用户的资源。
   */
  it('should prevent users from accessing other users provider connections', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('openai', 'google', 'anthropic'),
        async (provider) => {
          // User1 creates a provider connection
          const connection = await createTestProviderConnection(user1Id);

          // User2 tries to access user1's connection
          const { data, error } = await user2Client
            .from('provider_connections')
            .select('*')
            .eq('id', connection.id);

          expect(error).toBeNull();
          expect(data).toEqual([]);

          // User2 tries to update user1's connection
          const { error: updateError } = await user2Client
            .from('provider_connections')
            .update({ provider: provider as any })
            .eq('id', connection.id);

          // Update should fail silently (no rows affected)
          expect(updateError).toBeNull();

          // Verify connection was not modified
          const { data: verifyData } = await adminClient
            .from('provider_connections')
            .select('provider')
            .eq('id', connection.id)
            .single();

          expect(verifyData?.provider).not.toBe(provider);

          // Clean up
          await adminClient.from('provider_connections').delete().eq('id', connection.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent users from accessing other users AI companions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (newName) => {
          // User1 creates a companion
          const connection = await createTestProviderConnection(user1Id);
          const companion = await createTestCompanion(user1Id, connection.id);

          // User2 tries to access user1's companion (SELECT is allowed for display)
          const { data: selectData, error: selectError } = await user2Client
            .from('ai_companions')
            .select('*')
            .eq('id', companion.id);

          // SELECT is allowed (for display in rooms), but should show the companion
          expect(selectError).toBeNull();
          expect(selectData).toHaveLength(1);

          // User2 tries to update user1's companion
          const { error: updateError } = await user2Client
            .from('ai_companions')
            .update({ name: newName })
            .eq('id', companion.id);

          // Update should fail silently
          expect(updateError).toBeNull();

          // Verify companion was not modified
          const { data: verifyData } = await adminClient
            .from('ai_companions')
            .select('name')
            .eq('id', companion.id)
            .single();

          expect(verifyData?.name).not.toBe(newName);

          // User2 tries to delete user1's companion
          const { error: deleteError } = await user2Client
            .from('ai_companions')
            .delete()
            .eq('id', companion.id);

          // Delete should fail silently
          expect(deleteError).toBeNull();

          // Verify companion still exists
          const { data: existsData } = await adminClient
            .from('ai_companions')
            .select('id')
            .eq('id', companion.id);

          expect(existsData).toHaveLength(1);

          // Clean up
          await adminClient.from('ai_companions').delete().eq('id', companion.id);
          await adminClient.from('provider_connections').delete().eq('id', connection.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 46: Invocation RLS 成员检查
// ============================================================================

describe.skipIf(!isRealSupabase)('Property 46: Invocation RLS 成员检查', () => {
  /**
   * **Validates: Requirements 17.4**
   * 
   * 对于任意 ai_invocations 表的 SELECT 查询，RLS 策略应该确保用户是对应
   * Room 的 Member；非成员不应该能够看到 Room 中的 Companion 调用记录。
   */
  it('should only show invocations from rooms where user is a member', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (numInvocations) => {
          // Create a room with user1 as owner and member
          const room = await createTestRoom(user1Id);
          await addRoomMember(room.id, user1Id);

          // Create a companion for user1
          const connection = await createTestProviderConnection(user1Id);
          const companion = await createTestCompanion(user1Id, connection.id);

          // Create invocations in the room
          const invocations = [];
          for (let i = 0; i < numInvocations; i++) {
            const inv = await createTestInvocation(companion.id, room.id, user1Id);
            invocations.push(inv);
          }

          // User1 (member) should see all invocations
          const { data: user1Data, error: user1Error } = await user1Client
            .from('ai_invocations')
            .select('*')
            .eq('room_id', room.id);

          expect(user1Error).toBeNull();
          expect(user1Data).toHaveLength(numInvocations);

          // User2 (not a member) should not see any invocations
          const { data: user2Data, error: user2Error } = await user2Client
            .from('ai_invocations')
            .select('*')
            .eq('room_id', room.id);

          expect(user2Error).toBeNull();
          expect(user2Data).toEqual([]);

          // Clean up
          await adminClient.from('rooms').delete().eq('id', room.id);
          await adminClient.from('ai_companions').delete().eq('id', companion.id);
          await adminClient.from('provider_connections').delete().eq('id', connection.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show invocations after user joins the room', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        async (invocationsBefore, invocationsAfter) => {
          // Create a room with user1 as owner and member
          const room = await createTestRoom(user1Id);
          await addRoomMember(room.id, user1Id);

          // Create a companion for user1
          const connection = await createTestProviderConnection(user1Id);
          const companion = await createTestCompanion(user1Id, connection.id);

          // Create invocations before user2 joins
          const beforeInvocations = [];
          for (let i = 0; i < invocationsBefore; i++) {
            const inv = await createTestInvocation(companion.id, room.id, user1Id);
            beforeInvocations.push(inv);
          }

          // User2 joins the room
          await addRoomMember(room.id, user2Id);

          // Create invocations after user2 joins
          const afterInvocations = [];
          for (let i = 0; i < invocationsAfter; i++) {
            const inv = await createTestInvocation(companion.id, room.id, user1Id);
            afterInvocations.push(inv);
          }

          // User2 queries invocations
          const { data, error } = await user2Client
            .from('ai_invocations')
            .select('*')
            .eq('room_id', room.id);

          expect(error).toBeNull();
          expect(data).toBeDefined();

          // User2 should see all invocations (both before and after joining)
          // Note: Unlike messages, invocations don't have a joined_at filter
          const totalInvocations = invocationsBefore + invocationsAfter;
          expect(data!.length).toBe(totalInvocations);

          // Clean up
          await adminClient.from('rooms').delete().eq('id', room.id);
          await adminClient.from('ai_companions').delete().eq('id', companion.id);
          await adminClient.from('provider_connections').delete().eq('id', connection.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
