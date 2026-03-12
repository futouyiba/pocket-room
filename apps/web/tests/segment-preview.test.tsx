/**
 * Segment Preview Component Tests
 * 
 * Tests for the SegmentPreview component.
 * 
 * Requirements:
 * - 12.4: 展示 Segment 的预览和链接
 * - 12.6: 展示 Segment 元数据（创建者、来源 Room、创建时间）
 * 
 * Design Reference:
 * - SegmentPreview 组件 Props: segment, onClick
 * - 展示 Segment 名称、描述、消息数量
 * - 展示 Segment 元数据（创建者、来源 Room、创建时间）
 * - 点击展开完整内容
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SegmentPreview from '@/components/segments/segment-preview';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'auth.users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  email: 'creator@example.com',
                  raw_user_meta_data: {
                    display_name: 'Test Creator',
                  },
                },
                error: null,
              })),
            })),
          })),
        };
      } else if (table === 'rooms') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  name: 'Test Room',
                },
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    }),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: null },
        error: null,
      })),
    },
  })),
}));

describe('SegmentPreview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSegment = {
    id: 'segment-1',
    name: 'Test Segment',
    description: 'This is a test segment',
    created_by: 'user-1',
    room_id: 'room-1',
    created_at: '2024-01-01T00:00:00Z',
    message_count: 3,
    messages: [
      {
        id: 'msg-1',
        content: 'First message',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
      },
      {
        id: 'msg-2',
        content: 'Second message',
        created_at: '2024-01-01T00:01:00Z',
        user_id: 'user-2',
      },
      {
        id: 'msg-3',
        content: 'Third message',
        created_at: '2024-01-01T00:02:00Z',
        user_id: 'user-1',
      },
    ],
  };

  it('should render segment name and description', () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    expect(screen.getByText('Test Segment')).toBeInTheDocument();
    expect(screen.getByText('This is a test segment')).toBeInTheDocument();
  });

  it('should display message count', () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    expect(screen.getByText('3 条消息')).toBeInTheDocument();
  });

  it('should display creation date', () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    // Check for date in Chinese format
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('should expand and show messages when clicked', () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    // Initially, messages should not be visible
    expect(screen.queryByText('First message')).not.toBeInTheDocument();
    
    // Click to expand
    const previewHeader = screen.getByText('Test Segment').closest('div');
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    
    // Messages should now be visible
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Third message')).toBeInTheDocument();
  });

  it('should collapse messages when clicked again', () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    const previewHeader = screen.getByText('Test Segment').closest('div');
    
    // Expand
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    expect(screen.getByText('First message')).toBeInTheDocument();
    
    // Collapse
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    expect(screen.queryByText('First message')).not.toBeInTheDocument();
  });

  it('should call onClick callback when provided', () => {
    const onClickMock = vi.fn();
    render(<SegmentPreview segment={mockSegment} onClick={onClickMock} />);
    
    const previewHeader = screen.getByText('Test Segment').closest('div');
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });

  it('should handle segment without description', () => {
    const segmentWithoutDescription = {
      ...mockSegment,
      description: undefined,
    };
    
    render(<SegmentPreview segment={segmentWithoutDescription} />);
    
    expect(screen.getByText('Test Segment')).toBeInTheDocument();
    expect(screen.queryByText('This is a test segment')).not.toBeInTheDocument();
  });

  it('should handle segment without messages', () => {
    const segmentWithoutMessages = {
      ...mockSegment,
      messages: undefined,
    };
    
    render(<SegmentPreview segment={segmentWithoutMessages} />);
    
    // Expand
    const previewHeader = screen.getByText('Test Segment').closest('div');
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    
    // Should show loading state
    expect(screen.getByText('加载消息中...')).toBeInTheDocument();
  });

  it('should handle segment with empty messages array', () => {
    const segmentWithEmptyMessages = {
      ...mockSegment,
      messages: [],
    };
    
    render(<SegmentPreview segment={segmentWithEmptyMessages} />);
    
    // Expand
    const previewHeader = screen.getByText('Test Segment').closest('div');
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    
    // Should show empty state
    expect(screen.getByText('该 Segment 暂无消息')).toBeInTheDocument();
  });

  it('should display message order numbers', () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    // Expand
    const previewHeader = screen.getByText('Test Segment').closest('div');
    if (previewHeader) {
      fireEvent.click(previewHeader);
    }
    
    // Check for order numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should use message_count when messages array is not provided', () => {
    const segmentWithCountOnly = {
      id: 'segment-2',
      name: 'Another Segment',
      created_by: 'user-1',
      room_id: 'room-1',
      created_at: '2024-01-01T00:00:00Z',
      message_count: 5,
    };
    
    render(<SegmentPreview segment={segmentWithCountOnly} />);
    
    expect(screen.getByText('5 条消息')).toBeInTheDocument();
  });

  // Requirement 12.6: Display Segment metadata (creator, source room, creation time)
  it('should display creator name from metadata', async () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    // Wait for metadata to load
    await waitFor(() => {
      expect(screen.getByText('Test Creator')).toBeInTheDocument();
    });
  });

  it('should display source room name from metadata', async () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    // Wait for metadata to load
    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });
  });

  it('should display all metadata fields together', async () => {
    render(<SegmentPreview segment={mockSegment} />);
    
    // Wait for metadata to load
    await waitFor(() => {
      // Creator
      expect(screen.getByText('Test Creator')).toBeInTheDocument();
      // Room
      expect(screen.getByText('Test Room')).toBeInTheDocument();
      // Message count
      expect(screen.getByText('3 条消息')).toBeInTheDocument();
      // Creation date
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });
  });
});
