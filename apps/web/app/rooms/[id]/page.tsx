"use client";

import { useState, useMemo } from 'react';
import { User, MessageSquare, Plus, Check, X, Shield, Clock, Trash2, Library, Share2, MousePointer2, Bot, Sparkles, AlertCircle } from 'lucide-react';

// Types
type UserRole = 'spectator' | 'pending' | 'member' | 'owner';

interface JoinRequest { id: string; userId: string; username: string; status: 'pending' | 'approved' | 'rejected' | 'blocked'; timestamp: string; }
interface Message { id: string; sender: string; content: string; timestamp: string; rawTimestamp: number; isDeleted?: boolean; isAi?: boolean; familiarName?: string; }
interface Segment { id: string; name: string; messageIds: string[]; isShared: boolean; }
interface Familiar { id: string; name: string; model: string; }
interface Invocation { id: string; familiarId: string; familiarName: string; triggeredBy: string; status: 'pending_approval' | 'processing' | 'completed'; contextCount: number; }

export default function RoomPage({ params }: { params: { id: string } }) {
  // State
  const [userRole, setUserRole] = useState<UserRole>('spectator');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'Alice', content: 'Hey everyone, welcome to the room!', timestamp: '10:00 AM', rawTimestamp: 1000 },
    { id: '2', sender: 'Bob', content: 'Hi Alice! Excited to be here.', timestamp: '10:01 AM', rawTimestamp: 1001 },
    { id: '3', sender: 'Charlie', content: 'Is this the spectator view?', timestamp: '10:02 AM', rawTimestamp: 1002 },
    { id: '4', sender: 'Alice', content: 'Yes, but you can join to chat.', timestamp: '10:03 AM', rawTimestamp: 1003 },
  ]);
  const [mockRequests, setMockRequests] = useState<JoinRequest[]>([{ id: 'r1', userId: 'u1', username: 'David', status: 'pending', timestamp: '10:05 AM' }]);
  const [mockJoinedAt, setMockJoinedAt] = useState<number | null>(null);

  // Selection & Pocket State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isPocketOpen, setIsPocketOpen] = useState(false);

  // AI State
  const [myFamiliar, setMyFamiliar] = useState<Familiar | null>(null);
  const [pendingInvocations, setPendingInvocations] = useState<Invocation[]>([]);

  // Actions
  const handleRequestJoin = () => { setUserRole('pending'); alert("Request sent! (Mock)"); };
  const handleApprove = (reqId: string) => { setMockRequests(prev => prev.filter(r => r.id !== reqId)); alert(`Approved request ${reqId}`); };
  const handleReject = (reqId: string) => { setMockRequests(prev => prev.filter(r => r.id !== reqId)); alert(`Rejected request ${reqId}`); };
  const simulateJoinNow = () => { setUserRole('member'); setMockJoinedAt(1001.5); };
  const handleDeleteMessage = (msgId: string) => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m)); };
  
  const toggleSelection = (msgId: string) => {
    const next = new Set(selectedMessageIds);
    if (next.has(msgId)) next.delete(msgId);
    else next.add(msgId);
    setSelectedMessageIds(next);
  };

  const createSegment = () => {
    if (selectedMessageIds.size === 0) return;
    const name = prompt("Name your segment (e.g., 'Project Intro'):");
    if (!name) return;
    const newSegment: Segment = { id: Math.random().toString(), name, messageIds: Array.from(selectedMessageIds), isShared: false };
    setSegments(prev => [newSegment, ...prev]);
    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
    setIsPocketOpen(true);
  };

  const shareSegment = (segId: string) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, isShared: true } : s));
    const segment = segments.find(s => s.id === segId);
    const newMsg: Message = { id: Math.random().toString(), sender: 'You', content: `📎 Shared a segment: ${segment?.name}`, timestamp: 'Now', rawTimestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
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

    // Simulate AI response
    const aiMsg: Message = {
      id: Math.random().toString(),
      sender: `${myFamiliar.name} (Your Familiar)`,
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
    // AI Speaks
    const aiMsg: Message = {
      id: Math.random().toString(),
      sender: `${myFamiliar?.name} (Your Familiar)`,
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
    // Notification (could be private)
    alert("You shook your head. The AI stays silent.");
  };

  // Filter messages
  const visibleMessages = useMemo(() => {
    if (userRole === 'owner') return messages;
    if (userRole === 'spectator') return messages;
    if (userRole === 'member' && mockJoinedAt) {
      return messages.filter(m => m.rawTimestamp >= mockJoinedAt);
    }
    return messages;
  }, [messages, userRole, mockJoinedAt]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Room #{params.id}</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${userRole === 'owner' ? 'bg-purple-100 text-purple-800' : userRole === 'member' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {userRole === 'spectator' ? 'Spectator' : userRole === 'pending' ? 'Pending' : userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </span>
        </div>
        
        <div className="flex gap-2">
          <div className="flex gap-1 text-xs border-r pr-2 mr-2">
            <button onClick={() => { setUserRole('spectator'); setMockJoinedAt(null); }} className="p-1 hover:bg-gray-50 border rounded">Spec</button>
            <button onClick={simulateJoinNow} className="p-1 hover:bg-gray-50 border rounded bg-green-50 text-green-700">Join</button>
            <button onClick={() => { setUserRole('owner'); setMockJoinedAt(null); }} className="p-1 hover:bg-gray-50 border rounded">Own</button>
          </div>
          
          {(userRole === 'member' || userRole === 'owner') && (
            <>
              {!myFamiliar ? (
                <button onClick={registerFamiliar} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 border border-dashed" title="Register AI Familiar">
                  <Bot size={20} />
                </button>
              ) : (
                <div className="flex items-center gap-1 px-2 border rounded-full bg-indigo-50 text-indigo-700 cursor-pointer" title={`Your familiar: ${myFamiliar.name}`} onClick={simulateSomeoneElseInvokingMyAi}>
                  <Bot size={14} /> <span className="text-xs font-bold">{myFamiliar.name}</span>
                </div>
              )}

              <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-2 rounded-full transition ${isSelectionMode ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Select messages">
                <MousePointer2 size={20} />
              </button>
              <button onClick={() => setIsPocketOpen(!isPocketOpen)} className={`p-2 rounded-full transition ${isPocketOpen ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100 text-gray-600'}`} title="Open Pocket">
                <Library size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            
            {/* Pending AI Invocations Alert */}
            {pendingInvocations.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg mx-4 flex justify-between items-center animate-pulse">
                <div className="flex items-center gap-2 text-indigo-800 text-sm">
                  <AlertCircle size={16} />
                  <span><strong>{pendingInvocations[0].triggeredBy}</strong> is asking <strong>{pendingInvocations[0].familiarName}</strong> to speak...</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveInvocation(pendingInvocations[0].id)} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 font-bold">Nod (Allow)</button>
                  <button onClick={() => rejectInvocation(pendingInvocations[0].id)} className="bg-white border text-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-50">Shake Head</button>
                </div>
              </div>
            )}

            {visibleMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.isDeleted ? 'opacity-60' : ''}`}>
                {isSelectionMode && !msg.isDeleted && (
                  <div className="pt-2">
                    <input type="checkbox" checked={selectedMessageIds.has(msg.id)} onChange={() => toggleSelection(msg.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  </div>
                )}
                
                <div className="flex-1 flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-bold text-sm ${msg.isAi ? 'text-indigo-600 flex items-center gap-1' : ''}`}>
                      {msg.isAi && <Bot size={14} />} {msg.sender}
                    </span>
                    <span className="text-xs text-gray-400">{msg.timestamp}</span>
                  </div>
                  
                  <div className={`p-3 rounded-lg shadow-sm max-w-lg mt-1 text-sm leading-relaxed group relative ${
                    msg.isDeleted ? 'bg-gray-100 italic text-gray-500 border border-gray-200' : 
                    msg.isAi ? 'bg-indigo-50 border border-indigo-100 text-indigo-900' : 'bg-white'
                  }`}>
                    {msg.content}
                    {!msg.isDeleted && (userRole === 'member' || userRole === 'owner') && !isSelectionMode && (
                      <button onClick={() => handleDeleteMessage(msg.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Floating Creation Action */}
          {isSelectionMode && selectedMessageIds.size > 0 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-30">
              <span className="text-sm font-medium">{selectedMessageIds.size} selected</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <button onClick={createSegment} className="text-orange-600 hover:text-orange-700 text-sm font-bold flex items-center gap-1">
                <Library size={16} /> Pocket
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <button onClick={invokeAi} className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-1">
                <Sparkles size={16} /> Ask AI
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            {(userRole === 'member' || userRole === 'owner') ? (
              <div className="flex gap-2">
                <input type="text" placeholder="Type a message... (@Pancake to ask)" className="flex-1 border rounded-full px-4 py-2" />
                <button className="bg-blue-600 text-white p-2 rounded-full"><MessageSquare size={20} /></button>
              </div>
            ) : userRole === 'spectator' ? (
              <div className="text-center">
                <button onClick={handleRequestJoin} className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 mx-auto">
                  <Plus size={16} /> Request to Join
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 flex justify-center gap-2"><Clock /> Waiting approval...</div>
            )}
          </div>
        </div>

        {/* Pocket Sidebar */}
        {isPocketOpen && (
          <div className="w-80 border-l bg-white shadow-xl flex flex-col z-20 absolute inset-y-0 right-0 md:relative">
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
                  <div key={seg.id} className="border rounded-lg p-3 hover:shadow-md transition bg-orange-50/30 border-orange-100">
                    <div className="font-semibold text-sm mb-1">{seg.name}</div>
                    <div className="text-xs text-gray-500 mb-3">{seg.messageIds.length} messages</div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-white border text-xs py-1 rounded hover:bg-gray-50">View</button>
                      <button onClick={() => shareSegment(seg.id)} disabled={seg.isShared} className={`flex-1 text-xs py-1 rounded flex items-center justify-center gap-1 ${seg.isShared ? 'bg-green-100 text-green-700 cursor-default' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
                        {seg.isShared ? <Check size={12}/> : <Share2 size={12}/>} {seg.isShared ? 'Shared' : 'Share'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
