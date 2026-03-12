/**
 * Tests for Room Creation API
 * 
 * Tests the /api/rooms/create endpoint for:
 * - Server-side validation
 * - Room creation with pending status
 * - Invitation record creation
 * - Error handling
 * 
 * Validates requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock functions that will be reused
const mockGetUser = vi.fn();
const mockListUsers = vi.fn();

// Separate mock chains for rooms table
const roomsMockInsert = vi.fn();
const roomsMockSelect = vi.fn();
const roomsMockSingle = vi.fn();
const roomsMockDelete = vi.fn();
const roomsMockEq = vi.fn();

// Separate mock chains for invitations table
const invitationsMockInsert = vi.fn();
const invitationsMockSelect = vi.fn();

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      admin: {
        listUsers: mockListUsers,
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'rooms') {
        return {
          insert: roomsMockInsert,
          delete: () => ({
            eq: roomsMockEq,
          }),
          select: roomsMockSelect,
        };
      } else if (table === 'invitations') {
        return {
          insert: invitationsMockInsert,
          select: invitationsMockSelect,
        };
      }
      return {};
    }),
  })),
}));

// Mock logger
vi.mock('@/lib/provider-binding/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Room Creation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up rooms table mock chain
    roomsMockSingle.mockResolvedValue({ data: null, error: null });
    roomsMockSelect.mockReturnValue({ single: roomsMockSingle });
    roomsMockInsert.mockReturnValue({ select: roomsMockSelect });
    roomsMockEq.mockResolvedValue({ error: null });
    
    // Set up invitations table mock chain
    invitationsMockSelect.mockResolvedValue({ data: [], error: null });
    invitationsMockInsert.mockReturnValue({ select: invitationsMockSelect });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject request without room name (需求 3.1)', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          joinStrategy: 'approval',
          inviteeEmails: ['user@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('名称');
    });

    it('should reject request without join strategy (需求 3.2)', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          inviteeEmails: ['user@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('加入策略');
    });

    it('should reject request with invalid join strategy', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'invalid',
          inviteeEmails: ['user@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('加入策略');
    });

    it('should reject request without invitees (需求 3.1)', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('至少一名用户');
    });

    it('should reject passcode strategy without password (需求 3.3)', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'passcode',
          inviteeEmails: ['user@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('密码');
    });

    it('should reject invalid email format', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['invalid-email'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('邮箱');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['user@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('未登录');
    });
  });

  describe('Room Creation', () => {
    it('should create room with pending status', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' };
      const mockRoom = {
        id: 'room-123',
        name: 'Test Room',
        status: 'pending',
        owner_id: mockUser.id,
      };
      
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'invitee-123', email: 'invitee@example.com' },
          ],
        },
        error: null,
      });
      
      roomsMockSingle.mockResolvedValue({
        data: mockRoom,
        error: null,
      });
      
      invitationsMockSelect.mockResolvedValue({
        data: [
          { id: 'inv-1', invitee_id: 'invitee-123', status: 'pending' },
        ],
        error: null,
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['invitee@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.roomId).toBe('room-123');
      expect(roomsMockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          name: 'Test Room',
          join_strategy: 'approval',
        })
      );
    });

    it('should hash password for passcode strategy', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' };
      const mockRoom = {
        id: 'room-123',
        name: 'Test Room',
        status: 'pending',
        owner_id: mockUser.id,
      };
      
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'invitee-123', email: 'invitee@example.com' },
          ],
        },
        error: null,
      });
      
      roomsMockSingle.mockResolvedValue({
        data: mockRoom,
        error: null,
      });
      
      invitationsMockSelect.mockResolvedValue({
        data: [
          { id: 'inv-1', invitee_id: 'invitee-123', status: 'pending' },
        ],
        error: null,
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'passcode',
          passcode: 'secret123',
          inviteeEmails: ['invitee@example.com'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(roomsMockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          passcode_hash: expect.stringMatching(/^\$2[aby]\$\d+\$/), // bcrypt hash pattern
        })
      );
    });
  });

  describe('Invitation Creation', () => {
    it('should create invitations for all found invitees', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' };
      const mockRoom = {
        id: 'room-123',
        name: 'Test Room',
        status: 'pending',
        owner_id: mockUser.id,
      };
      
      const mockInvitees = [
        { id: 'invitee-1', email: 'user1@example.com' },
        { id: 'invitee-2', email: 'user2@example.com' },
      ];
      
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      mockListUsers.mockResolvedValue({
        data: { users: mockInvitees },
        error: null,
      });
      
      roomsMockSingle.mockResolvedValue({
        data: mockRoom,
        error: null,
      });
      
      invitationsMockSelect.mockResolvedValue({
        data: [
          { id: 'inv-1', invitee_id: 'invitee-1', status: 'pending' },
          { id: 'inv-2', invitee_id: 'invitee-2', status: 'pending' },
        ],
        error: null,
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['user1@example.com', 'user2@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitations).toHaveLength(2);
      expect(invitationsMockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          room_id: 'room-123',
          inviter_id: 'user-123',
          invitee_id: 'invitee-1',
          status: 'pending',
        }),
        expect.objectContaining({
          room_id: 'room-123',
          inviter_id: 'user-123',
          invitee_id: 'invitee-2',
          status: 'pending',
        }),
      ]);
    });

    it('should return warning for not found invitees', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' };
      const mockRoom = {
        id: 'room-123',
        name: 'Test Room',
        status: 'pending',
        owner_id: mockUser.id,
      };
      
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      // Only one of two invitees found
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'invitee-1', email: 'found@example.com' },
          ],
        },
        error: null,
      });
      
      roomsMockSingle.mockResolvedValue({
        data: mockRoom,
        error: null,
      });
      
      invitationsMockSelect.mockResolvedValue({
        data: [
          { id: 'inv-1', invitee_id: 'invitee-1', status: 'pending' },
        ],
        error: null,
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['found@example.com', 'notfound@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.warning).toContain('notfound@example.com');
      expect(data.invitations).toHaveLength(1);
    });

    it('should rollback room creation if no invitees found', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' };
      const mockRoom = {
        id: 'room-123',
        name: 'Test Room',
        status: 'pending',
        owner_id: mockUser.id,
      };
      
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      mockListUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });
      
      roomsMockSingle.mockResolvedValue({
        data: mockRoom,
        error: null,
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['notfound@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('未找到');
      expect(roomsMockEq).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' };
      
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      roomsMockSingle.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Room',
          joinStrategy: 'approval',
          inviteeEmails: ['user@example.com'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors', async () => {
      const { POST } = await import('@/app/api/rooms/create/route');
      
      const request = new NextRequest('http://localhost/api/rooms/create', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('服务器内部错误');
    });
  });
});
