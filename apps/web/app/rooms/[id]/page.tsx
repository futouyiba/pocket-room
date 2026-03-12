"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { User, MessageSquare, Plus, Check, X, Shield, Clock, Trash2, Library, Share2, MousePointer2, Bot, Sparkles, AlertCircle, Download, Bell, Wifi, WifiOff, Users, LogOut } from 'lucide-react';
import { JoinRequestQueue } from '@/components/rooms/join-request-queue';
import { MemberList } from '@/components/rooms/member-list';
import { MessageItem } from '@/components/rooms/message-item';
import { ImageUpload } from '@/components/rooms/image-upload';
import { LeaveRoomDialog } from '@/components/rooms/leave-room-dialog';
import { CreateSegmentDialog } from '@/components/rooms/create-segment-dialog';
import { SummonCompanionDialog } from '@/components/companion/summon-companion-dialog';
import { ApproveCompanionDialog } from '@/components/companion/approve-companion-dialog';
import { SelectContextDialog } from '@/components/companion/select-context-dialog';
import { CompanionCard } from '@/components/companion/companion-card';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Types
type UserRole = 'spectator' | 'pending' | 'member' | 'owner';
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface JoinRequest { id: string; userId: string; username: string; status: 'pending' | 'approved' | 'rejected' | 'blocked'; timestamp: string; }

interface DbMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'segment_share' | 'system';
  shared_segment_id: string | null;
  attachments: string[];
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Message { 
  id: string; 
  sender: string; 
  senderId: string;
  content: string; 
  timestamp: string; 
  rawTimestamp: number; 
  isDeleted?: boolean; 
  isAi?: boolean; 
  familiarName?: string; 
}

interface Segment { id: string; name: string; messageIds: string[]; isShared: boolean; contentPreview?: string; source?: string; }
interface Familiar { id: string; name: string; model: string; }
interface Invocation { id: string; familiarId: string; familiarName: string; triggeredBy: string; status: 'pending_approval' | 'processing' | 'completed'; contextCount: number; }

