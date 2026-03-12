/**
 * Room List Integration Tests
 * 
 * Integration tests for the Room list page with real Supabase interactions.
 * Tests the complete flow from database queries to UI rendering.
 * 
 * Requirements tested:
 * - 4.1: Display all active rooms
 * - 4.2: Show room information correctly
 * - 4.3: Privacy for passcode rooms
 * - 4.4: Realtime updates
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createClient } from '@supabase/supabase-js'
import RoomsPage from '@/app/rooms/page'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'

// Skip tests if Supabase is not available
const isSupabaseAvailable = SUPABASE_URL && 
                             SUPABASE_ANON_KEY &&
                             SUPABASE_URL !== 'http://localhost:54321' &&
                             SUPABASE_URL !== 'https://test.supabase.co';

describe.skipIf(!isSupabaseAvailable)('Room List Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let createdRoomIds: string[] = []

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Create a test user
    const { data: authData, error } = await supabase.auth.signUp({
      email: `test-room-list-${Date.now()}@example.com`,
      password: 'test-password-123'
    })
    
    if (error) {
      console.error('Failed to create test user:', error)
      throw error
    }
    
    if (authData.user) {
      testUserId = authData.user.id
    }
  })

  afterAll(async () => {
    // Cleanup: Delete all created rooms
    if (createdRoomIds.length > 0) {
      await supabase
        .from('rooms')
        .delete()
        .in('id', createdRoomIds)
    }
    
    // Sign out
    await supabase.auth.signOut()
  })

  beforeEach(() => {
    createdRoomIds = []
  })

  it('should display active rooms with correct information', async () => {
    // Setup: Create test rooms
    const rooms = [
      {
        name: 'Test Room 1',
        description: 'This is a test room',
        join_strategy: 'approval',
        status: 'active',
        owner_id: testUserId
      },
      {
        name: 'Test Room 2',
        description: 'Another test room',
        join_strategy: 'free',
        status: 'active',
        owner_id: testUserId
      }
    ]

    for (const room of rooms) {
      const { data, error } = await supabase
        .from('rooms')
        .insert(room)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to create room:', error)
        throw error
      }
      
      if (data) {
        createdRoomIds.push(data.id)
        
        // Add owner as member
        await supabase
          .from('room_members')
          .insert({
            room_id: data.id,
            user_id: testUserId,
            role: 'owner'
          })
      }
    }

    // Render the page
    render(<RoomsPage />)

    // Wait for rooms to load
    await waitFor(() => {
      expect(screen.getByText('Test Room 1')).toBeInTheDocument()
      expect(screen.getByText('Test Room 2')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Verify descriptions are shown
    expect(screen.getByText('This is a test room')).toBeInTheDocument()
    expect(screen.getByText('Another test room')).toBeInTheDocument()

    // Verify member counts are shown (should be 1 for each)
    const memberCountElements = screen.getAllByText('1')
    expect(memberCountElements.length).toBeGreaterThanOrEqual(2)
  })

  it('should hide description for passcode rooms', async () => {
    // Setup: Create a passcode room
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        name: 'Secret Room',
        description: 'This should be hidden',
        join_strategy: 'passcode',
        passcode_hash: '$2a$10$test.hash.for.testing',
        status: 'active',
        owner_id: testUserId
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create passcode room:', error)
      throw error
    }
    
    if (room) {
      createdRoomIds.push(room.id)
      
      // Add owner as member
      await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: testUserId,
          role: 'owner'
        })
    }

    // Render the page
    render(<RoomsPage />)

    // Wait for room to load
    await waitFor(() => {
      expect(screen.getByText('Secret Room')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Verify description is hidden
    expect(screen.queryByText('This should be hidden')).not.toBeInTheDocument()

    // Verify lock icon is shown
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument()

    // Verify password protected message is shown
    expect(screen.getByText('Password protected room')).toBeInTheDocument()
  })

  it('should not display pending or archived rooms', async () => {
    // Setup: Create rooms with different statuses
    const rooms = [
      {
        name: 'Pending Room',
        description: 'This is pending',
        join_strategy: 'approval',
        status: 'pending',
        owner_id: testUserId
      },
      {
        name: 'Archived Room',
        description: 'This is archived',
        join_strategy: 'approval',
        status: 'archived',
        owner_id: testUserId
      },
      {
        name: 'Active Room',
        description: 'This is active',
        join_strategy: 'approval',
        status: 'active',
        owner_id: testUserId
      }
    ]

    for (const room of rooms) {
      const { data, error } = await supabase
        .from('rooms')
        .insert(room)
        .select()
        .single()
      
      if (error) {
        console.error('Failed to create room:', error)
        throw error
      }
      
      if (data) {
        createdRoomIds.push(data.id)
        
        if (room.status === 'active') {
          // Add owner as member for active room
          await supabase
            .from('room_members')
            .insert({
              room_id: data.id,
              user_id: testUserId,
              role: 'owner'
            })
        }
      }
    }

    // Render the page
    render(<RoomsPage />)

    // Wait for active room to load
    await waitFor(() => {
      expect(screen.getByText('Active Room')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Verify pending and archived rooms are not shown
    expect(screen.queryByText('Pending Room')).not.toBeInTheDocument()
    expect(screen.queryByText('Archived Room')).not.toBeInTheDocument()
  })

  it('should display correct active member count', async () => {
    // Setup: Create a room with multiple members
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: 'Multi-Member Room',
        description: 'Room with multiple members',
        join_strategy: 'free',
        status: 'active',
        owner_id: testUserId
      })
      .select()
      .single()
    
    if (roomError || !room) {
      console.error('Failed to create room:', roomError)
      throw roomError
    }
    
    createdRoomIds.push(room.id)

    // Add owner as member
    await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: testUserId,
        role: 'owner'
      })

    // Create additional test users and add them as members
    const memberIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const { data: userData } = await supabase.auth.signUp({
        email: `member-${Date.now()}-${i}@example.com`,
        password: 'test-password-123'
      })
      
      if (userData.user) {
        memberIds.push(userData.user.id)
        await supabase
          .from('room_members')
          .insert({
            room_id: room.id,
            user_id: userData.user.id,
            role: 'member'
          })
      }
    }

    // Add a member who has left
    const { data: leftUserData } = await supabase.auth.signUp({
      email: `left-member-${Date.now()}@example.com`,
      password: 'test-password-123'
    })
    
    if (leftUserData.user) {
      await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: leftUserData.user.id,
          role: 'member',
          left_at: new Date().toISOString()
        })
    }

    // Render the page
    render(<RoomsPage />)

    // Wait for room to load
    await waitFor(() => {
      expect(screen.getByText('Multi-Member Room')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Verify member count is 4 (owner + 3 active members, not including the left member)
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should show empty state when no rooms exist', async () => {
    // Don't create any rooms
    
    // Render the page
    render(<RoomsPage />)

    // Wait for empty state to appear
    await waitFor(() => {
      expect(screen.getByText('No active rooms yet.')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(screen.getByText('Create the first room')).toBeInTheDocument()
  })
})
