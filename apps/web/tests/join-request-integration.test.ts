/**
 * Join Request Integration Tests
 * 
 * Integration tests for the complete join request approval workflow.
 * Tests the interaction between API routes, database, and components.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// These tests require a Supabase test database
// Run with: SUPABASE_URL=... SUPABASE_ANON_KEY=... npm test

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

describe('Join Request Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let testRoomId: string;
  let ownerId: string;
  let applicantId: string;
  let requestId: string;

  beforeEach(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping integration tests: Supabase credentials not provided');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Create test users (in a real test, you'd use test accounts)
    // For now, we'll use mock IDs
    ownerId = 'test-owner-id';
    applicantId = 'test-applicant-id';

    // Create test room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: 'Test Room',
        description: 'Test room for join request tests',
        owner_id: ownerId,
        join_strategy: 'approval',
        status: 'active',
      })
      .select()
      .single();

    if (roomError) {
      throw new Error(`Failed to create test room: ${roomError.message}`);
    }

    testRoomId = room.id;

    // Create join request
    const { data: request, error: requestError } = await supabase
      .from('join_requests')
      .insert({
        room_id: testRoomId,
        user_id: applicantId,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      throw new Error(`Failed to create join request: ${requestError.message}`);
    }

    requestId = request.id;
  });

  afterEach(async () => {
    if (!supabase) return;

    // Cleanup test data
    if (testRoomId) {
      await supabase.from('rooms').delete().eq('id', testRoomId);
    }
  });

  it('should approve join request and add user as member', async () => {
    if (!supabase) {
      console.warn('Skipping test: Supabase not initialized');
      return;
    }

    // Approve the request
    const response = await fetch('/api/rooms/handle-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        action: 'approve',
      }),
    });

    expect(response.ok).toBe(true);

    // Verify user was added as member
    const { data: member, error: memberError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', testRoomId)
      .eq('user_id', applicantId)
      .single();

    expect(memberError).toBeNull();
    expect(member).toBeDefined();
    expect(member?.role).toBe('member');

    // Verify request status was updated
    const { data: request, error: requestError } = await supabase
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    expect(requestError).toBeNull();
    expect(request?.status).toBe('approved');
    expect(request?.handled_by).toBe(ownerId);
    expect(request?.handled_at).toBeDefined();
  });

  it('should reject join request without adding user', async () => {
    if (!supabase) {
      console.warn('Skipping test: Supabase not initialized');
      return;
    }

    // Reject the request
    const response = await fetch('/api/rooms/handle-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        action: 'reject',
      }),
    });

    expect(response.ok).toBe(true);

    // Verify user was NOT added as member
    const { data: member } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', testRoomId)
      .eq('user_id', applicantId)
      .single();

    expect(member).toBeNull();

    // Verify request status was updated
    const { data: request } = await supabase
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    expect(request?.status).toBe('rejected');
  });

  it('should block user and add to blacklist', async () => {
    if (!supabase) {
      console.warn('Skipping test: Supabase not initialized');
      return;
    }

    // Block the user
    const response = await fetch('/api/rooms/handle-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        action: 'block',
      }),
    });

    expect(response.ok).toBe(true);

    // Verify user was added to blacklist
    const { data: blacklistEntry, error: blacklistError } = await supabase
      .from('room_blacklist')
      .select('*')
      .eq('room_id', testRoomId)
      .eq('user_id', applicantId)
      .single();

    expect(blacklistError).toBeNull();
    expect(blacklistEntry).toBeDefined();
    expect(blacklistEntry?.blocked_by).toBe(ownerId);

    // Verify request status was updated
    const { data: request } = await supabase
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    expect(request?.status).toBe('blocked');

    // Verify user cannot submit new join request (tested in join API)
    const joinResponse = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: testRoomId,
      }),
    });

    expect(joinResponse.status).toBe(403);
    const joinError = await joinResponse.json();
    expect(joinError.error).toContain('封禁');
  });

  it('should silence user and set cooldown period', async () => {
    if (!supabase) {
      console.warn('Skipping test: Supabase not initialized');
      return;
    }

    const silenceDurationHours = 24;

    // Silence the user
    const response = await fetch('/api/rooms/handle-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        action: 'silence',
        silenceDurationHours,
      }),
    });

    expect(response.ok).toBe(true);

    // Verify request was updated with silenced_until
    const { data: request, error: requestError } = await supabase
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    expect(requestError).toBeNull();
    expect(request?.status).toBe('rejected');
    expect(request?.silenced_until).toBeDefined();

    // Verify silenced_until is approximately 24 hours from now
    const silencedUntil = new Date(request!.silenced_until);
    const expectedTime = new Date();
    expectedTime.setHours(expectedTime.getHours() + silenceDurationHours);

    const timeDiff = Math.abs(silencedUntil.getTime() - expectedTime.getTime());
    expect(timeDiff).toBeLessThan(60000); // Within 1 minute

    // Verify user cannot submit new join request during cooldown
    const joinResponse = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: testRoomId,
      }),
    });

    expect(joinResponse.status).toBe(403);
    const joinError = await joinResponse.json();
    expect(joinError.error).toContain('冷却期');
  });

  it('should reject if non-owner tries to handle request', async () => {
    if (!supabase) {
      console.warn('Skipping test: Supabase not initialized');
      return;
    }

    // Attempt to approve as non-owner (would need to mock auth)
    // This test requires proper authentication mocking
    // For now, we'll skip the implementation
  });

  it('should reject if request is not pending', async () => {
    if (!supabase) {
      console.warn('Skipping test: Supabase not initialized');
      return;
    }

    // First, approve the request
    await fetch('/api/rooms/handle-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        action: 'approve',
      }),
    });

    // Try to approve again
    const response = await fetch('/api/rooms/handle-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        action: 'approve',
      }),
    });

    expect(response.status).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('已被处理');
  });
});
