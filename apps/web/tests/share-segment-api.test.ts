/**
 * Share Segment API Tests
 * 
 * Tests for the share-segment API endpoint.
 * 
 * Requirements:
 * - 12.4: Room Member 将 Segment 分享到 Room 时，以消息形式在 Room 中展示 Segment 的预览和链接
 * - 12.5: Room Member 将 Segment 通过私信分享时，将 Segment 发送给指定用户
 * 
 * Design Reference:
 * - Edge Function: share-segment
 * - 输入: { segment_id, target_type: 'room' | 'dm', target_id }
 * - 输出: { success: boolean }
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: () => mockSupabase,
}));

describe('Share Segment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/segments/share', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const { POST } = await import('@/app/api/segments/share/route');
      const request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId: 'segment-1',
          targetType: 'room',
          targetId: 'room-1',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('用户未登录');
    });

    it('should validate required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const { POST } = await import('@/app/api/segments/share/route');

      // Missing segmentId
      let request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'room',
          targetId: 'room-1',
        }),
      });

      let response = await POST(request as any);
      let data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Segment ID 不能为空');

      // Invalid targetType
      request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId: 'segment-1',
          targetType: 'invalid',
          targetId: 'room-1',
        }),
      });

      response = await POST(request as any);
      data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Target type 必须是 room 或 dm');

      // Missing targetId
      request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId: 'segment-1',
          targetType: 'room',
        }),
      });

      response = await POST(request as any);
      data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Target ID 不能为空');
    });

    it('should verify segment exists and user has access', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      // Segment not found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/segments/share/route');
      const request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId: 'segment-1',
          targetType: 'room',
          targetId: 'room-1',
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Segment 不存在');
    });

    it('should create segment_share message when sharing to room', async () => {
      const userId = 'user-1';
      const segmentId = 'segment-1';
      const roomId = 'room-1';
      const messageId = 'message-1';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        
        if (table === 'segments' && callCount === 1) {
          // First call: get segment
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: segmentId,
                    name: 'Test Segment',
                    description: 'Test description',
                    room_id: 'source-room-1',
                    created_by: userId,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'room_members' && callCount === 2) {
          // Second call: check source room membership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: userId, room_id: 'source-room-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        
        if (table === 'room_members' && callCount === 3) {
          // Third call: check target room membership
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { user_id: userId, room_id: roomId },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        
        if (table === 'messages') {
          // Fourth call: create message
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: messageId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'segments' && callCount === 5) {
          // Fifth call: update segment
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      });

      const { POST } = await import('@/app/api/segments/share/route');
      const request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId,
          targetType: 'room',
          targetId: roomId,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe(messageId);
    });

    it('should create DM record when sharing via DM (Sprint 1 simplified)', async () => {
      const userId = 'user-1';
      const segmentId = 'segment-1';
      const targetUserId = 'user-2';
      const dmId = 'dm-1';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        
        if (table === 'segments' && callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: segmentId,
                    name: 'Test Segment',
                    room_id: 'source-room-1',
                    created_by: userId,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: userId, room_id: 'source-room-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        
        if (table === 'direct_messages') {
          // Create DM record
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: dmId },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      });

      const { POST } = await import('@/app/api/segments/share/route');
      const request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId,
          targetType: 'dm',
          targetId: targetUserId,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe(dmId);
    });

    it('should verify user is member of target room', async () => {
      const userId = 'user-1';
      const segmentId = 'segment-1';
      const roomId = 'room-1';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        
        if (table === 'segments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: segmentId,
                    name: 'Test Segment',
                    room_id: 'source-room-1',
                    created_by: userId,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'room_members' && callCount === 2) {
          // Source room membership check
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: userId, room_id: 'source-room-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        
        if (table === 'room_members' && callCount === 3) {
          // Target room membership check - user is not a member
          return {
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
          };
        }
        
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      });

      const { POST } = await import('@/app/api/segments/share/route');
      const request = new Request('http://localhost/api/segments/share', {
        method: 'POST',
        body: JSON.stringify({
          segmentId,
          targetType: 'room',
          targetId: roomId,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('您不是目标 Room 的成员');
    });
  });
});
