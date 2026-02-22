'use client';

/**
 * Segment Creator Component
 * 
 * Allows users to select messages and create a Segment.
 * Used in invitation flow and regular segment creation.
 * Requirements: 10.1, 10.2, 12.1, 12.3
 */

import { useState } from 'react';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('SegmentCreator');

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface SegmentCreatorProps {
  messages: Message[];
  onSegmentCreate: (segment: {
    name: string;
    description?: string;
    messageIds: string[];
  }) => void;
  onCancel: () => void;
}

export default function SegmentCreator({
  messages,
  onSegmentCreate,
  onCancel,
}: SegmentCreatorProps) {
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };
  
  const handleCreate = () => {
    setError(null);
    
    // Validation
    if (!segmentName.trim()) {
      setError('Segment 名称不能为空');
      return;
    }
    
    if (selectedMessageIds.size === 0) {
      setError('请至少选择一条消息');
      return;
    }
    
    logger.info('Creating segment', {
      name: segmentName,
      messageCount: selectedMessageIds.size,
    });
    
    // Get message IDs in chronological order (需求 12.3)
    const orderedMessageIds = messages
      .filter(msg => selectedMessageIds.has(msg.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(msg => msg.id);
    
    onSegmentCreate({
      name: segmentName.trim(),
      description: segmentDescription.trim() || undefined,
      messageIds: orderedMessageIds,
    });
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">创建 Segment</h2>
        <p className="mt-1 text-sm text-gray-600">
          选择消息并为 Segment 命名
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Segment Name Input */}
        <div>
          <label htmlFor="segment-name" className="block text-sm font-medium text-gray-700">
            Segment 名称 *
          </label>
          <input
            id="segment-name"
            type="text"
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            placeholder="例如：项目介绍"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* Segment Description Input */}
        <div>
          <label htmlFor="segment-description" className="block text-sm font-medium text-gray-700">
            描述（可选）
          </label>
          <textarea
            id="segment-description"
            value={segmentDescription}
            onChange={(e) => setSegmentDescription(e.target.value)}
            placeholder="简要描述这个 Segment 的内容"
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* Message Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择消息 ({selectedMessageIds.size} 已选)
          </label>
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无消息可选
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => toggleMessageSelection(message.id)}
                  className={`cursor-pointer rounded-md border p-3 transition ${
                    selectedMessageIds.has(message.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedMessageIds.has(message.id)}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {message.content}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 p-4 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          创建 Segment
        </button>
      </div>
    </div>
  );
}
