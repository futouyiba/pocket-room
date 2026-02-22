/**
 * Invitation Confirmation API Tests
 * 
 * Tests the /api/invitations/confirm endpoint.
 * Requirements: 3.5, 3.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/invitations/confirm/route';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
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

describe('Invitation Confirmation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Input Validation', () => {
    it('should reject request without invitationId', async () => {
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({ accept: true }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('邀请 ID 不能为空');
    });
    
    it('should reject request without accept field', async () => {
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({ invitationId: 'test-id' }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('必须指定接受或拒绝');
    });
    
    it('should reject request with non-boolean accept', async () => {
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({ invitationId: 'test-id', accept: 'yes' }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('必须指定接受或拒绝');
    });
  });
  
  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({
          invitationId: 'test-id',
          accept: true,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toContain('用户未登录');
    });
  });
  
  describe('Accept Invitation (需求 3.5)', () => {
    it('should accept invitation and create room members', async () => {
      const userId = 'invitee-id';
      const ownerId = 'owner-id';
      const roomId = 'room-id';
      const invitationId = 'invitation-id';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockInvitation = {
        id: invitationId,
        room_id: roomId,
        inviter_id: ownerId,
        invitee_id: userId,
        status: 'pending',
        rooms: {
          id: roomId,
          name: 'Test Room',
          owner_id: ownerId,
          status: 'pending',
        },
      };
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockInvitation,
        error: null,
      });
      
      const mockUpdate = vi.fn().mockReturnThis();
      const mockInsert = vi.fn().mockReturnThis();
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        if (table === 'room_members') {
          return {
            insert: mockInsert,
          };
        }
        if (table === 'rooms') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });
      
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      
      mockEq.mockImplementation(() => ({
        eq: mockEq,
        single: mockSingle,
      }));
      
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      mockInsert.mockResolvedValue({ error: null });
      
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({
          invitationId,
          accept: true,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.roomId).toBe(roomId);
      expect(data.message).toContain('成功加入');
    });
  });
  
  describe('Reject Invitation (需求 3.7)', () => {
    it('should reject invitation and archive room', async () => {
      const userId = 'invitee-id';
      const ownerId = 'owner-id';
      const roomId = 'room-id';
      const invitationId = 'invitation-id';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockInvitation = {
        id: invitationId,
        room_id: roomId,
        inviter_id: ownerId,
        invitee_id: userId,
        status: 'pending',
        rooms: {
          id: roomId,
          name: 'Test Room',
          owner_id: ownerId,
          status: 'pending',
        },
      };
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockInvitation,
        error: null,
      });
      
      const mockUpdate = vi.fn().mockReturnThis();
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        if (table === 'rooms') {
          return {
            update: mockUpdate,
          };
        }
        return {};
      });
      
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      
      mockEq.mockImplementation(() => ({
        eq: mockEq,
        single: mockSingle,
      }));
      
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({
          invitationId,
          accept: false,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('已拒绝邀请');
    });
  });
  
  describe('Error Handling', () => {
    it('should return 404 for non-existent invitation', async () => {
      const userId = 'invitee-id';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });
      
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      
      mockEq.mockImplementation(() => ({
        eq: mockEq,
        single: mockSingle,
      }));
      
      const request = new NextRequest('http://localhost/api/invitations/confirm', {
        method: 'POST',
        body: JSON.stringify({
          invitationId: 'non-existent-id',
          accept: true,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toContain('邀请不存在或已被处理');
    });
  });
});
