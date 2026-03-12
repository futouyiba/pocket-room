"use client";

import { useState } from 'react';
import { X, Library } from 'lucide-react';

interface CreateSegmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, description: string) => void;
  selectedCount: number;
}

/**
 * Create Segment Dialog Component
 * 
 * Dialog for creating a segment from selected messages.
 * 
 * Requirements:
 * - 12.1: 允许用户将选中消息创建为一个命名的 Segment
 */
export function CreateSegmentDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: CreateSegmentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('请输入 Segment 名称');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onConfirm(name.trim(), description.trim());
      // Reset form
      setName('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDescription('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Library className="text-orange-600" size={20} />
            <h2 className="text-lg font-bold">创建 Segment</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            <p>已选择 <strong>{selectedCount}</strong> 条消息</p>
            <p className="text-xs text-orange-600 mt-1">
              这些消息将被保存为一个 Segment，可以分享给其他成员
            </p>
          </div>

          <div>
            <label htmlFor="segment-name" className="block text-sm font-medium text-gray-700 mb-1">
              Segment 名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="segment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：项目介绍、技术讨论"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isSubmitting}
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="segment-description" className="block text-sm font-medium text-gray-700 mb-1">
              描述（可选）
            </label>
            <textarea
              id="segment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述这个 Segment 的内容..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              disabled={isSubmitting}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? '创建中...' : '创建 Segment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
