/**
 * Basket Page Tests
 * 
 * Tests for the Basket page functionality.
 * 
 * Requirements:
 * - Task 8.5: 创建 Basket 页面 (`/basket`)
 * - Task 8.5: 展示草稿 Segment 列表（`is_draft = true`）
 * - Task 8.5: 实现 Segment 整理和编辑功能
 * - Task 8.5: 实现从 Basket 分享到 Room 或私信
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BasketPage from '@/app/basket/page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  removeChannel: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// Mock logger
vi.mock('@/lib/provider-binding/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock ShareSegmentDialog component
vi.mock('@/components/segments/share-segment-dialog', () => ({
  default: ({ isOpen, segmentName }: any) => 
    isOpen ? <div data-testid="share-dialog">Share {segmentName}</div> : null,
}));

describe('BasketPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    // Mock segments query - delay response
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(
              new Promise(() => {}) // Never resolves to keep loading state
            ),
          }),
        }),
      }),
    });

    render(<BasketPage />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should display empty state when no draft segments exist', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    // Mock empty segments query
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'segments') {
        return {
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
        };
      }
      // For room_members query
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    render(<BasketPage />);

    await waitFor(() => {
      expect(screen.getByText('收集篮是空的')).toBeInTheDocument();
    });

    expect(screen.getByText(/您还没有任何草稿 Segment/)).toBeInTheDocument();
  });

  it('should display draft segments when they exist', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    // Mock segments with draft data
    const mockDraftSegments = [
      {
        id: 'segment-1',
        name: 'Draft Segment 1',
        description: 'Test description',
        source_url: 'https://example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        segment_messages: [{ message_id: 'msg-1' }, { message_id: 'msg-2' }],
      },
      {
        id: 'segment-2',
        name: 'Draft Segment 2',
        description: null,
        source_url: null,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        segment_messages: [{ message_id: 'msg-3' }],
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'segments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockDraftSegments,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      // For room_members query
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    render(<BasketPage />);

    await waitFor(() => {
      expect(screen.getByText('Draft Segment 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Draft Segment 2')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('2 条消息')).toBeInTheDocument();
    expect(screen.getByText('1 条消息')).toBeInTheDocument();
  });

  it('should display error message when fetching segments fails', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    // Mock segments query error
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'segments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    render(<BasketPage />);

    await waitFor(() => {
      expect(screen.getByText('加载草稿失败')).toBeInTheDocument();
    });
  });

  it('should have edit, share, and delete buttons for each segment', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null,
    });

    // Mock segments with one draft
    const mockDraftSegments = [
      {
        id: 'segment-1',
        name: 'Draft Segment 1',
        description: 'Test description',
        source_url: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        segment_messages: [{ message_id: 'msg-1' }],
      },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'segments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockDraftSegments,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    render(<BasketPage />);

    await waitFor(() => {
      expect(screen.getByText('Draft Segment 1')).toBeInTheDocument();
    });

    // Check for action buttons
    expect(screen.getByRole('button', { name: /编辑/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /分享/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除/i })).toBeInTheDocument();
  });
});
