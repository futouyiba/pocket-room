/**
 * Select Context Dialog Component
 * 
 * Allows Companion Owner to explicitly select context (messages or Segment)
 * to send to the Companion after approval.
 * 
 * Validates requirements: 15.1, 15.2
 * 
 * Features:
 * - Message selection UI (select individual messages)
 * - Segment selection UI (select from existing Segments)
 * - Visibility control (public to Room or private to Owner)
 * - Prevents automatic access to full Timeline
 */

'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, Library, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface Segment {
  id: string;
  name: string;
  description?: string;
  messageCount: number;
}

interface SelectContextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contextSegmentId: string | null, selectedMessageIds: string[], visibility: 'public' | 'private') => void;
  companionName: string;
  requesterName: string;
  roomId: string;
}

export function SelectContextDialog({
  isOpen,
  onClose,
  onConfirm,
  companionName,
  requesterName,
  roomId,
}: SelectContextDialogProps) {
  const [contextType, setContextType] = useState<'messages' | 'segment'>('messages');
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data - in real implementation, fetch from API
  const [messages, setMessages] = useState<Message[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    if (isOpen && roomId) {
      // Fetch recent messages for the room
      fetchMessages();
      // Fetch available segments
      fetchSegments();
    }
  }, [isOpen, roomId]);

  const fetchMessages = async () => {
    // TODO: Implement actual API call
    // For now, use mock data
    setMessages([
      { id: '1', content: 'Hello, can you help with this?', sender: requesterName, timestamp: '2 min ago' },
      { id: '2', content: 'I need some context about...', sender: requesterName, timestamp: '1 min ago' },
      { id: '3', content: 'Here is the relevant information', sender: 'Alice', timestamp: '30 sec ago' },
    ]);
  };

  const fetchSegments = async () => {
    // TODO: Implement actual API call
    // For now, use mock data
    setSegments([
      { id: 'seg-1', name: 'Project Overview', description: 'Initial project discussion', messageCount: 5 },
      { id: 'seg-2', name: 'Technical Requirements', description: 'API and database specs', messageCount: 8 },
    ]);
  };

  const toggleMessageSelection = (messageId: string) => {
    const newSelection = new Set(selectedMessageIds);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessageIds(newSelection);
  };

  const handleConfirm = async () => {
    if (contextType === 'messages' && selectedMessageIds.size === 0) {
      alert('请至少选择一条消息作为上下文');
      return;
    }
    if (contextType === 'segment' && !selectedSegmentId) {
      alert('请选择一个 Segment 作为上下文');
      return;
    }

    setIsLoading(true);
    try {
      // If using messages, we need to create a temporary segment
      const contextSegmentId = contextType === 'segment' 
        ? selectedSegmentId 
        : null; // Will be created by the API if messages are selected
      
      const messageIds = contextType === 'messages' 
        ? Array.from(selectedMessageIds) 
        : [];

      await onConfirm(contextSegmentId, messageIds, visibility);
      
      // Reset state
      setSelectedMessageIds(new Set());
      setSelectedSegmentId(null);
      setVisibility('public');
      setContextType('messages');
    } catch (error) {
      console.error('Failed to set context:', error);
      alert('设置上下文失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              选择上下文
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              为 <span className="font-medium text-blue-600">{companionName}</span> 选择要发送的上下文
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Context Type Selector */}
        <div className="p-6 border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setContextType('messages')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                contextType === 'messages'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <MessageSquare size={20} />
              <span className="font-medium">选择消息</span>
            </button>
            <button
              onClick={() => setContextType('segment')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                contextType === 'segment'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <Library size={20} />
              <span className="font-medium">选择 Segment</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {contextType === 'messages' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                选择要发送给 Companion 的消息（可多选）
              </p>
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                  <p>暂无可选消息</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => toggleMessageSelection(message.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMessageIds.has(message.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {message.sender}
                          </span>
                          <span className="text-xs text-gray-500">
                            {message.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {message.content}
                        </p>
                      </div>
                      {selectedMessageIds.has(message.id) && (
                        <CheckCircle size={20} className="text-blue-600 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                选择一个 Segment 作为上下文
              </p>
              {segments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Library size={48} className="mx-auto mb-2 opacity-50" />
                  <p>暂无可用 Segment</p>
                  <p className="text-xs mt-1">请先创建 Segment</p>
                </div>
              ) : (
                segments.map((segment) => (
                  <div
                    key={segment.id}
                    onClick={() => setSelectedSegmentId(segment.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSegmentId === segment.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {segment.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {segment.messageCount} 条消息
                          </span>
                        </div>
                        {segment.description && (
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {segment.description}
                          </p>
                        )}
                      </div>
                      {selectedSegmentId === segment.id && (
                        <CheckCircle size={20} className="text-orange-600 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Visibility Control */}
        <div className="px-6 py-4 border-t border-b bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-3">回复可见范围</p>
          <div className="flex gap-3">
            <button
              onClick={() => setVisibility('public')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                visibility === 'public'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <Eye size={18} />
              <span className="text-sm font-medium">公开到 Room</span>
            </button>
            <button
              onClick={() => setVisibility('private')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                visibility === 'private'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <EyeOff size={18} />
              <span className="text-sm font-medium">仅自己可见</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6">
          <div className="text-sm text-gray-600">
            {contextType === 'messages' && selectedMessageIds.size > 0 && (
              <span>已选择 {selectedMessageIds.size} 条消息</span>
            )}
            {contextType === 'segment' && selectedSegmentId && (
              <span>已选择 1 个 Segment</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || (contextType === 'messages' && selectedMessageIds.size === 0) || (contextType === 'segment' && !selectedSegmentId)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? '处理中...' : '确认并继续'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
