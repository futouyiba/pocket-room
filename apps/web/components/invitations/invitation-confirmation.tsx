'use client';

/**
 * Invitation Confirmation Component
 * 
 * Displays invitation details and provides accept/reject buttons.
 * Requirements: 3.5, 3.7
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('InvitationConfirmation');

interface InvitationConfirmationProps {
  invitation: {
    id: string;
    roomId: string;
    roomName: string;
    roomDescription: string | null;
    joinStrategy: string;
    inviterEmail: string;
    createdAt: string;
    invitationSegment?: {
      id: string;
      name: string;
      description: string | null;
      messageCount: number;
      messages: Array<{
        id: string;
        content: string;
        created_at: string;
      }>;
    };
  };
}

export default function InvitationConfirmation({
  invitation,
}: InvitationConfirmationProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleConfirm = async (accept: boolean) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      logger.info('Confirming invitation', {
        invitationId: invitation.id,
        accept,
      });
      
      const response = await fetch('/api/invitations/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          accept,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '处理邀请失败');
      }
      
      logger.info('Invitation confirmed successfully', {
        invitationId: invitation.id,
        accept,
        roomId: data.roomId,
      });
      
      if (accept) {
        // Redirect to the room
        router.push(`/rooms/${data.roomId}`);
      } else {
        // Redirect to rooms list
        router.push('/rooms');
      }
    } catch (err) {
      logger.error('Failed to confirm invitation', err);
      setError(err instanceof Error ? err.message : '处理邀请失败');
      setIsProcessing(false);
    }
  };
  
  const joinStrategyText = {
    approval: '申请审批',
    free: '自由加入',
    passcode: '密码加入',
  }[invitation.joinStrategy] || invitation.joinStrategy;
  
  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Room 邀请</h1>
        <p className="mt-2 text-sm text-gray-600">
          {invitation.inviterEmail} 邀请您加入 Room
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Room 名称
          </label>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {invitation.roomName}
          </p>
        </div>
        
        {invitation.roomDescription && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              描述
            </label>
            <p className="mt-1 text-gray-600">{invitation.roomDescription}</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            加入策略
          </label>
          <p className="mt-1 text-gray-600">{joinStrategyText}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            邀请时间
          </label>
          <p className="mt-1 text-gray-600">
            {new Date(invitation.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
        
        {/* Display invitation segment (需求 10.3) */}
        {invitation.invitationSegment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分享的上下文
            </label>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-orange-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {invitation.invitationSegment.name}
                  </h4>
                  {invitation.invitationSegment.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {invitation.invitationSegment.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    包含 {invitation.invitationSegment.messageCount} 条消息
                  </p>
                </div>
              </div>
              
              {/* Preview messages */}
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {invitation.invitationSegment.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-md bg-white p-2 text-sm border border-orange-100"
                  >
                    <p className="text-gray-900 line-clamp-2">{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => handleConfirm(false)}
          disabled={isProcessing}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? '处理中...' : '拒绝'}
        </button>
        <button
          onClick={() => handleConfirm(true)}
          disabled={isProcessing}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? '处理中...' : '接受'}
        </button>
      </div>
      
      <p className="mt-4 text-center text-xs text-gray-500">
        接受邀请后，您将成为 Room 成员并可以查看和发送消息。
      </p>
    </div>
  );
}
