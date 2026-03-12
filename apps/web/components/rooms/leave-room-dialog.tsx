/**
 * Leave Room Dialog Component
 * 
 * Displays a confirmation dialog when a user wants to leave a room,
 * with options to keep or delete their message history.
 * 
 * Requirements:
 * - 11.2: Room Member 点击"退出 Room"按钮时，显示确认对话框
 * - 11.3: 确认对话框提供两个选项：保留个人消息历史副本，或删除个人消息历史副本
 */

'use client';

import { useState } from 'react';
import { LogOut, Archive, Trash2, X } from 'lucide-react';

interface LeaveRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (keepHistory: boolean) => Promise<void>;
  roomName?: string;
}

export function LeaveRoomDialog({ isOpen, onClose, onConfirm, roomName }: LeaveRoomDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'keep' | 'delete' | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedOption) return;

    try {
      setIsLeaving(true);
      await onConfirm(selectedOption === 'keep');
      onClose();
    } catch (error) {
      console.error('Failed to leave room:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">退出 Room</h2>
              {roomName && (
                <p className="text-sm text-gray-500">{roomName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isLeaving}
          >
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600">
          您确定要退出这个 Room 吗？请选择如何处理您的消息历史记录：
        </p>

        {/* Options */}
        <div className="space-y-3">
          {/* Keep History Option */}
          <button
            onClick={() => setSelectedOption('keep')}
            disabled={isLeaving}
            className={`w-full p-4 rounded-lg border-2 transition text-left ${
              selectedOption === 'keep'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${isLeaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedOption === 'keep' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Archive size={16} className={selectedOption === 'keep' ? 'text-blue-600' : 'text-gray-600'} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">
                  保留我的消息历史
                </div>
                <div className="text-sm text-gray-600">
                  您的消息历史将被保留，您可以随时查看。其他成员仍然可以看到您发送的消息。
                </div>
              </div>
              {selectedOption === 'keep' && (
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Delete History Option */}
          <button
            onClick={() => setSelectedOption('delete')}
            disabled={isLeaving}
            className={`w-full p-4 rounded-lg border-2 transition text-left ${
              selectedOption === 'delete'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${isLeaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                selectedOption === 'delete' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <Trash2 size={16} className={selectedOption === 'delete' ? 'text-red-600' : 'text-gray-600'} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">
                  删除我的消息历史
                </div>
                <div className="text-sm text-gray-600">
                  您的消息历史将被标记为不可访问。其他成员仍然可以看到您发送的消息。
                </div>
              </div>
              {selectedOption === 'delete' && (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLeaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption || isLeaving}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLeaving ? '退出中...' : '确认退出'}
          </button>
        </div>
      </div>
    </div>
  );
}
