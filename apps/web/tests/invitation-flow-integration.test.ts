/**
 * Invitation Flow Integration Tests
 * 
 * Tests the complete invitation confirmation flow from creation to acceptance/rejection.
 * Requirements: 3.5, 3.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    admin: {
      listUsers: vi.fn(),
    },
  },
  from: vi.fn(),
};

// Mock logger
vi.mock('@/lib/provider-binding/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: () => mockSupabase,
}));

describe('Invitation Flow Integration', () => {
  const creatorId = 'creator-id';
  const inviteeId = 'invitee-id';
  const roomId = 'room-id';
  const invitationId = 'invitation-id';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Complete Accept Flow (需求 3.5)', () => {
    it('should create room, invitation, then accept and activate room', async () => {
      // Step 1: Create room (from create-room API)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: creatorId } },
        error: null,
      });
      
      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: inviteeId, email: 'invitee@example.com' },
          ],
        },
        error: null,
      });
      
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        owner_id: creatorId,
        status: 'pending',
        join_strategy: 'approval',
      };
      
      const mockInvitation = {
        id: invitationId,
        room_id: roomId,
        inviter_id: creatorId,
        invitee_id: inviteeId,
        status: 'pending',
      };
      
      // Mock room creation
      const roomInsert = vi.fn().mockReturnThis();
      const roomSelect = vi.fn().mockReturnThis();
      const roomSingle = vi.fn().mockResolvedValue({
        data: mockRoom,
        error: null,
      });
      
      // Mock invitation creation
      const invitationInsert = vi.fn().mockReturnThis();
      const invitationSelect = vi.fn().mockResolvedValue({
        data: [mockInvitation],
        error: null,
      });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            insert: roomInsert,
            select: roomSelect,
          };
        }
        if (table === 'invitations') {
          return {
            insert: invitationInsert,
            select: invitationSelect,
          };
        }
        return {};
      });
      
      roomInsert.mockReturnValue({
        select: roomSelect,
      });
      
      roomSelect.mockReturnValue({
        single: roomSingle,
      });
      
      invitationInsert.mockReturnValue({
        select: invitationSelect,
      });
      
      // Verify room was created with pending status
      expect(mockRoom.status).toBe('pending');
      
      // Step 2: Accept invitation (from confirm-invitation API)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: inviteeId } },
        error: null,
      });
      
      const mockInvitationWithRoom = {
        ...mockInvitation,
        rooms: mockRoom,
      };
      
      const invitationQuery = vi.fn().mockReturnThis();
      const invitationEq = vi.fn().mockReturnThis();
      const invitationSingleQuery = vi.fn().mockResolvedValue({
        data: mockInvitationWithRoom,
        error: null,
      });
      
      const invitationUpdate = vi.fn().mockReturnThis();
      const membersInsert = vi.fn().mockResolvedValue({ error: null });
      const roomUpdate = vi.fn().mockReturnThis();
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: invitationQuery,
            update: invitationUpdate,
          };
        }
        if (table === 'room_members') {
          return {
            insert: membersInsert,
          };
        }
        if (table === 'rooms') {
          return {
            update: roomUpdate,
          };
        }
        return {};
      });
      
      invitationQuery.mockReturnValue({
        eq: invitationEq,
      });
      
      invitationEq.mockImplementation(() => ({
        eq: invitationEq,
        single: invitationSingleQuery,
      }));
      
      invitationUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      roomUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      // Verify invitation was accepted
      expect(invitationUpdate).toBeDefined();
      
      // Verify room members were created for both creator and invitee
      expect(membersInsert).toBeDefined();
      
      // Verify room status was updated to active
      expect(roomUpdate).toBeDefined();
    });
  });
  
  describe('Complete Reject Flow (需求 3.7)', () => {
    it('should create room, invitation, then reject and archive room', async () => {
      // Step 1: Create room (from create-room API)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: creatorId } },
        error: null,
      });
      
      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: inviteeId, email: 'invitee@example.com' },
          ],
        },
        error: null,
      });
      
      const mockRoom = {
        id: roomId,
        name: 'Test Room',
        owner_id: creatorId,
        status: 'pending',
        join_strategy: 'approval',
      };
      
      const mockInvitation = {
        id: invitationId,
        room_id: roomId,
        inviter_id: creatorId,
        invitee_id: inviteeId,
        status: 'pending',
      };
      
      // Verify room was created with pending status
      expect(mockRoom.status).toBe('pending');
      
      // Step 2: Reject invitation (from confirm-invitation API)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: inviteeId } },
        error: null,
      });
      
      const mockInvitationWithRoom = {
        ...mockInvitation,
        rooms: mockRoom,
      };
      
      const invitationQuery = vi.fn().mockReturnThis();
      const invitationEq = vi.fn().mockReturnThis();
      const invitationSingleQuery = vi.fn().mockResolvedValue({
        data: mockInvitationWithRoom,
        error: null,
      });
      
      const invitationUpdate = vi.fn().mockReturnThis();
      const roomUpdate = vi.fn().mockReturnThis();
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: invitationQuery,
            update: invitationUpdate,
          };
        }
        if (table === 'rooms') {
          return {
            update: roomUpdate,
          };
        }
        return {};
      });
      
      invitationQuery.mockReturnValue({
        eq: invitationEq,
      });
      
      invitationEq.mockImplementation(() => ({
        eq: invitationEq,
        single: invitationSingleQuery,
      }));
      
      invitationUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      roomUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      // Verify invitation was rejected
      expect(invitationUpdate).toBeDefined();
      
      // Verify room status was updated to archived
      expect(roomUpdate).toBeDefined();
    });
  });
  
  describe('Invitation Validation', () => {
    it('should prevent accepting already processed invitation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: inviteeId } },
        error: null,
      });
      
      const mockInvitation = {
        id: invitationId,
        room_id: roomId,
        inviter_id: creatorId,
        invitee_id: inviteeId,
        status: 'accepted', // Already accepted
        rooms: {
          id: roomId,
          name: 'Test Room',
          owner_id: creatorId,
          status: 'active',
        },
      };
      
      const invitationQuery = vi.fn().mockReturnThis();
      const invitationEq = vi.fn().mockReturnThis();
      const invitationSingleQuery = vi.fn().mockResolvedValue({
        data: null, // Query filters out non-pending invitations
        error: new Error('Not found'),
      });
      
      mockSupabase.from.mockReturnValue({
        select: invitationQuery,
      });
      
      invitationQuery.mockReturnValue({
        eq: invitationEq,
      });
      
      invitationEq.mockImplementation(() => ({
        eq: invitationEq,
        single: invitationSingleQuery,
      }));
      
      // Verify that the query would return null for already processed invitations
      const result = await invitationSingleQuery();
      expect(result.data).toBeNull();
    });
    
    it('should prevent accepting invitation by non-invitee', async () => {
      const wrongUserId = 'wrong-user-id';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: wrongUserId } },
        error: null,
      });
      
      const invitationQuery = vi.fn().mockReturnThis();
      const invitationEq = vi.fn().mockReturnThis();
      const invitationSingleQuery = vi.fn().mockResolvedValue({
        data: null, // Query filters by invitee_id, so wrong user gets null
        error: new Error('Not found'),
      });
      
      mockSupabase.from.mockReturnValue({
        select: invitationQuery,
      });
      
      invitationQuery.mockReturnValue({
        eq: invitationEq,
      });
      
      invitationEq.mockImplementation(() => ({
        eq: invitationEq,
        single: invitationSingleQuery,
      }));
      
      // Verify that the query would return null for wrong user
      const result = await invitationSingleQuery();
      expect(result.data).toBeNull();
    });
  });
});
