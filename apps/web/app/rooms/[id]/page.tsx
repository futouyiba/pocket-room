"use client";

import { useState, useMemo } from 'react';
import { User, MessageSquare, Plus, Check, X, Shield, Clock, Trash2, Library, Share2, MousePointer2, Bot, Sparkles, AlertCircle, Download } from 'lucide-react';

// Types
type UserRole = 'spectator' | 'pending' | 'member' | 'owner';

interface JoinRequest { id: string; userId: string; username: string; status: 'pending' | 'approved' | 'rejected' | 'blocked'; timestamp: string; }
interface Message { id: string; sender: string; content: string; timestamp: string; rawTimestamp: number; isDeleted?: boolean; isAi?: boolean; familiarName?: string; }
interface Segment { id: string; name: string; messageIds: string[]; isShared: boolean; contentPreview?: string; source?: string; }
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
    const newMsg: Message = { id: Math.random().toString(), sender: 'You', content: `📎 Shared a segment: ${segment?.name} ${segment?.source ? `(Source: ${segment.source})` : ''}`, timestamp: 'Now', rawTimestamp: Date.now() };
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
            <button data-testid="dev-role-spectator" onClick={() => { setUserRole('spectator'); setMockJoinedAt(null); }} className="p-1 hover:bg-gray-50 border rounded">Spec</button>
            <button data-testid="dev-role-member" onClick={simulateJoinNow} className="p-1 hover:bg-gray-50 border rounded bg-green-50 text-green-700">Join</button>
            <button data-testid="dev-role-owner" onClick={() => { setUserRole('owner'); setMockJoinedAt(null); }} className="p-1 hover:bg-gray-50 border rounded">Own</button>
          </div>
          
          {(userRole === 'member' || userRole === 'owner') && (
            <>
              {!myFamiliar ? (
                <button data-testid="register-familiar" onClick={registerFamiliar} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 border border-dashed" title="Register AI Familiar">
                  <Bot size={20} />
                </button>
              ) : (
                <div data-testid="familiar-badge" className="flex items-center gap-1 px-2 border rounded-full bg-indigo-50 text-indigo-700 cursor-pointer" title={`Your familiar: ${myFamiliar.name}`} onClick={simulateSomeoneElseInvokingMyAi}>
                  <Bot size={14} /> <span className="text-xs font-bold">{myFamiliar.name}</span>
                </div>
              )}

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
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
              <div key={msg.id} className={`flex gap-3 ${msg.isDeleted ? 'opacity-60' : ''}`}>
                {isSelectionMode && !msg.isDeleted && (
                  <div className="pt-2">
                    <input data-testid={`select-message-${msg.id}`} type="checkbox" checked={selectedMessageIds.has(msg.id)} onChange={() => toggleSelection(msg.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
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
                      <button data-testid={`delete-message-${msg.id}`} onClick={() => handleDeleteMessage(msg.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {isSelectionMode && selectedMessageIds.size > 0 && (
            <div data-testid="selection-toolbar" className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-30">
              <span className="text-sm font-medium">{selectedMessageIds.size} selected</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <button data-testid="extract-pocket" onClick={createSegment} className="text-orange-600 hover:text-orange-700 text-sm font-bold flex items-center gap-1">
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
              <div className="flex gap-2">
                <input type="text" placeholder="Type a message... (@Pancake to ask)" className="flex-1 border rounded-full px-4 py-2" />
                <button className="bg-blue-600 text-white p-2 rounded-full"><MessageSquare size={20} /></button>
              </div>
            ) : userRole === 'spectator' ? (
              <div className="text-center">
                <button data-testid="request-join" onClick={handleRequestJoin} className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 mx-auto">
                  <Plus size={16} /> Request to Join
                </button>
              </div>
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
      </div>
    </div>
  );
}