export default function RoomPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State
  const [userRole, setUserRole] = useState<UserRole>('spectator');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [showJoinRequestQueue, setShowJoinRequestQueue] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showCreateSegmentDialog, setShowCreateSegmentDialog] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [joinedAt, setJoinedAt] = useState<Date | null>(null);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(null);
  const [hasLeftWithHistory, setHasLeftWithHistory] = useState(false);

  // Selection & Pocket State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isPocketOpen, setIsPocketOpen] = useState(false);

  // AI State
  const [myFamiliar, setMyFamiliar] = useState<Familiar | null>(null);
  const [pendingInvocations, setPendingInvocations] = useState<Invocation[]>([]);
  const [showSummonDialog, setShowSummonDialog] = useState(false);
  const [summonedCompanions, setSummonedCompanions] = useState<Array<{
    invocationId: string;
    companionId: string;
    companionName: string;
    ownerId: string;
    ownerName?: string;
    requesterName?: string;
    status: 'summoned' | 'pending_approval' | 'processing' | 'completed';
    triggeredBy: string;
    isOwner: boolean;
  }>>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedApprovalInvocation, setSelectedApprovalInvocation] = useState<{
    invocationId: string;
    companionName: string;
    requesterName: string;
  } | null>(null);
  const [showContextSelectionDialog, setShowContextSelectionDialog] = useState(false);
  const [selectedContextInvocation, setSelectedContextInvocation] = useState<{
    invocationId: string;
    companionName: string;
    requesterName: string;
  } | null>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch summoned companions
  const fetchSummonedCompanions = useCallback(async () => {
    if (!currentUserId || userRole === 'spectator') {
      return;
    }

    try {
      const response = await fetch(`/api/companion/summon?roomId=${params.id}`);
      if (!response.ok) {
        console.error('Failed to fetch summoned companions');
        return;
      }

      const data = await response.json();
      setSummonedCompanions(data.companions || []);
    } catch (error) {
      console.error('Error fetching summoned companions:', error);
    }
  }, [params.id, currentUserId, userRole]);

  // Request companion response - 需求 14.2, 14.3
  const handleRequestCompanion = useCallback(async (invocationId: string) => {
    try {
      const response = await fetch('/api/companion/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invocationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to request companion:', error);
        alert(`请求失败: ${error.error?.message || '未知错误'}`);
        return;
      }

      const data = await response.json();
      console.log('Companion request successful:', data);

      // Refresh the companions list to show updated status
      await fetchSummonedCompanions();
    } catch (error) {
      console.error('Error requesting companion:', error);
      alert('请求 Companion 失败，请重试');
    }
  }, [fetchSummonedCompanions]);

  // Approve companion request - 需求 14.4, 14.6
  const handleApproveCompanion = useCallback((invocationId: string, companionName: string, requesterName: string) => {
    setSelectedApprovalInvocation({ invocationId, companionName, requesterName });
    setShowApprovalDialog(true);
  }, []);

  const handleApprovalConfirm = useCallback(async (approvalType: 'once' | 'whitelist') => {
    if (!selectedApprovalInvocation) return;

    try {
      const response = await fetch('/api/companion/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invocationId: selectedApprovalInvocation.invocationId,
          approvalType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to approve companion:', error);
        alert(`批准失败: ${error.error?.message || '未知错误'}`);
        return;
      }

      const data = await response.json();
      console.log('Companion approval successful:', data);

      // Refresh the companions list to show updated status (bright icon)
      await fetchSummonedCompanions();
      
      // Close the approval dialog
      setShowApprovalDialog(false);
      
      // Open context selection dialog - 需求 15.1, 15.2
      setSelectedContextInvocation(selectedApprovalInvocation);
      setShowContextSelectionDialog(true);
      
      // Clear approval invocation
      setSelectedApprovalInvocation(null);
    } catch (error) {
      console.error('Error approving companion:', error);
      alert('批准 Companion 失败，请重试');
    }
  }, [selectedApprovalInvocation, fetchSummonedCompanions]);

  // Handle context selection - 需求 15.1, 15.2
  const handleContextSelection = useCallback(async (
    contextSegmentId: string | null,
    selectedMessageIds: string[],
    visibility: 'public' | 'private'
  ) => {
    if (!selectedContextInvocation) return;

    try {
      const response = await fetch('/api/companion/set-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invocationId: selectedContextInvocation.invocationId,
          contextSegmentId,
          selectedMessageIds,
          visibility,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to set context:', error);
        alert(`设置上下文失败: ${error.error?.message || '未知错误'}`);
        return;
      }

      const data = await response.json();
      console.log('Context set successfully:', data);

      // Refresh the companions list
      await fetchSummonedCompanions();
      
      // Close the context selection dialog
      setShowContextSelectionDialog(false);
      setSelectedContextInvocation(null);
      
      // Show success message
      alert('上下文已设置，Companion 准备响应');
    } catch (error) {
      console.error('Error setting context:', error);
      alert('设置上下文失败，请重试');
    }
  }, [selectedContextInvocation, fetchSummonedCompanions]);

  // Format timestamp for display
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Different day
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Convert database message to UI message
  const convertDbMessageToUiMessage = useCallback((dbMsg: DbMessage, userMap: Map<string, string>): Message => {
    const createdAt = new Date(dbMsg.created_at);
    return {
      id: dbMsg.id,
      sender: userMap.get(dbMsg.user_id) || 'Unknown User',
      senderId: dbMsg.user_id,
      content: dbMsg.is_deleted ? 'This message was deleted' : dbMsg.content,
      timestamp: formatTimestamp(createdAt),
      rawTimestamp: createdAt.getTime(),
      isDeleted: dbMsg.is_deleted,
    };
  }, []);

  // Fetch initial data (user, room, membership, messages)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingMessages(true);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Failed to get user:', userError);
          setUserRole('spectator');
          setIsLoadingMessages(false);
          return;
        }
        
        setCurrentUserId(user.id);

        // Get room details
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('owner_id, status, name')
          .eq('id', params.id)
          .single() as { data: { owner_id: string; status: string; name: string } | null; error: any };

        if (roomError || !room) {
          console.error('Failed to get room:', roomError);
          setIsLoadingMessages(false);
          return;
        }

        setRoomOwnerId(room.owner_id);
        setRoomName(room.name || `Room #${params.id}`);

        // Check if user is a member
        const { data: membership, error: membershipError } = await supabase
          .from('room_members')
          .select('role, joined_at, left_at, keep_history')
          .eq('room_id', params.id)
          .eq('user_id', user.id)
          .single() as { data: { role: string; joined_at: string; left_at: string | null; keep_history: boolean } | null; error: any };

        if (membership && !membershipError) {
          // Check if user has left the room
          if (membership.left_at) {
            // User has left the room
            if (membership.keep_history) {
              // User chose to keep history - show read-only view
              setUserRole('spectator'); // Set to spectator to disable message sending
              setJoinedAt(new Date(membership.joined_at));
              setHasLeftWithHistory(true);
              
              // Fetch messages between joined_at and left_at
              const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('room_id', params.id)
                .gte('created_at', membership.joined_at)
                .lte('created_at', membership.left_at)
                .order('created_at', { ascending: true }) as { data: DbMessage[] | null; error: any };

              if (messagesError) {
                console.error('Failed to fetch messages:', messagesError);
              } else if (messagesData) {
                // Get unique user IDs from messages
                const userIds = Array.from(new Set(messagesData.map(m => m.user_id)));
                
                // Fetch user profiles (display names)
                const userMap = new Map<string, string>();
                userIds.forEach(id => {
                  userMap.set(id, id === user.id ? 'You' : `User ${id.slice(0, 8)}`);
                });

                const uiMessages = messagesData.map(msg => convertDbMessageToUiMessage(msg, userMap));
                setMessages(uiMessages);
                
                // Scroll to bottom after loading messages
                setTimeout(scrollToBottom, 100);
              }
            } else {
              // User chose to delete history - redirect to room list
              console.log('User has left and deleted history, redirecting to room list');
              router.push('/rooms');
              return;
            }
          } else {
            // User is still a member
            setUserRole(membership.role as UserRole);
            setJoinedAt(new Date(membership.joined_at));

            // Fetch messages (only messages after joined_at)
            const { data: messagesData, error: messagesError } = await supabase
              .from('messages')
              .select('*')
              .eq('room_id', params.id)
              .gte('created_at', membership.joined_at)
              .order('created_at', { ascending: true }) as { data: DbMessage[] | null; error: any };

            if (messagesError) {
              console.error('Failed to fetch messages:', messagesError);
            } else if (messagesData) {
              // Get unique user IDs from messages
              const userIds = Array.from(new Set(messagesData.map(m => m.user_id)));
              
              // Fetch user profiles (display names)
              const userMap = new Map<string, string>();
              userIds.forEach(id => {
                userMap.set(id, id === user.id ? 'You' : `User ${id.slice(0, 8)}`);
              });

              const uiMessages = messagesData.map(msg => convertDbMessageToUiMessage(msg, userMap));
              setMessages(uiMessages);
              
              // Scroll to bottom after loading messages
              setTimeout(scrollToBottom, 100);
            }
          }
        } else {
          // User is not a member
          if (room.owner_id === user.id) {
            setUserRole('owner');
          } else {
            setUserRole('spectator');
          }
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchInitialData();
  }, [params.id, supabase, convertDbMessageToUiMessage, scrollToBottom]);

  // Fetch summoned companions when user becomes a member
  useEffect(() => {
    if (userRole === 'member' || userRole === 'owner') {
      fetchSummonedCompanions();
    }
  }, [userRole, fetchSummonedCompanions]);

  // Subscribe to Realtime messages
  useEffect(() => {
    if (!currentUserId || userRole === 'spectator' || !joinedAt) {
      return;
    }

    // Create Realtime channel for this room
    const channel = supabase
      .channel(`room:${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${params.id}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          const newDbMessage = payload.new as DbMessage;
          
          // Only show messages after joined_at
          const messageCreatedAt = new Date(newDbMessage.created_at);
          if (joinedAt && messageCreatedAt < joinedAt) {
            return;
          }

          // Convert to UI message
          const userMap = new Map<string, string>();
          userMap.set(newDbMessage.user_id, newDbMessage.user_id === currentUserId ? 'You' : `User ${newDbMessage.user_id.slice(0, 8)}`);
          
          const uiMessage = convertDbMessageToUiMessage(newDbMessage, userMap);
          
          setMessages(prev => [...prev, uiMessage]);
          
          // Scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${params.id}`,
        },
        async (payload) => {
          console.log('Message updated:', payload);
          
          const updatedDbMessage = payload.new as DbMessage;
          
          // Update message in state
          setMessages(prev => prev.map(msg => {
            if (msg.id === updatedDbMessage.id) {
              const userMap = new Map<string, string>();
              userMap.set(updatedDbMessage.user_id, updatedDbMessage.user_id === currentUserId ? 'You' : `User ${updatedDbMessage.user_id.slice(0, 8)}`);
              return convertDbMessageToUiMessage(updatedDbMessage, userMap);
            }
            return msg;
          }));
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('disconnected');
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            setConnectionStatus('connecting');
            channel.subscribe();
          }, 3000);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [params.id, currentUserId, userRole, joinedAt, supabase, convertDbMessageToUiMessage, scrollToBottom]);

  // Send message handler
  const handleSendMessage = async () => {
    if ((!newMessageContent.trim() && !attachedImageUrl) || isSendingMessage) {
      return;
    }

    try {
      setIsSendingMessage(true);

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: params.id,
          content: newMessageContent.trim() || (attachedImageUrl ? `![Image](${attachedImageUrl})` : ''),
          attachments: attachedImageUrl ? [attachedImageUrl] : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to send message:', error);
        alert(`Failed to send message: ${error.error || 'Unknown error'}`);
        return;
      }

      // Clear input and attached image
      setNewMessageContent('');
      setAttachedImageUrl(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine if current user is the room owner
  const isOwner = useMemo(() => {
    return currentUserId !== null && roomOwnerId !== null && currentUserId === roomOwnerId;
  }, [currentUserId, roomOwnerId]);

  // Actions
  const handleRequestJoin = () => { setUserRole('pending'); alert("Request sent! (Mock)"); };
  const handleApprove = (reqId: string) => { alert(`Approved request ${reqId}`); };
  const handleReject = (reqId: string) => { alert(`Rejected request ${reqId}`); };
  const simulateJoinNow = () => { 
    setUserRole('member'); 
    setJoinedAt(new Date());
  };
  
  const handleDeleteMessage = async (msgId: string) => {
    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: msgId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to delete message:', error);
        alert(`Failed to delete message: ${error.error || 'Unknown error'}`);
        return;
      }

      // The Realtime subscription will automatically update the UI
      // when the message is updated in the database
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };
  
  const toggleSelection = (msgId: string) => {
    const next = new Set(selectedMessageIds);
    if (next.has(msgId)) next.delete(msgId);
    else next.add(msgId);
    setSelectedMessageIds(next);
  };

  const createSegment = async (name: string, description: string) => {
    if (selectedMessageIds.size === 0) {
      alert('请选择至少一条消息');
      return;
    }

    try {
      const response = await fetch('/api/segments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          roomId: params.id,
          messageIds: Array.from(selectedMessageIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create segment:', error);
        alert(`创建 Segment 失败: ${error.error || '未知错误'}`);
        return;
      }

      const data = await response.json();
      console.log('Segment created successfully:', data.segmentId);

      // Create a local segment for display
      const newSegment: Segment = {
        id: data.segmentId,
        name,
        messageIds: Array.from(selectedMessageIds),
        isShared: false,
      };
      setSegments(prev => [newSegment, ...prev]);

      // Clear selection and close dialog
      setSelectedMessageIds(new Set());
      setIsSelectionMode(false);
      setShowCreateSegmentDialog(false);
      setIsPocketOpen(true);

      alert('Segment 创建成功！');
    } catch (error) {
      console.error('Error creating segment:', error);
      alert('创建 Segment 失败，请重试');
    }
  };

  const shareSegment = (segId: string) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, isShared: true } : s));
    const segment = segments.find(s => s.id === segId);
    const newMsg: Message = { 
      id: Math.random().toString(), 
      sender: 'You', 
      senderId: currentUserId || '',
      content: `📎 Shared a segment: ${segment?.name} ${segment?.source ? `(Source: ${segment.source})` : ''}`, 
      timestamp: 'Now', 
      rawTimestamp: Date.now() 
    };
    setMessages(prev => [...prev, newMsg]);
  };

  // Mock Extension Capture Drop
  const simulateExtensionDrop = () => {
    const newSegment: Segment = {
      id: Math.random().toString(),
      name: 'Draft from Web: "React Hooks"',
      messageIds: [],
      isShared: false,
      contentPreview: 'Hooks are a new addition in React 16.8. They let you use state and other React features without writing a class.',
      source: 'reactjs.org'
    };
    setSegments(prev => [newSegment, ...prev]);
    setIsPocketOpen(true);
    alert("Captured text from extension received!");
  };

  // AI Actions
  const registerFamiliar = () => {
    const name = prompt("Name your AI Familiar (e.g., Pancake):");
    if (!name) return;
    setMyFamiliar({ id: 'f1', name, model: 'gpt-4' });
    alert(`Registered ${name}. It is now your retainer.`);
  };

  const invokeAi = () => {
    if (!myFamiliar) return alert("Register a familiar first!");
    const promptText = prompt(`Ask ${myFamiliar.name} about these ${selectedMessageIds.size} messages:`);
    if (!promptText) return;

    const aiMsg: Message = {
      id: Math.random().toString(),
      sender: `${myFamiliar.name} (Your Familiar)`,
      senderId: 'ai',
      content: `Thinking...`,
      timestamp: 'Now',
      rawTimestamp: Date.now(),
      isAi: true,
      familiarName: myFamiliar.name
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, content: `🤖 Based on the selected context: "${promptText}", here is my analysis... (Mock Response)` } : m));
    }, 1500);
  };

  const simulateSomeoneElseInvokingMyAi = () => {
    if (!myFamiliar) return alert("Register a familiar first!");
    const newInv: Invocation = {
      id: Math.random().toString(),
      familiarId: myFamiliar.id,
      familiarName: myFamiliar.name,
      triggeredBy: 'Bob',
      status: 'pending_approval',
      contextCount: 5
    };
    setPendingInvocations(prev => [...prev, newInv]);
  };

  const approveInvocation = (invId: string) => {
    setPendingInvocations(prev => prev.filter(i => i.id !== invId));
    const aiMsg: Message = {
      id: Math.random().toString(),
      sender: `${myFamiliar?.name} (Your Familiar)`,
      senderId: 'ai',
      content: `(Nod from Owner) @Bob, here is the answer...`,
      timestamp: 'Now',
      rawTimestamp: Date.now(),
      isAi: true,
      familiarName: myFamiliar?.name
    };
    setMessages(prev => [...prev, aiMsg]);
  };

  const rejectInvocation = (invId: string) => {
    setPendingInvocations(prev => prev.filter(i => i.id !== invId));
    alert("You shook your head. The AI stays silent.");
  };

  // Handle leave room
  const handleLeaveRoom = async (keepHistory: boolean) => {
    try {
      const response = await fetch('/api/rooms/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: params.id,
          keepHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to leave room:', error);
        alert(`Failed to leave room: ${error.error || 'Unknown error'}`);
        return;
      }

      // Redirect to room list after leaving
      router.push('/rooms');
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('Failed to leave room. Please try again.');
    }
  };

  // Filter messages (for spectator view, show all; for members, already filtered by joined_at in query)
  const visibleMessages = useMemo(() => {
    return messages;
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Room #{params.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${userRole === 'owner' ? 'bg-purple-100 text-purple-800' : userRole === 'member' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {userRole === 'spectator' ? 'Spectator' : userRole === 'pending' ? 'Pending' : userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </span>
          
          {/* Read-only banner for users who left with history - 需求 11.4 */}
          {hasLeftWithHistory && (
            <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <AlertCircle size={12} />
              已退出 - 历史记录只读
            </span>
          )}
          
          {/* Connection Status Indicator - 需求 8.6 */}
          {(userRole === 'member' || userRole === 'owner') && (
            <span 
              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-100 text-red-800'
              }`}
              title={
                connectionStatus === 'connected' ? 'Connected to real-time updates' :
                connectionStatus === 'connecting' ? 'Connecting...' :
                'Disconnected - attempting to reconnect'
              }
            >
              {connectionStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex gap-1 text-xs border-r pr-2 mr-2">
            <button data-testid="dev-role-spectator" onClick={() => { setUserRole('spectator'); setJoinedAt(null); }} className="p-1 hover:bg-gray-50 border rounded">Spec</button>
            <button data-testid="dev-role-member" onClick={simulateJoinNow} className="p-1 hover:bg-gray-50 border rounded bg-green-50 text-green-700">Join</button>
            <button data-testid="dev-role-owner" onClick={() => { setUserRole('owner'); setJoinedAt(null); }} className="p-1 hover:bg-gray-50 border rounded">Own</button>
          </div>
          
          {/* Join Request Queue Toggle (Owner Only) - 需求 5.7 */}
          {isOwner && (
            <button 
              data-testid="toggle-join-requests"
              onClick={() => setShowJoinRequestQueue(!showJoinRequestQueue)} 
              className={`p-2 rounded-full transition ${showJoinRequestQueue ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
              title="查看加入申请"
            >
              <Bell size={20} />
            </button>
          )}
          
          {(userRole === 'member' || userRole === 'owner') && (
            <>
              {/* Summon Companion Button - 需求 14.1 */}
              <button 
                data-testid="summon-companion-button"
                onClick={() => setShowSummonDialog(true)} 
                className="p-2 rounded-full hover:bg-indigo-100 text-indigo-600 transition border border-indigo-200" 
                title="召唤 Companion"
              >
                <Bot size={20} />
              </button>

              {/* Mock Extension Trigger */}
              <button data-testid="simulate-extension-drop" onClick={simulateExtensionDrop} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" title="Simulate Extension Capture">
                <Download size={20} />
              </button>

              <button data-testid="toggle-selection" onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-2 rounded-full transition ${isSelectionMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Select messages">
                <MousePointer2 size={20} />
              </button>
              <button data-testid="toggle-pocket" onClick={() => setIsPocketOpen(!isPocketOpen)} className={`p-2 rounded-full transition ${isPocketOpen ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Open Pocket">
                <Library size={20} />
              </button>
              <button data-testid="toggle-members" onClick={() => setShowMemberList(!showMemberList)} className={`p-2 rounded-full transition ${showMemberList ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-600'}`} title="View Members">
                <Users size={20} />
              </button>
              
              {/* Leave Room Button - 需求 11.2 */}
              <button 
                data-testid="leave-room-button"
                onClick={() => setShowLeaveDialog(true)} 
                className="p-2 rounded-full hover:bg-red-100 text-red-600 transition" 
                title="退出 Room"
              >
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Join Request Queue Sidebar (Owner Only) - 需求 5.7 */}
        {showJoinRequestQueue && isOwner && (
          <div 
            data-testid="join-request-sidebar" 
            className="w-96 border-r bg-white shadow-xl flex flex-col z-20 absolute inset-y-0 left-0 md:relative overflow-y-auto"
          >
            <div className="p-4 border-b flex justify-between items-center bg-blue-50 sticky top-0">
              <h2 className="font-bold flex items-center gap-2 text-blue-900">
                <Bell size={18} /> 加入申请队列
              </h2>
              <button 
                onClick={() => setShowJoinRequestQueue(false)} 
                className="text-blue-900/50 hover:text-blue-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-4">
              <JoinRequestQueue roomId={params.id} isOwner={isOwner} />
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {isLoadingMessages && (
              <div className="flex justify-center items-center h-full">
                <div className="text-gray-500">Loading messages...</div>
              </div>
            )}
            
            {/* Summoned Companions Display - 需求 14.1, 14.2 */}
            {!isLoadingMessages && summonedCompanions.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-500 font-medium px-2">
                  Companions in Room ({summonedCompanions.length})
                </div>
                {summonedCompanions.map((companion) => (
                  <CompanionCard
                    key={companion.invocationId}
                    companionName={companion.companionName}
                    status={companion.status}
                    isOwner={companion.isOwner}
                    triggeredBy={companion.triggeredBy}
                    ownerName={companion.ownerName}
                    requesterName={companion.requesterName}
                    onRequest={() => handleRequestCompanion(companion.invocationId)}
                    onApprove={() => handleApproveCompanion(
                      companion.invocationId, 
                      companion.companionName, 
                      companion.requesterName || 'Someone'
                    )}
                  />
                ))}
              </div>
            )}
            
            {!isLoadingMessages && visibleMessages.length === 0 && (
              <div className="flex justify-center items-center h-full">
                <div className="text-gray-400 text-center">
                  <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Be the first to send a message!</p>
                </div>
              </div>
            )}
            
            {pendingInvocations.length > 0 && (
              <div data-testid="ai-approval-card" className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mx-4 flex justify-between items-center animate-pulse">
                <div className="flex items-center gap-2 text-indigo-800 text-sm">
                  <AlertCircle size={16} />
                  <span><strong>{pendingInvocations[0].triggeredBy}</strong> is asking <strong>{pendingInvocations[0].familiarName}</strong> to speak...</span>
                </div>
                <div className="flex gap-2">
                  <button data-testid="ai-nod-allow" onClick={() => approveInvocation(pendingInvocations[0].id)} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 font-bold">Nod (Allow)</button>
                  <button data-testid="ai-shake-head" onClick={() => rejectInvocation(pendingInvocations[0].id)} className="bg-white border text-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-50">Shake Head</button>
                </div>
              </div>
            )}

            {visibleMessages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUserId}
                showAvatar={true}
                isSelectionMode={isSelectionMode}
                isSelected={selectedMessageIds.has(msg.id)}
                onToggleSelection={() => toggleSelection(msg.id)}
                onDelete={() => handleDeleteMessage(msg.id)}
                currentUserId={currentUserId}
              />
            ))}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
          
          {isSelectionMode && selectedMessageIds.size > 0 && (
            <div data-testid="selection-toolbar" className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-30">
              <span className="text-sm font-medium">{selectedMessageIds.size} selected</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <button data-testid="extract-pocket" onClick={() => setShowCreateSegmentDialog(true)} className="text-orange-600 hover:text-orange-700 text-sm font-bold flex items-center gap-1">
                <Library size={16} /> Pocket
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button data-testid="ask-ai" onClick={invokeAi} className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-1">
                <Sparkles size={16} /> Ask AI
              </button>
            </div>
          )}

          <div className="p-4 border-t bg-white">
            {(userRole === 'member' || userRole === 'owner') ? (
              <div className="space-y-2">
                {attachedImageUrl && (
                  <div className="px-4">
                    <ImageUpload
                      onImageUploaded={() => {}}
                      onRemove={() => setAttachedImageUrl(null)}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <ImageUpload
                    onImageUploaded={(url) => setAttachedImageUrl(url)}
                  />
                  <input 
                    type="text" 
                    placeholder="Type a message... (@Pancake to ask)" 
                    className="flex-1 border rounded-full px-4 py-2"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSendingMessage || connectionStatus === 'disconnected'}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || (!newMessageContent.trim() && !attachedImageUrl) || connectionStatus === 'disconnected'}
                    className="bg-blue-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                  >
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>
            ) : userRole === 'spectator' ? (
              hasLeftWithHistory ? (
                <div className="text-center py-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-medium">您已退出此 Room</p>
                  <p className="text-xs text-yellow-600 mt-1">您可以查看历史消息，但无法发送新消息</p>
                </div>
              ) : (
                <div className="text-center">
                  <button data-testid="request-join" onClick={handleRequestJoin} className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 mx-auto">
                    <Plus size={16} /> Request to Join
                  </button>
                </div>
              )
            ) : (
              <div data-testid="join-pending" className="text-center text-gray-500 flex justify-center gap-2"><Clock /> Waiting approval...</div>
            )}
          </div>
        </div>

        {isPocketOpen && (
          <div data-testid="pocket-sidebar" className="w-80 border-l bg-white shadow-xl flex flex-col z-20 absolute inset-y-0 right-0 md:relative">
            <div className="p-4 border-b flex justify-between items-center bg-orange-50">
              <h2 className="font-bold flex items-center gap-2 text-orange-900"><Library size={18} /> Pocket</h2>
              <button onClick={() => setIsPocketOpen(false)} className="text-orange-900/50 hover:text-orange-900"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {segments.length === 0 ? (
                <div className="text-center mt-10 text-gray-400 text-sm px-4">
                  <p className="mb-2">Your pocket is empty.</p>
                  <p>Select messages to extract context segments.</p>
                </div>
              ) : (
                segments.map(seg => (
                  <div data-testid={`segment-${seg.id}`} key={seg.id} className="border rounded-lg p-3 hover:shadow-md transition bg-orange-50/30 border-orange-100">
                    <div className="font-semibold text-sm mb-1">{seg.name}</div>
                    {seg.contentPreview ? (
                      <div className="text-xs text-gray-600 italic mb-2 border-l-2 border-gray-300 pl-2">{seg.contentPreview}</div>
                    ) : (
                      <div className="text-xs text-gray-500 mb-3">{seg.messageIds.length} messages</div>
                    )}
                    {seg.source && <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">{seg.source}</div>}
                    <div className="flex gap-2">
                      <button data-testid={`segment-view-${seg.id}`} className="flex-1 bg-white border text-xs py-1 rounded hover:bg-gray-50">View</button>
                      <button data-testid={`segment-share-${seg.id}`} onClick={() => shareSegment(seg.id)} disabled={seg.isShared} className={`flex-1 text-xs py-1 rounded flex items-center justify-center gap-1 ${seg.isShared ? 'bg-green-100 text-green-700 cursor-default' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
                        {seg.isShared ? <Check size={12}/> : <Share2 size={12}/>} {seg.isShared ? 'Shared' : 'Share'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Member List Sidebar - 需求 4.2, 7.1 */}
        {showMemberList && (userRole === 'member' || userRole === 'owner') && (
          <div 
            data-testid="member-list-sidebar" 
            className="w-80 border-l bg-white shadow-xl flex flex-col z-20 absolute inset-y-0 right-0 md:relative overflow-y-auto"
          >
            <div className="p-4 border-b flex justify-between items-center bg-green-50 sticky top-0">
              <h2 className="font-bold flex items-center gap-2 text-green-900">
                <Users size={18} /> Members
              </h2>
              <button 
                onClick={() => setShowMemberList(false)} 
                className="text-green-900/50 hover:text-green-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MemberList roomId={params.id} currentUserId={currentUserId} />
            </div>
          </div>
        )}
      </div>
      
      {/* Leave Room Dialog - 需求 11.2, 11.3 */}
      <LeaveRoomDialog
        isOpen={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        onConfirm={handleLeaveRoom}
        roomName={roomName}
      />
      
      {/* Create Segment Dialog - 需求 12.1 */}
      <CreateSegmentDialog
        isOpen={showCreateSegmentDialog}
        onClose={() => setShowCreateSegmentDialog(false)}
        onConfirm={createSegment}
        selectedCount={selectedMessageIds.size}
      />
      
      {/* Summon Companion Dialog - 需求 14.1 */}
      <SummonCompanionDialog
        isOpen={showSummonDialog}
        onClose={() => setShowSummonDialog(false)}
        roomId={params.id}
        onSuccess={fetchSummonedCompanions}
      />
      
      {/* Approve Companion Dialog - 需求 14.4 */}
      {selectedApprovalInvocation && (
        <ApproveCompanionDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          companionName={selectedApprovalInvocation.companionName}
          requesterName={selectedApprovalInvocation.requesterName}
          onApprove={handleApprovalConfirm}
        />
      )}
      
      {/* Select Context Dialog - 需求 15.1, 15.2 */}
      {selectedContextInvocation && (
        <SelectContextDialog
          isOpen={showContextSelectionDialog}
          onClose={() => {
            setShowContextSelectionDialog(false);
            setSelectedContextInvocation(null);
          }}
          onConfirm={handleContextSelection}
          companionName={selectedContextInvocation.companionName}
          requesterName={selectedContextInvocation.requesterName}
          roomId={params.id}
        />
      )}
    </div>
  );
}
