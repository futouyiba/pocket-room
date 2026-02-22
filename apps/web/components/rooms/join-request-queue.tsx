/**
 * JoinRequestQueue Component
 * 
 * Displays the queue of pending join requests for a room.
 * Only visible to room owners.
 * 
 * Features:
 * - Real-time updates via Supabase Realtime
 * - Displays pending requests with user information
 * - Provides approval actions (approve, reject, block, silence)
 * 
 * Requirements: 5.1, 5.2, 5.7
 */

'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase/client';
import { JoinRequestItem, JoinRequest } from './join-request-item';
import { AlertCircle, Loader2 } from 'lucide-react';

interface JoinRequestQueueProps {
  roomId: string;
  isOwner: boolean;
}

export function JoinRequestQueue({ roomId, isOwner }: JoinRequestQueueProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  // Fetch pending join requests
  useEffect(() => {
    if (!isOwner) {
      setIsLoading(false);
      return;
    }

    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('join_requests')
          .select(`
            *,
            user:users!join_requests_user_id_fkey(
              id,
              email,
              raw_user_meta_data
            )
          `)
          .eq('room_id', roomId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        // Transform the data to match JoinRequest interface
        const transformedRequests: JoinRequest[] = (data || []).map((req: any) => ({
          id: req.id,
          user_id: req.user_id,
          room_id: req.room_id,
          status: req.status,
          created_at: req.created_at,
          user: req.user ? {
            id: req.user.id,
            email: req.user.email,
            user_metadata: req.user.raw_user_meta_data,
          } : undefined,
        }));

        setRequests(transformedRequests);
      } catch (err) {
        console.error('Failed to fetch join requests:', err);
        setError('加载加入申请失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();

    // Subscribe to real-time updates (需求 5.1)
    const channel = supabase
      .channel(`join_requests:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'join_requests',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Join request change:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            // New join request
            fetchRequests();
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // Request was handled or deleted
            setRequests((prev) => prev.filter((req) => req.id !== payload.old?.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isOwner, supabase]);

  const handleApprove = async (requestId: string) => {
    try {
      const response = await fetch('/api/rooms/handle-join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action: 'approve',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '批准失败');
      }

      // Remove from local state
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Failed to approve request:', err);
      alert(err instanceof Error ? err.message : '批准失败');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const response = await fetch('/api/rooms/handle-join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action: 'reject',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '拒绝失败');
      }

      // Remove from local state
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Failed to reject request:', err);
      alert(err instanceof Error ? err.message : '拒绝失败');
    }
  };

  const handleBlock = async (requestId: string) => {
    try {
      const response = await fetch('/api/rooms/handle-join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action: 'block',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '封禁失败');
      }

      // Remove from local state
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Failed to block user:', err);
      alert(err instanceof Error ? err.message : '封禁失败');
    }
  };

  const handleSilence = async (requestId: string, durationHours: number) => {
    try {
      const response = await fetch('/api/rooms/handle-join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action: 'silence',
          silenceDurationHours: durationHours,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '静默失败');
      }

      // Remove from local state
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      console.error('Failed to silence user:', err);
      alert(err instanceof Error ? err.message : '静默失败');
    }
  };

  // Don't render anything if not owner
  if (!isOwner) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  // Empty state
  if (requests.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>暂无待处理的加入申请</p>
      </div>
    );
  }

  // Render join requests
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">
        待处理的加入申请 ({requests.length})
      </h3>
      
      <div className="space-y-2">
        {requests.map((request) => (
          <JoinRequestItem
            key={request.id}
            request={request}
            onApprove={handleApprove}
            onReject={handleReject}
            onBlock={handleBlock}
            onSilence={handleSilence}
          />
        ))}
      </div>
    </div>
  );
}
