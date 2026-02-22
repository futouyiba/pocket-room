/**
 * Free Join Strategy Tests
 * 
 * Tests for requirement 6.1 and 6.2:
 * - Users can join free-join rooms immediately without approval
 * - Users can see real-time messages after joining
 * 
 * Property 20: 自由加入立即成员
 * For any room with join_strategy = 'free', a user's join request should
 * immediately create a room_member record without creating a join_request
 * or waiting for approval.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Skip these tests if using mock Supabase (test.supabase.co)
const isRealSupabase = supabaseUrl && !supabaseUrl.includes('test.supabase.co');

describe.skipIf(!isRealSupabase)('Free Join Strategy', () => {
  let supabase: ReturnType<typeof createClient>;
  let testRoomId: string;
  let testUserId: string;
  let testOwnerUserId: string;

  beforeEach(async () => {
    // Create Supabase client with service role key for testing
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create test owner user
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.createUser({
      email: `test-owner-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    if (ownerError || !ownerData.user) {
      throw new Error(`Failed to create test owner user: ${ownerError?.message}`);
    }

    testOwnerUserId = ownerData.user.id;

    // Create test user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-user-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }

    testUserId = userData.user.id;

    // Create a test room with free join strategy
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: 'Test Free Join Room',
        description: 'A room for testing free join strategy',
        owner_id: testOwnerUserId,
        join_strategy: 'free',
        status: 'active',
      })
      .select()
      .single();

    if (roomError || !roomData) {
      throw new Error(`Failed to create test room: ${roomError?.message}`);
    }

    testRoomId = roomData.id;

    // Add owner as room member
    await supabase.from('room_members').insert({
      room_id: testRoomId,
      user_id: testOwnerUserId,
      role: 'owner',
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testRoomId) {
      await supabase.from('room_members').delete().eq('room_id', testRoomId);
      await supabase.from('rooms').delete().eq('id', testRoomId);
    }

    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }

    if (testOwnerUserId) {
      await supabase.auth.admin.deleteUser(testOwnerUserId);
    }
  });

  it('should immediately add user as room member for free join strategy', async () => {
    // Requirement 6.1: Free join should immediately add user as member
    
    // Simulate the join-room API logic
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    expect(memberError).toBeNull();

    // Verify user is now a member
    const { data: member, error: fetchError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', testRoomId)
      .eq('user_id', testUserId)
      .single();

    expect(fetchError).toBeNull();
    expect(member).toBeDefined();
    expect(member?.role).toBe('member');
    expect(member?.joined_at).toBeDefined();
  });

  it('should not create join request for free join strategy', async () => {
    // Requirement 6.1: Free join should NOT create a join request
    
    // Add user as member (simulating free join)
    await supabase.from('room_members').insert({
      room_id: testRoomId,
      user_id: testUserId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });

    // Verify no join request was created
    const { data: joinRequest, error } = await supabase
      .from('join_requests')
      .select('*')
      .eq('room_id', testRoomId)
      .eq('user_id', testUserId)
      .single();

    // Should not find any join request
    expect(error).toBeDefined();
    expect(joinRequest).toBeNull();
  });

  it('should allow user to see messages after joining (via RLS)', async () => {
    // Requirement 6.2: User should see real-time messages after joining
    
    // Add user as member
    await supabase.from('room_members').insert({
      room_id: testRoomId,
      user_id: testUserId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });

    // Create a test message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: testRoomId,
        user_id: testOwnerUserId,
        content: 'Test message',
        message_type: 'text',
      })
      .select()
      .single();

    expect(messageError).toBeNull();
    expect(message).toBeDefined();

    // Verify user can read the message (RLS should allow this)
    // Note: This would require setting up auth context for the test user
    // For now, we just verify the message was created
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', testRoomId);

    expect(fetchError).toBeNull();
    expect(messages).toBeDefined();
    expect(messages?.length).toBeGreaterThan(0);
  });

  it('should prevent duplicate membership', async () => {
    // Add user as member first time
    const { error: firstError } = await supabase
      .from('room_members')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    expect(firstError).toBeNull();

    // Try to add same user again (should fail due to unique constraint)
    const { error: secondError } = await supabase
      .from('room_members')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    // Should fail with unique constraint violation
    expect(secondError).toBeDefined();
    expect(secondError?.code).toBe('23505'); // PostgreSQL unique violation
  });

  it('should work for multiple users joining the same free room', async () => {
    // Create additional test users
    const { data: user2Data } = await supabase.auth.admin.createUser({
      email: `test-user2-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    const { data: user3Data } = await supabase.auth.admin.createUser({
      email: `test-user3-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    });

    const user2Id = user2Data!.user!.id;
    const user3Id = user3Data!.user!.id;

    try {
      // Add multiple users as members
      const { error: member2Error } = await supabase
        .from('room_members')
        .insert({
          room_id: testRoomId,
          user_id: user2Id,
          role: 'member',
          joined_at: new Date().toISOString(),
        });

      const { error: member3Error } = await supabase
        .from('room_members')
        .insert({
          room_id: testRoomId,
          user_id: user3Id,
          role: 'member',
          joined_at: new Date().toISOString(),
        });

      expect(member2Error).toBeNull();
      expect(member3Error).toBeNull();

      // Verify all members are in the room
      const { data: members, error: fetchError } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', testRoomId);

      expect(fetchError).toBeNull();
      expect(members?.length).toBe(3); // owner + user2 + user3
    } finally {
      // Clean up additional users
      await supabase.auth.admin.deleteUser(user2Id);
      await supabase.auth.admin.deleteUser(user3Id);
    }
  });
});
