/**
 * Member List Component
 * 
 * Displays the list of room members with their avatars, names, and online status.
 * Requirements: 4.2
 */

'use client';

import { useEffect, useState } from 'react';
import { User, Circle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Member {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'member';
  isOnline: boolean;
  joinedAt: string;
}

interface MemberListProps {
  roomId: string;
  currentUserId: string | null;
}

export function MemberList({ roomId, currentUserId }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);

        // Fetch room members
        const { data: roomMembers, error: membersError } = await supabase
          .from('room_members')
          .select('user_id, role, joined_at')
          .eq('room_id', roomId)
          .is('left_at', null) // Only active members
          .order('joined_at', { ascending: true });

        if (membersError) {
          console.error('Failed to fetch room members:', membersError);
          return;
        }

        if (!roomMembers || roomMembers.length === 0) {
          setMembers([]);
          return;
        }

        // Get user IDs
        const userIds = roomMembers.map(m => m.user_id);

        // Fetch user profiles from auth.users metadata
        // Note: In production, you'd have a separate profiles table
        // For now, we'll use a simple approach with user IDs
        const membersWithProfiles: Member[] = roomMembers.map(member => ({
          id: member.user_id,
          userId: member.user_id,
          displayName: member.user_id === currentUserId 
            ? 'You' 
            : `User ${member.user_id.slice(0, 8)}`,
          role: member.role as 'owner' | 'member',
          isOnline: false, // TODO: Implement presence tracking
          joinedAt: member.joined_at,
        }));

        setMembers(membersWithProfiles);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();

    // Subscribe to room_members changes for real-time updates
    const channel = supabase
      .channel(`room_members:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Refetch members when changes occur
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, supabase]);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Loading members...
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        No members yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Members ({members.length})
      </div>
      
      <div className="space-y-1">
        {members.map((member) => (
          <div
            key={member.id}
            data-testid={`member-${member.userId}`}
            className="px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="relative">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Online status indicator */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  member.isOnline ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={member.isOnline ? 'Online' : 'Offline'}
              />
            </div>

            {/* Member info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {member.displayName}
                </span>
                {member.role === 'owner' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                    Owner
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Online status text (optional, for accessibility) */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Circle
                size={8}
                className={member.isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}
              />
              <span className="sr-only">
                {member.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
