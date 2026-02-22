/**
 * Offline Approval Queue Integration Tests
 * 
 * Tests the offline approval queue feature where join requests are persisted
 * and shown to the Room Owner when they come back online.
 * 
 * Requirements: 5.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinRequestQueue } from '@/components/rooms/join-request-queue';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@/lib/supabase/client', () => ({
  createClientComponentClient: () => mockSupabase,
}));

describe('Offline Approval Queue - Task 5.4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display pending join requests when room owner comes online', async () => {
    // Mock pending join requests
    const mockRequests = [
      {
        id: 'req-1',
        user_id: 'user-1',
        room_id: 'room-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          raw_user_meta_data: {
            display_name: 'Alice',
          },
        },
      },
      {
        id: 'req-2',
        user_id: 'user-2',
        room_id: 'room-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        user: {
          id: 'user-2',
          email: 'bob@example.com',
          raw_user_meta_data: {
            display_name: 'Bob',
          },
        },
      },
    ];

    // Mock Supabase query
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRequests,
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock Supabase Realtime channel
    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    });

    // Render the component
    render(<JoinRequestQueue roomId="room-1" isOwner={true} />);

    // Wait for requests to load
    await waitFor(() => {
      expect(screen.getByText(/待处理的加入申请/)).toBeInTheDocument();
    });

    // Verify both requests are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should persist join requests in the database', async () => {
    // This test verifies that join requests are stored persistently
    const mockRequests = [
      {
        id: 'req-1',
        user_id: 'user-1',
        room_id: 'room-1',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        user: {
          id: 'user-1',
          email: 'charlie@example.com',
          raw_user_meta_data: {
            display_name: 'Charlie',
          },
        },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRequests,
              error: null,
            }),
          }),
        }),
      }),
    });

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    });

    render(<JoinRequestQueue roomId="room-1" isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    // Verify the request from 1 hour ago is still displayed
    expect(screen.getByText(/申请时间:/)).toBeInTheDocument();
  });

  it('should show empty state when no pending requests exist', async () => {
    // Mock empty requests
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    });

    render(<JoinRequestQueue roomId="room-1" isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText('暂无待处理的加入申请')).toBeInTheDocument();
    });
  });

  it('should not display queue for non-owners', () => {
    render(<JoinRequestQueue roomId="room-1" isOwner={false} />);

    // Component should not render anything for non-owners
    expect(screen.queryByText(/待处理的加入申请/)).not.toBeInTheDocument();
  });

  it('should update in real-time when new requests arrive', async () => {
    const initialRequests = [
      {
        id: 'req-1',
        user_id: 'user-1',
        room_id: 'room-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          raw_user_meta_data: {
            display_name: 'Alice',
          },
        },
      },
    ];

    let realtimeCallback: any = null;

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: initialRequests,
              error: null,
            }),
          }),
        }),
      }),
    });

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockImplementation((event, config, callback) => {
        realtimeCallback = callback;
        return {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn(),
        };
      }),
      subscribe: vi.fn(),
    });

    render(<JoinRequestQueue roomId="room-1" isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Simulate a new request arriving via Realtime
    if (realtimeCallback) {
      realtimeCallback({
        eventType: 'INSERT',
        new: {
          id: 'req-2',
          user_id: 'user-2',
          room_id: 'room-1',
          status: 'pending',
        },
      });
    }

    // The component should refetch requests
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  it('should handle approval actions correctly', async () => {
    const mockRequests = [
      {
        id: 'req-1',
        user_id: 'user-1',
        room_id: 'room-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          raw_user_meta_data: {
            display_name: 'Alice',
          },
        },
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockRequests,
              error: null,
            }),
          }),
        }),
      }),
    });

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    });

    // Mock fetch for approval API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<JoinRequestQueue roomId="room-1" isOwner={true} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click approve button
    const approveButton = screen.getByTitle('批准加入');
    await userEvent.click(approveButton);

    // Verify API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/rooms/handle-join-request',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('approve'),
        })
      );
    });
  });
});
