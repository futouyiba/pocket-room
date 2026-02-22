/**
 * Send Message API Tests
 * 
 * Tests the /api/messages/send endpoint for sending messages to rooms.
 * 
 * Requirements:
 * - 8.1: Room Member 发送消息时，通过 Supabase Realtime 将消息实时推送给该 Room 的所有在线 Room Member
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock functions that will be reused
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock logger
vi.mock('@/lib/provider-binding/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('Send Message API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Validation', () => {
    it('should reject request without roomId', async () => {
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test message',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Room ID 不能为空');
    });
    
    it('should reject request without content', async () => {
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('消息内容不能为空');
    });
    
    it('should reject request with empty content', async () => {
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: '   ',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('消息内容不能为空');
    });
  });
  
  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });
      
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: 'Test message',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('用户未登录');
    });
  });
  
  describe('Authorization', () => {
    it('should reject if user is not a room member', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Not found'),
                }),
              }),
            }),
          }),
        }),
      });
      
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: 'Test message',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.error).toBe('您不是该 Room 的成员');
    });
  });
  
  describe('Message Creation', () => {
    it('should successfully send a text message', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      const mockMembership = {
        room_id: 'room-123',
        user_id: 'user-123',
        joined_at: new Date().toISOString(),
        left_at: null,
      };
      
      const mockMessage = {
        id: 'message-123',
      };
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockMembership,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'messages') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockMessage,
                  error: null,
                }),
              }),
            }),
          };
        }
      });
      
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: 'Test message',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.messageId).toBe('message-123');
    });
    
    it('should successfully send a message with attachments', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      const mockMembership = {
        room_id: 'room-123',
        user_id: 'user-123',
        joined_at: new Date().toISOString(),
        left_at: null,
      };
      
      const mockMessage = {
        id: 'message-456',
      };
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockMembership,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'messages') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockMessage,
                  error: null,
                }),
              }),
            }),
          };
        }
      });
      
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: 'Message with image',
          attachments: ['https://storage.supabase.co/image1.jpg'],
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.messageId).toBe('message-456');
    });
    
    it('should handle database insertion errors', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      const mockMembership = {
        room_id: 'room-123',
        user_id: 'user-123',
        joined_at: new Date().toISOString(),
        left_at: null,
      };
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockMembership,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'messages') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Database error'),
                }),
              }),
            }),
          };
        }
      });
      
      const { POST } = await import('@/app/api/messages/send/route');
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: 'Test message',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('发送消息失败');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle Markdown content', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      
      const mockMembership = {
        room_id: 'room-123',
        user_id: 'user-123',
        joined_at: new Date().toISOString(),
        left_at: null,
      };
      
      const mockMessage = {
        id: 'message-md',
      };
      
      mockFrom.mockImplementation((table: string) => {
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockMembership,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'messages') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockMessage,
                  error: null,
                }),
              }),
            }),
          };
        }
      });
      
      const { POST } = await import('@/app/api/messages/send/route');
      
      const markdownContent = '# Heading\n\n**Bold** and *italic*\n\n```js\nconst x = 1;\n```';
      
      const request = new NextRequest('http://localhost:3000/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: 'room-123',
          content: markdownContent,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.messageId).toBe('message-md');
    });
  });
});
