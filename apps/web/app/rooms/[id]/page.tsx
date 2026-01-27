"use client";

import { useState, useMemo } from 'react';
import { User, MessageSquare, Plus, Check, X, Shield, Clock, Trash2 } from 'lucide-react';

// Types
type UserRole = 'spectator' | 'pending' | 'member' | 'owner';

interface JoinRequest {
  id: string;
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  timestamp: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  rawTimestamp: number; // for comparison
  isDeleted?: boolean;
}

export default function RoomPage({ params }: { params: { id: string } }) {
  // Mock State
  const [userRole, setUserRole] = useState<UserRole>('spectator');
  const [mockRequests, setMockRequests] = useState<JoinRequest[]>([
    { id: 'r1', userId: 'u1', username: 'David', status: 'pending', timestamp: '10:05 AM' },
    { id: 'r2', userId: 'u2', username: 'Eve', status: 'pending', timestamp: '10:08 AM' },
  ]);

  // Mock Joined At Timestamp (e.g., 10:01:30 AM)
  const [mockJoinedAt, setMockJoinedAt] = useState<number | null>(null);

  // Mock messages
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'Alice', content: 'Hey everyone, welcome to the room!', timestamp: '10:00 AM', rawTimestamp: 1000 },
    { id: '2', sender: 'Bob', content: 'Hi Alice! Excited to be here.', timestamp: '10:01 AM', rawTimestamp: 1001 },
    { id: '3', sender: 'Charlie', content: 'Is this the spectator view?', timestamp: '10:02 AM', rawTimestamp: 1002 },
    { id: '4', sender: 'Alice', content: 'Yes, but you can join to chat.', timestamp: '10:03 AM', rawTimestamp: 1003 },
  ]);

  const handleRequestJoin = () => {
    setUserRole('pending');
    alert("Request sent! (Mock)");
  };

  const handleApprove = (reqId: string) => {
    setMockRequests(prev => prev.filter(r => r.id !== reqId));
    alert(`Approved request ${reqId}`);
  };

  const handleReject = (reqId: string) => {
    setMockRequests(prev => prev.filter(r => r.id !== reqId));
    alert(`Rejected request ${reqId}`);
  };

  // Simulating "Join" action (usually triggered by owner approval in real app)
  const simulateJoinNow = () => {
    setUserRole('member');
    // Set join time to "now" (simulated as 10:01.5 to demonstrate filtering)
    // In this mock, let's say we joined between msg 2 and 3
    setMockJoinedAt(1001.5);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages(prev => prev.map(m => 
      m.id === msgId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
    ));
  };

  // Filter messages based on Late Joiner Rule
  const visibleMessages = useMemo(() => {
    if (userRole === 'owner') return messages; // Owner sees all
    if (userRole === 'spectator') return messages; // Spectators see realtime feed (mocked as all for now)
    
    // Member: Only see messages after join time (unless they were explicitly disclosed - TODO)
    if (userRole === 'member' && mockJoinedAt) {
      return messages.filter(m => m.rawTimestamp >= mockJoinedAt);
    }
    
    return messages;
  }, [messages, userRole, mockJoinedAt]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Room #{params.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${
            userRole === 'owner' ? 'bg-purple-100 text-purple-800' :
            userRole === 'member' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {userRole === 'spectator' ? 'Spectator (Read Only)' : 
             userRole === 'pending' ? 'Join Pending' : 
             userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </span>
        </div>
        
        {/* Dev Controls to switch roles */}
        <div className="flex gap-2 text-xs">
          <button onClick={() => { setUserRole('spectator'); setMockJoinedAt(null); }} className="p-1 border rounded hover:bg-gray-50">Spectator</button>
          <button onClick={simulateJoinNow} className="p-1 border rounded hover:bg-gray-50 bg-green-50 text-green-700 font-bold">Simulate Join (Member)</button>
          <button onClick={() => { setUserRole('owner'); setMockJoinedAt(null); }} className="p-1 border rounded hover:bg-gray-50">Owner</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {/* Visual Indicator for Join Time */}
            {userRole === 'member' && mockJoinedAt && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full border border-yellow-200 shadow-sm">
                  You joined the room here. Previous history is hidden.
                </div>
              </div>
            )}

            {visibleMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.isDeleted ? 'opacity-60' : ''}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm">{msg.sender}</span>
                  <span className="text-xs text-gray-400">{msg.timestamp}</span>
                </div>
                
                <div className={`p-3 rounded-lg shadow-sm max-w-lg mt-1 text-sm leading-relaxed group relative ${
                  msg.isDeleted ? 'bg-gray-100 italic text-gray-500 border border-gray-200' : 'bg-white'
                }`}>
                  {msg.content}
                  
                  {/* Delete Button (Mock: Allow deleting any message for demo) */}
                  {!msg.isDeleted && (userRole === 'member' || userRole === 'owner') && (
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer / Input Area */}
          <div className="p-4 border-t bg-white">
            {userRole === 'spectator' && (
              <div className="text-center">
                <p className="text-gray-500 mb-2 text-sm">You are spectating. Request to join to participate.</p>
                <button 
                  onClick={handleRequestJoin}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} /> Request to Join
                </button>
              </div>
            )}

            {userRole === 'pending' && (
              <div className="text-center flex flex-col items-center gap-2 text-gray-500">
                <Clock className="animate-pulse" size={24} />
                <span className="text-sm">Waiting for owner approval...</span>
              </div>
            )}

            {(userRole === 'member' || userRole === 'owner') && (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                  <MessageSquare size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (Owner Only) */}
        {userRole === 'owner' && (
          <div className="w-80 border-l bg-gray-50 p-4 flex flex-col gap-4">
            <h2 className="font-bold flex items-center gap-2 text-gray-700">
              <Shield size={16} /> Moderation
            </h2>
            
            <div className="bg-white rounded-lg border p-3 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 text-gray-600 flex justify-between">
                Join Requests <span className="bg-red-100 text-red-600 px-2 rounded-full text-xs">{mockRequests.length}</span>
              </h3>
              
              <div className="space-y-3">
                {mockRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No pending requests.</p>
                ) : (
                  mockRequests.map(req => (
                    <div key={req.id} className="border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{req.username}</span>
                        <span className="text-[10px] text-gray-400">{req.timestamp}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button 
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 text-xs hover:bg-green-100 flex justify-center items-center gap-1"
                        >
                          <Check size={12} /> Allow
                        </button>
                        <button 
                          onClick={() => handleReject(req.id)}
                          className="flex-1 bg-red-50 text-red-700 border border-red-200 rounded px-2 py-1 text-xs hover:bg-red-100 flex justify-center items-center gap-1"
                        >
                          <X size={12} /> Reject
                        </button>
                        <button 
                          className="px-2 py-1 text-gray-400 hover:text-gray-600"
                          title="Block"
                        >
                          <Shield size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
