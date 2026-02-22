'use client';

/**
 * Invite to Room Dialog Component
 * 
 * Allows room members to invite new users with optional segment sharing.
 * Requirements: 10.1, 10.2
 */

import { useState } from 'react';
import { createLogger } from '@/lib/provider-binding/logger';
import SegmentCreator from '@/components/segments/segment-creator';

const logger = createLogger('InviteToRoomDialog');

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface InviteToRoomDialogProps {
  roomId: string;
  roomName: string;
  messages: Message[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'invite' | 'segment';

export default function InviteToRoomDialog({
  roomId,
  roomName,
  messages,
  open,
  onClose,
  onSuccess,
}: InviteToRoomDialogProps) {
  const [step, setStep] = useState<Step>('invite');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [includeSegment, setIncludeSegment] = useState(false);
  const [segmentData, setSegmentData] = useState<{
    name: string;
    description?: string;
    messageIds: string[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!open) return null;
  
  const handleInviteNext = () => {
    setError(null);
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteeEmail.trim()) {
      setError('请输入邮箱地址');
      return;
    }
    
    if (!emailRegex.test(inviteeEmail)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    
    if (includeSegment) {
      setStep('segment');
    } else {
      handleSubmit();
    }
  };
  
  const handleSegmentCreate = (segment: {
    name: string;
    description?: string;
    messageIds: string[];
  }) => {
    setSegmentData(segment);
    handleSubmit(segment);
  };
  
  const handleSubmit = async (segment?: {
    name: string;
    description?: string;
    messageIds: string[];
  }) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      logger.info('Creating invitation', {
        roomId,
        inviteeEmail,
        hasSegment: !!segment,
      });
      
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          inviteeEmails: [inviteeEmail],
          segmentData: segment || segmentData || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '创建邀请失败');
      }
      
      logger.info('Invitation created successfully', {
        invitationCount: data.invitations.length,
        segmentId: data.segmentId,
      });
      
      // Success! Close dialog and notify parent
      handleClose();
      onSuccess?.();
    } catch (err) {
      logger.error('Failed to create invitation', err);
      setError(err instanceof Error ? err.message : '创建邀请失败');
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    setStep('invite');
    setInviteeEmail('');
    setIncludeSegment(false);
    setSegmentData(null);
    setError(null);
    setIsSubmitting(false);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl overflow-hidden flex flex-col">
        {step === 'invite' ? (
          <>
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                邀请用户加入 {roomName}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                邀请新成员并可选择分享上下文
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Invitee Email Input */}
              <div>
                <label htmlFor="invitee-email" className="block text-sm font-medium text-gray-700">
                  邀请用户（邮箱）*
                </label>
                <input
                  id="invitee-email"
                  type="email"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Include Segment Option (需求 10.1) */}
              <div className="rounded-md border border-gray-200 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSegment}
                    onChange={(e) => setIncludeSegment(e.target.checked)}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      分享上下文 Segment
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      选择 Room 中的消息创建 Segment，帮助新成员快速了解之前的讨论
                    </p>
                  </div>
                </label>
              </div>
              
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleInviteNext}
                disabled={isSubmitting}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? '处理中...' : includeSegment ? '下一步' : '发送邀请'}
              </button>
            </div>
          </>
        ) : (
          <SegmentCreator
            messages={messages}
            onSegmentCreate={handleSegmentCreate}
            onCancel={() => setStep('invite')}
          />
        )}
      </div>
    </div>
  );
}
