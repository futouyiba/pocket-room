/**
 * Room List Page Unit Tests
 * 
 * Tests for the Room list page component that displays all active rooms.
 * 
 * Requirements tested:
 * - 4.1: Display all active rooms
 * - 4.2: Show room name, description, and active member count
 * - 4.3: Hide description for passcode rooms, show lock icon
 * - 4.4: Realtime updates for active member counts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RoomsPage from '@/app/rooms/page'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

// Mock CreateRoomDialog component
vi.mock('@/components/rooms/create-room-dialog', () => ({
  CreateRoomDialog: ({ open, onOpenChange, onSuccess }: any) => (
    <div data-testid="create-room-dialog" data-open={open}>
      Mock Create Room Dialog
    </div>
  )
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Lock: ({ className, 'data-testid': testId }: any) => (
    <span className={className} data-testid={testId}>🔒</span>
  ),
  Users: ({ className }: any) => <span className={className}>👥</span>
}))

describe('RoomsPage', () => {
  let mockSupabase: any
  let mockChannel: any

  beforeEach(() => {
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }

    mockSupabase = {
      from: vi.fn(),
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn()
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Setup mock to delay response
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: null,
              error: null
            })
          })
        })
      })

      render(<RoomsPage />)
      expect(screen.getByText('Loading rooms...')).toBeInTheDocument()
    })
  })

  describe('Active Rooms Display', () => {
    it('should display all active rooms with name, description, and member count', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Product Design',
          description: 'Discussing the new UX flow',
          join_strategy: 'approval',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'room-2',
          name: 'Engineering Sync',
          description: 'Weekly sync for the dev team',
          join_strategy: 'free',
          status: 'active',
          created_at: '2024-01-02T00:00:00Z'
        }
      ]

      // Mock rooms query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        // Mock room_members count query
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 3,
                  error: null
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Product Design')).toBeInTheDocument()
        expect(screen.getByText('Engineering Sync')).toBeInTheDocument()
      })

      expect(screen.getByText('Discussing the new UX flow')).toBeInTheDocument()
      expect(screen.getByText('Weekly sync for the dev team')).toBeInTheDocument()
    })

    it('should only display rooms with status "active"', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Active Room',
          description: 'This is active',
          join_strategy: 'approval',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((field: string, value: string) => {
                // Verify that we're filtering by status = 'active'
                expect(field).toBe('status')
                expect(value).toBe('active')
                return {
                  order: vi.fn().mockResolvedValue({
                    data: mockRooms,
                    error: null
                  })
                }
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 1,
                  error: null
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Active Room')).toBeInTheDocument()
      })
    })
  })

  describe('Passcode Room Privacy', () => {
    it('should hide description for passcode rooms and show lock icon', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Secret Room',
          description: 'This should be hidden',
          join_strategy: 'passcode',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 2,
                  error: null
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Secret Room')).toBeInTheDocument()
      })

      // Description should be hidden
      expect(screen.queryByText('This should be hidden')).not.toBeInTheDocument()
      
      // Lock icon should be visible
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
      
      // Should show password protected message
      expect(screen.getByText('Password protected room')).toBeInTheDocument()
    })

    it('should show description for non-passcode rooms', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Open Room',
          description: 'This should be visible',
          join_strategy: 'free',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 1,
                  error: null
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Open Room')).toBeInTheDocument()
      })

      // Description should be visible
      expect(screen.getByText('This should be visible')).toBeInTheDocument()
      
      // Lock icon should not be visible
      expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument()
    })
  })

  describe('Active Member Count', () => {
    it('should display active member count for each room', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Room 1',
          description: 'Test room',
          join_strategy: 'approval',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 5,
                  error: null
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      // Should display member count
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should only count active members (left_at is null)', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Room 1',
          description: 'Test room',
          join_strategy: 'approval',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockImplementation((field: string, value: null) => {
                  // Verify that we're filtering by left_at IS NULL
                  expect(field).toBe('left_at')
                  expect(value).toBeNull()
                  return Promise.resolve({
                    count: 3,
                    error: null
                  })
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })
    })
  })

  describe('Realtime Updates', () => {
    it('should subscribe to room_members changes for realtime updates', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Room 1',
          description: 'Test room',
          join_strategy: 'approval',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 2,
                  error: null
                })
              })
            })
          }
        }
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      // Verify that channel was created
      expect(mockSupabase.channel).toHaveBeenCalledWith('room_members_changes')
      
      // Verify that we subscribed to postgres_changes
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members'
        },
        expect.any(Function)
      )
      
      // Verify that subscribe was called
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should cleanup subscription on unmount', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Room 1',
          description: 'Test room',
          join_strategy: 'approval',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockRooms,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'room_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  count: 1,
                  error: null
                })
              })
            })
          }
        }
      })

      const { unmount } = render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Room 1')).toBeInTheDocument()
      })

      unmount()

      // Verify that channel was removed
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetching rooms fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load rooms. Please try again.')).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no rooms exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      render(<RoomsPage />)

      await waitFor(() => {
        expect(screen.getByText('No active rooms yet.')).toBeInTheDocument()
      })

      expect(screen.getByText('Create the first room')).toBeInTheDocument()
    })
  })
})
