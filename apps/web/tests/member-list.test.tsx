/**
 * Member List Component Tests
 * 
 * Tests for the member list display functionality.
 * Requirements: 4.2, 7.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemberList } from '@/components/rooms/member-list';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('MemberList Component', () => {
  const mockRoomId = 'test-room-id';
  const mockCurrentUserId = 'current-user-id';

  const mockMembers = [
    {
      user_id: 'user-1',
      role: 'owner',
      joined_at: '2024-01-01T00:00:00Z',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        raw_user_meta_data: {
          display_name: 'Room Owner',
          avatar_url: 'https://example.com/avatar1.jpg',
        },
      },
    },
    {
      user_id: mockCurrentUserId,
      role: 'member',
      joined_at: '2024-01-02T00:00:00Z',
      user: {
        id: mockCurrentUserId,
        email: 'current@example.com',
        raw_user_meta_data: {
          display_name: 'Current User',
          avatar_url: 'https://example.com/avatar2.jpg',
        },
      },
    },
    {
      user_id: 'user-3',
      role: 'member',
      joined_at: '2024-01-03T00:00:00Z',
      user: {
        id: 'user-3',
        email: 'member@example.com',
        raw_user_meta_data: {
          display_name: 'Another Member',
        },
      },
    },
  ];

  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      is: vi.fn(() => mockSupabase),
      order: vi.fn(() => Promise.resolve({ data: mockMembers, error: null })),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
      })),
      removeChannel: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  it('should display loading state initially', () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);
    
    expect(screen.getByText('Loading members...')).toBeInTheDocument();
  });

  it('should fetch and display room members', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    // Wait for members to load
    await waitFor(() => {
      expect(screen.getByText('Members (3)')).toBeInTheDocument();
    });

    // Check that all members are displayed
    expect(screen.getByText('Room Owner')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument(); // Current user
    expect(screen.getByText('Another Member')).toBeInTheDocument();
  });

  it('should display owner badge for room owner', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });
  });

  it('should display member avatars', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      const avatars = screen.getAllByRole('img');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  it('should display fallback avatar for users without avatar_url', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      // User 3 doesn't have an avatar_url, so should show initial
      expect(screen.getByText('A')).toBeInTheDocument(); // First letter of "Another Member"
    });
  });

  it('should display joined date for each member', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      const joinedTexts = screen.getAllByText(/Joined/);
      expect(joinedTexts.length).toBe(3);
    });
  });

  it('should handle empty member list', async () => {
    mockSupabase.order = vi.fn(() => Promise.resolve({ data: [], error: null }));

    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('No members yet')).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    mockSupabase.order = vi.fn(() => 
      Promise.resolve({ data: null, error: { message: 'Database error' } })
    );

    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      // Should show empty state or error state
      expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });
  });

  it('should query only active members (left_at IS NULL)', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(mockSupabase.is).toHaveBeenCalledWith('left_at', null);
    });
  });

  it('should order members by joined_at ascending', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(mockSupabase.order).toHaveBeenCalledWith('joined_at', { ascending: true });
    });
  });

  it('should subscribe to real-time member changes', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith(`room_members:${mockRoomId}`);
    });
  });

  it('should display online status indicator', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      // Check for online status indicators (currently all offline in mock)
      const statusIndicators = document.querySelectorAll('.bg-gray-300');
      expect(statusIndicators.length).toBeGreaterThan(0);
    });
  });

  it('should use display_name from user_metadata when available', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('Room Owner')).toBeInTheDocument();
      expect(screen.getByText('Another Member')).toBeInTheDocument();
    });
  });

  it('should fallback to email when display_name is not available', async () => {
    const membersWithoutDisplayName = [
      {
        user_id: 'user-1',
        role: 'member',
        joined_at: '2024-01-01T00:00:00Z',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          raw_user_meta_data: {},
        },
      },
    ];

    mockSupabase.order = vi.fn(() => 
      Promise.resolve({ data: membersWithoutDisplayName, error: null })
    );

    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display "You" for current user instead of their display name', async () => {
    render(<MemberList roomId={mockRoomId} currentUserId={mockCurrentUserId} />);

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
      // Should not show the actual display name for current user
      expect(screen.queryByText('Current User')).not.toBeInTheDocument();
    });
  });
});
