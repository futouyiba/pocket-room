/**
 * Leave Room History Access Control Tests
 * 
 * Tests for post-exit history access control based on keep_history flag.
 * 
 * Requirements:
 * - 11.4: 退出并选择保留历史时，消息历史保持可访问
 * - 11.5: 退出并选择删除历史时，消息历史标记为不可访问
 * 
 * Design Reference:
 * - RLS policies enforce access control based on left_at and keep_history
 * - If left_at IS NULL: user is active member, can access all messages after joined_at
 * - If left_at IS NOT NULL AND keep_history = TRUE: can access messages between joined_at and left_at
 * - If left_at IS NOT NULL AND keep_history = FALSE: cannot access any messages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test database setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Skip tests if Supabase is not available
const isSupabaseAvailable = supabaseUrl && 
                             supabaseServiceKey &&
                             supabaseUrl !== 'http://localhost:54321' &&
                             supabaseUrl !== 'https://test.supabase.co';

describe.skipIf(!isSupabaseAvailable)('Leave Room History Access Control', () => {
  let supabase: ReturnType<typeof createClient>;
  let testRoomId: string;
  let testUserId: string;
  let testUserEmail: string;

  beforeEach(async () => {
    // Create admin client for setup
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create test user
    testUserEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUserEmail,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;

    // Create test room
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: 'Test Room',
        owner_id: testUserId,
        status: 'active',
        join_strategy: 'free',
      })
      .select()
      .single();

    if (roomError || !roomData) {
      throw new Error(`Failed to create test room: ${roomError?.message}`);
    }

    testRoomId = roomData.id;

    // Add user as room member
    const joinedAt = new Date('2024-01-01T10:00:00Z');
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        role: 'owner',
        joined_at: joinedAt.toISOString(),
      });

    if (memberError) {
      throw new Error(`Failed to add room member: ${memberError.message}`);
    }

    // Create test messages at different times
    const messages = [
      { created_at: '2024-01-01T10:05:00Z', content: 'Message 1 - after join' },
      { created_at: '2024-01-01T10:10:00Z', content: 'Message 2 - after join' },
      { created_at: '2024-01-01T10:15:00Z', content: 'Message 3 - after join' },
      { created_at: '2024-01-01T10:20:00Z', content: 'Message 4 - after join' },
    ];

    for (const msg of messages) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: testUserId,
          content: msg.content,
          created_at: msg.created_at,
        });

      if (msgError) {
        throw new Error(`Failed to create test message: ${msgError.message}`);
      }
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (testRoomId) {
      await supabase.from('messages').delete().eq('room_id', testRoomId);
      await supabase.from('room_members').delete().eq('room_id', testRoomId);
      await supabase.from('rooms').delete().eq('id', testRoomId);
    }

    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('需求 11.4: 保留历史 - 消息历史保持可访问', () => {
    it('should allow access to messages between joined_at and left_at when keep_history=true', async () => {
      // User leaves at 10:12 (after message 2, before message 3)
      const leftAt = new Date('2024-01-01T10:12:00Z');
      
      // Update room_members: set left_at and keep_history=true
      const { error: updateError } = await supabase
        .from('room_members')
        .update({
          left_at: leftAt.toISOString(),
          keep_history: true,
        })
        .eq('room_id', testRoomId)
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Create user client (simulating the user's session)
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: 'test-password-123',
      });

      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        },
      });

      // Query messages as the user
      const { data: messages, error: queryError } = await userClient
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      expect(messages).toBeDefined();
      
      // Should only see messages 1 and 2 (between joined_at and left_at)
      expect(messages).toHaveLength(2);
      expect(messages![0].content).toBe('Message 1 - after join');
      expect(messages![1].content).toBe('Message 2 - after join');
    });

    it('should not allow access to messages after left_at even with keep_history=true', async () => {
      // User leaves at 10:12
      const leftAt = new Date('2024-01-01T10:12:00Z');
      
      const { error: updateError } = await supabase
        .from('room_members')
        .update({
          left_at: leftAt.toISOString(),
          keep_history: true,
        })
        .eq('room_id', testRoomId)
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Create user client
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: 'test-password-123',
      });

      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        },
      });

      // Query messages after left_at
      const { data: messages, error: queryError } = await userClient
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .gt('created_at', leftAt.toISOString())
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      
      // Should not see any messages after left_at
      expect(messages).toHaveLength(0);
    });
  });

  describe('需求 11.5: 删除历史 - 消息历史标记为不可访问', () => {
    it('should deny access to all messages when keep_history=false', async () => {
      // User leaves with keep_history=false
      const leftAt = new Date('2024-01-01T10:12:00Z');
      
      const { error: updateError } = await supabase
        .from('room_members')
        .update({
          left_at: leftAt.toISOString(),
          keep_history: false,
        })
        .eq('room_id', testRoomId)
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Create user client
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: 'test-password-123',
      });

      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        },
      });

      // Query messages as the user
      const { data: messages, error: queryError } = await userClient
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      
      // Should not see any messages
      expect(messages).toHaveLength(0);
    });

    it('should deny access to messages even within joined_at and left_at range when keep_history=false', async () => {
      // User leaves at 10:12
      const leftAt = new Date('2024-01-01T10:12:00Z');
      
      const { error: updateError } = await supabase
        .from('room_members')
        .update({
          left_at: leftAt.toISOString(),
          keep_history: false,
        })
        .eq('room_id', testRoomId)
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Create user client
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: 'test-password-123',
      });

      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        },
      });

      // Query messages between joined_at and left_at
      const { data: messages, error: queryError } = await userClient
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .gte('created_at', '2024-01-01T10:00:00Z')
        .lte('created_at', leftAt.toISOString())
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      
      // Should not see any messages
      expect(messages).toHaveLength(0);
    });
  });

  describe('Active members (left_at IS NULL)', () => {
    it('should allow active members to access all messages after joined_at', async () => {
      // User is still active (left_at is NULL)
      
      // Create user client
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: 'test-password-123',
      });

      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        },
      });

      // Query messages as the user
      const { data: messages, error: queryError } = await userClient
        .from('messages')
        .select('*')
        .eq('room_id', testRoomId)
        .order('created_at', { ascending: true });

      expect(queryError).toBeNull();
      expect(messages).toBeDefined();
      
      // Should see all 4 messages
      expect(messages).toHaveLength(4);
    });
  });

  describe('Message sending restrictions', () => {
    it('should prevent users who have left from sending new messages', async () => {
      // User leaves with keep_history=true
      const leftAt = new Date('2024-01-01T10:12:00Z');
      
      const { error: updateError } = await supabase
        .from('room_members')
        .update({
          left_at: leftAt.toISOString(),
          keep_history: true,
        })
        .eq('room_id', testRoomId)
        .eq('user_id', testUserId);

      expect(updateError).toBeNull();

      // Create user client
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testUserEmail,
        password: 'test-password-123',
      });

      const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        },
      });

      // Try to send a new message
      const { error: insertError } = await userClient
        .from('messages')
        .insert({
          room_id: testRoomId,
          user_id: testUserId,
          content: 'New message after leaving',
        });

      // Should fail due to RLS policy
      expect(insertError).toBeDefined();
      expect(insertError?.message).toContain('violates row-level security policy');
    });
  });
});
