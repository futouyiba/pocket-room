/**
 * Member Timeline Persistence Verification Tests
 * 
 * These tests verify that:
 * 1. Messages are persisted to the cloud database (Supabase PostgreSQL)
 * 2. Messages are accessible across devices (via cloud storage)
 * 3. Members can only see messages from their join time onwards (RLS policy)
 * 
 * Requirements:
 * - 9.1: THE Web_App SHALL 为每个 Room_Member 持久化保存从加入时间点开始的所有消息记录（云端跨设备可访问）
 * 
 * Design Properties:
 * - Property 25: 消息持久化
 * - Property 26: 后加入成员消息可见性
 * 
 * Test Framework: Vitest
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Test Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Skip these tests if using mock Supabase
const isRealSupabase = SUPABASE_URL && !SUPABASE_URL.includes('test.supabase.co');

// Clients
let adminClient: SupabaseClient;
let user1Client: SupabaseClient;
let user2Client: SupabaseClient;

// Test data
let testRoomId: string;
let user1Id: string;
let user2Id: string;

// ============================================================================
// Test Setup
// ============================================================================

beforeAll(async () => {
  if (!isRealSupabase) return;

  // Initialize admin client (bypasses RLS for setup)
  adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Create test users
  const { data: user1, error: error1 } = await adminClient.auth.admin.createUser({
    email: `persistence-test-user1-${Date.now()}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  });

  const { data: user2, error: error2 } = await adminClient.auth.admin.createUser({
    email: `persistence-test-user2-${Date.now()}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (error1 || error2 || !user1?.user || !user2?.user) {
    throw new Error('Failed to create test users');
  }

  user1Id = user1.user.id;
  user2Id = user2.user.id;

  // Create authenticated clients for each user
  user1Client = createClient(SUPABASE_URL, ANON_KEY);
  user2Client = createClient(SUPABASE_URL, ANON_KEY);

  // Sign in users
  await user1Client.auth.signInWithPassword({
    email: user1.user.email!,
    password: 'test-password-123',
  });

  await user2Client.auth.signInWithPassword({
    email: user2.user.email!,
    password: 'test-password-123',
  });
});

beforeEach(async () => {
  if (!isRealSupabase) return;

  // Create a fresh test room for each test
  const { data: room, error: roomError } = await adminClient
    .from('rooms')
    .insert({
      name: `Persistence Test Room ${Date.now()}`,
      description: 'Test room for persistence verification',
      owner_id: user1Id,
      status: 'active',
      join_strategy: 'free',
    })
    .select()
    .single();

  if (roomError || !room) {
    throw new Error('Failed to create test room');
  }

  testRoomId = room.id;

  // Add user1 as room member (owner)
  await adminClient
    .from('room_members')
    .insert({
      room_id: testRoomId,
      user_id: user1Id,
      role: 'owner',
    });
});

afterAll(async () => {
  if (!isRealSupabase) return;

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
 * Wait for a specified duration (for simulating time passing)
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Tests
// ============================================================================

describe('Member Timeline Persistence', () => {
  describe.skipIf(!isRealSupabase)('Cloud Persistence', () => {
    it('should persist messages to cloud database', async () => {
      // Feature: sprint1-pocket-room, Property 25: 消息持久化
      // 对于任意 Room Member 发送的消息，应该被持久化存储在 messages 表中
      
      const messageContent = 'Test message for persistence verification';

      // User1 sends a message
      const { data: message, error: insertError } = await user1Client
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: user1Id,
          content: messageContent,
          message_type: 'text',
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(message).toBeDefined();
      expect(message!.content).toBe(messageContent);

      // Verify message is persisted by querying again
      const { data: retrievedMessage, error: queryError } = await user1Client
        .from('messages')
        .select('*')
        .eq('id', message!.id)
        .single();

      expect(queryError).toBeNull();
      expect(retrievedMessage).toBeDefined();
      expect(retrievedMessage!.content).toBe(messageContent);
      expect(retrievedMessage!.room_id).toBe(testRoomId);
      expect(retrievedMessage!.user_id).toBe(user1Id);
    });

    it('should make messages accessible across devices (simulated)', async () => {
      // Feature: sprint1-pocket-room, Property 25: 消息持久化
      // 该成员在任何设备上登录都能看到自己的消息历史
      
      const messageContent = 'Cross-device test message';

      // Device A: User1 sends a message
      const { data: message, error: insertError } = await user1Client
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: user1Id,
          content: messageContent,
          message_type: 'text',
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(message).toBeDefined();

      // Simulate Device B: Create a new client instance (simulates different device)
      const deviceBClient = createClient(SUPABASE_URL, ANON_KEY);
      
      // Sign in with same user credentials
      const { error: signInError } = await deviceBClient.auth.signInWithPassword({
        email: (await adminClient.auth.admin.getUserById(user1Id)).data.user!.email!,
        password: 'test-password-123',
      });

      expect(signInError).toBeNull();

      // Device B: Query messages (should see the message from Device A)
      const { data: messages, error: queryError } = await deviceBClient
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .eq('id', message!.id)
        .single();

      expect(queryError).toBeNull();
      expect(messages).toBeDefined();
      expect(messages!.content).toBe(messageContent);
      
      // Clean up
      await deviceBClient.auth.signOut();
    });

    it('should preserve message history with created_at timestamps', async () => {
      // Feature: sprint1-pocket-room, Property 25: 消息持久化
      // 消息应该包含 created_at 时间戳用于时间线排序
      
      // Send multiple messages
      const messages = [
        'First message',
        'Second message',
        'Third message',
      ];

      const insertedIds: string[] = [];

      for (const content of messages) {
        const { data: message, error } = await user1Client
          .from('messages')
          .insert({
            room_id: testRoomId,
            user_id: user1Id,
            content,
            message_type: 'text',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(message).toBeDefined();
        expect(message!.created_at).toBeDefined();
        insertedIds.push(message!.id);

        // Small delay to ensure different timestamps
        await wait(10);
      }

      // Query messages ordered by created_at
      const { data: retrievedMessages, error: queryError } = await user1Client
        .from('messages')
        .select('*')
        .in('id', insertedIds)
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      expect(retrievedMessages).toHaveLength(3);
      expect(retrievedMessages![0].content).toBe('First message');
      expect(retrievedMessages![1].content).toBe('Second message');
      expect(retrievedMessages![2].content).toBe('Third message');

      // Verify timestamps are in ascending order
      const timestamp1 = new Date(retrievedMessages![0].created_at).getTime();
      const timestamp2 = new Date(retrievedMessages![1].created_at).getTime();
      const timestamp3 = new Date(retrievedMessages![2].created_at).getTime();

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
      expect(timestamp3).toBeGreaterThanOrEqual(timestamp2);
    });
  });

  describe.skipIf(!isRealSupabase)('joined_at Filtering (RLS)', () => {
    it('should only show messages created after member joined', async () => {
      // Feature: sprint1-pocket-room, Property 26: 后加入成员消息可见性
      // 对于任意 Room Member，该成员只能查询和访问 created_at >= joined_at 的消息
      
      // User1 sends messages BEFORE user2 joins
      const messagesBefore = ['Message 1', 'Message 2'];
      const beforeIds: string[] = [];

      for (const content of messagesBefore) {
        const { data: message } = await user1Client
          .from('messages')
          .insert({
            room_id: testRoomId,
            user_id: user1Id,
            content,
            message_type: 'text',
          })
          .select()
          .single();

        beforeIds.push(message!.id);
        await wait(10);
      }

      // Wait a bit to ensure clear time separation
      await wait(100);

      // User2 joins the room NOW
      const joinTime = new Date();
      await adminClient
        .from('room_members')
        .insert({
          room_id: testRoomId,
          user_id: user2Id,
          role: 'member',
          joined_at: joinTime.toISOString(),
        });

      // Wait a bit more
      await wait(100);

      // User1 sends messages AFTER user2 joins
      const messagesAfter = ['Message 3', 'Message 4'];
      const afterIds: string[] = [];

      for (const content of messagesAfter) {
        const { data: message } = await user1Client
          .from('messages')
          .insert({
            room_id: testRoomId,
            user_id: user1Id,
            content,
            message_type: 'text',
          })
          .select()
          .single();

        afterIds.push(message!.id);
        await wait(10);
      }

      // User2 queries messages (should only see messages AFTER joining)
      const { data: visibleMessages, error: queryError } = await user2Client
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      expect(visibleMessages).toBeDefined();

      // User2 should NOT see messages from before joining
      const visibleIds = visibleMessages!.map(m => m.id);
      expect(visibleIds).not.toContain(beforeIds[0]);
      expect(visibleIds).not.toContain(beforeIds[1]);

      // User2 SHOULD see messages from after joining
      expect(visibleIds).toContain(afterIds[0]);
      expect(visibleIds).toContain(afterIds[1]);

      // Verify content
      expect(visibleMessages!.some(m => m.content === 'Message 1')).toBe(false);
      expect(visibleMessages!.some(m => m.content === 'Message 2')).toBe(false);
      expect(visibleMessages!.some(m => m.content === 'Message 3')).toBe(true);
      expect(visibleMessages!.some(m => m.content === 'Message 4')).toBe(true);
    });

    it('should enforce joined_at filtering at database level (RLS)', async () => {
      // Feature: sprint1-pocket-room, Property 26: 后加入成员消息可见性
      // RLS 策略应该在数据库层面强制执行 joined_at 过滤
      
      // Create messages before user2 joins
      const { data: messageBefore } = await user1Client
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: user1Id,
          content: 'Before join message',
          message_type: 'text',
        })
        .select()
        .single();

      await wait(100);

      // User2 joins
      const joinTime = new Date();
      await adminClient
        .from('room_members')
        .insert({
          room_id: testRoomId,
          user_id: user2Id,
          role: 'member',
          joined_at: joinTime.toISOString(),
        });

      await wait(100);

      // Create message after user2 joins
      const { data: messageAfter } = await user1Client
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: user1Id,
          content: 'After join message',
          message_type: 'text',
        })
        .select()
        .single();

      // User2 tries to query the message from BEFORE joining by ID
      // RLS should block this even with explicit ID query
      const { data: blockedMessage, error: blockedError } = await user2Client
        .from('messages')
        .select('*')
        .eq('id', messageBefore!.id)
        .single();

      // Should return no data (RLS blocks it)
      expect(blockedMessage).toBeNull();
      expect(blockedError).toBeDefined();

      // User2 queries the message from AFTER joining
      const { data: allowedMessage, error: allowedError } = await user2Client
        .from('messages')
        .select('*')
        .eq('id', messageAfter!.id)
        .single();

      // Should succeed
      expect(allowedError).toBeNull();
      expect(allowedMessage).toBeDefined();
      expect(allowedMessage!.content).toBe('After join message');
    });

    it('should allow room owner to see all messages regardless of join time', async () => {
      // Feature: sprint1-pocket-room, Property 26: 后加入成员消息可见性
      // Room owner 应该能看到所有消息（因为 owner 的 joined_at 通常是 room 创建时间）
      
      // User1 (owner) sends messages
      const messages = ['Owner message 1', 'Owner message 2', 'Owner message 3'];
      const messageIds: string[] = [];

      for (const content of messages) {
        const { data: message } = await user1Client
          .from('messages')
          .insert({
            room_id: testRoomId,
            user_id: user1Id,
            content,
            message_type: 'text',
          })
          .select()
          .single();

        messageIds.push(message!.id);
        await wait(10);
      }

      // User1 (owner) queries all messages
      const { data: ownerMessages, error: queryError } = await user1Client
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      expect(ownerMessages).toBeDefined();
      expect(ownerMessages!.length).toBeGreaterThanOrEqual(3);

      // Verify all messages are visible
      const visibleIds = ownerMessages!.map(m => m.id);
      messageIds.forEach(id => {
        expect(visibleIds).toContain(id);
      });
    });
  });

  describe.skipIf(!isRealSupabase)('Integration with Message API', () => {
    it('should persist messages sent via API route', async () => {
      // This test verifies that the /api/messages/send route correctly persists messages
      // Note: This is an integration test that requires the API route to be running
      
      // For now, we test the underlying Supabase operation
      // In a full E2E test, we would call the actual API endpoint
      
      const messageContent = 'API route test message';

      // Simulate what the API route does
      const { data: message, error } = await user1Client
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: user1Id,
          content: messageContent,
          message_type: 'text',
          attachments: [],
          is_deleted: false,
        })
        .select('id')
        .single();

      expect(error).toBeNull();
      expect(message).toBeDefined();
      expect(message!.id).toBeDefined();

      // Verify persistence
      const { data: retrieved } = await user1Client
        .from('messages')
        .select('*')
        .eq('id', message!.id)
        .single();

      expect(retrieved).toBeDefined();
      expect(retrieved!.content).toBe(messageContent);
    });
  });
});

describe('Documentation Verification', () => {
  it('should have member-timeline-persistence.md documentation', async () => {
    // Verify that the documentation file exists
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const docPath = path.join(process.cwd(), '../../docs/member-timeline-persistence.md');
    
    try {
      const content = await fs.readFile(docPath, 'utf-8');
      expect(content).toContain('Member Timeline Persistence');
      expect(content).toContain('需求 9.1');
      expect(content).toContain('Supabase PostgreSQL');
      expect(content).toContain('joined_at');
    } catch (error) {
      // If running from apps/web, try relative path
      const altPath = path.join(process.cwd(), 'docs/member-timeline-persistence.md');
      const content = await fs.readFile(altPath, 'utf-8');
      expect(content).toContain('Member Timeline Persistence');
    }
  });
});
