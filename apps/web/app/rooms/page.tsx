'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog'
import { createClient } from '@/lib/supabase/client'
import { Lock, Users } from 'lucide-react'

interface Room {
  id: string
  name: string
  description: string | null
  join_strategy: 'approval' | 'free' | 'passcode'
  status: 'pending' | 'active' | 'archived'
  created_at: string
  active_members_count?: number
}

export default function RoomsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch active rooms
  const fetchRooms = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all active rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, description, join_strategy, status, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (roomsError) throw roomsError

      // Fetch active member counts for each room
      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { count, error: countError } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .is('left_at', null)

          if (countError) {
            console.error('Error fetching member count:', countError)
            return { ...room, active_members_count: 0 }
          }

          return { ...room, active_members_count: count || 0 }
        })
      )

      setRooms(roomsWithCounts)
    } catch (err) {
      console.error('Error fetching rooms:', err)
      setError('Failed to load rooms. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Subscribe to realtime updates for room_members
  useEffect(() => {
    fetchRooms()

    // Subscribe to room_members changes for realtime active count updates
    const channel = supabase
      .channel('room_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members'
        },
        () => {
          // Refetch rooms when members change
          fetchRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCreateSuccess = () => {
    // Refresh rooms list after creating a new room
    fetchRooms()
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading rooms...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchRooms}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Public Rooms</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          创建新 Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 text-gray-500">
          <p className="mb-4">No active rooms yet.</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create the first room
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <a
              data-testid={`room-card-${room.id}`}
              key={room.id}
              href={`/rooms/${room.id}`}
              className="block p-6 border rounded-lg hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{room.name}</h2>
                  {room.join_strategy === 'passcode' && (
                    <Lock className="w-4 h-4 text-gray-500" data-testid="lock-icon" />
                  )}
                </div>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {room.active_members_count || 0}
                </span>
              </div>
              {room.join_strategy !== 'passcode' && room.description && (
                <p className="text-gray-600">{room.description}</p>
              )}
              {room.join_strategy === 'passcode' && (
                <p className="text-gray-400 italic">Password protected room</p>
              )}
            </a>
          ))}
        </div>
      )}

      <CreateRoomDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
