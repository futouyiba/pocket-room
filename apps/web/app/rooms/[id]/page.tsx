"use client";

import { useState } from 'react';
import { User, MessageSquare, Plus, Check, X, Shield, Clock } from 'lucide-react';

// Types for our mock data
type UserRole = 'spectator' | 'pending' | 'member' | 'owner';

interface JoinRequest {
  id: string;
  userId: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  timestamp: string;
}

export default function RoomPage({ params }: { params: { id: string } }) {
  // Mock State
  const [userRole, setUserRole] = useState<UserRole>('spectator');
  const [mockRequests, setMockRequests] = useState<JoinRequest[]>([
    { id: 'r1', userId: 'u1', username: 'David', status: 'pending', timestamp: '10:05 AM' },
    { id: 'r2', userId: 'u2', username: 'Eve', status: 'pending', timestamp: '10:08 AM' },
  ]);

  // Mock messages
  const messages = [
    { id: '1', sender: 'Alice', content: 'Hey everyone, welcome to the room!', timestamp: '10:00 AM' },
    { id: '2', sender: 'Bob', content: 'Hi Alice! Excited to be here.', timestamp: '10:01 AM' },
    { id: '3', sender: 'Charlie', content: 'Is this the spectator view?', timestamp: '10:02 AM' },
  ];

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
          <button onClick={() => setUserRole('spectator')} className="p-1 border rounded hover:bg-gray-50">View as Spectator</button>
          <button onClick={() => setUserRole('owner')} className="p-1 border rounded hover:bg-gray-50">View as Owner</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm">{msg.sender}</span>
                  <span className="text-xs text-gray-400">{msg.timestamp}</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm max-w-lg mt-1 text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* New Member Welcome (Mock) */}
            {userRole === 'member' || userRole === 'owner' ? (
              <div className="flex justify-center my-4">
                <span className="text-xs text-gray-400">You joined the room. History started recording.</span>
              </div>
            ) : null}
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
