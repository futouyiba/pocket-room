/**
 * JoinRequestItem Component
 * 
 * Displays a single join request with approval action buttons.
 * 
 * Actions:
 * - Approve: Add user as room member and notify applicant
 * - Reject: Notify applicant of rejection
 * - Block: Add to blacklist and prevent future requests
 * - Silence: Set cooldown period to prevent re-application
 * 
 * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6
 */

'use client';

import { useState } from 'react';
import { Check, X, Ban, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface JoinRequest {
  id: string;
  user_id: string;
  room_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  created_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      display_name?: string;
      avatar_url?: string;
    };
  };
}

interface JoinRequestItemProps {
  request: JoinRequest;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onBlock: (requestId: string) => Promise<void>;
  onSilence: (requestId: string, durationHours: number) => Promise<void>;
}

export function JoinRequestItem({
  request,
  onApprove,
  onReject,
  onBlock,
  onSilence,
}: JoinRequestItemProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSilenceDialog, setShowSilenceDialog] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState('24');

  const displayName = request.user?.user_metadata?.display_name || request.user?.email || 'Unknown User';
  const avatarUrl = request.user?.user_metadata?.avatar_url;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(request.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(request.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlock = async () => {
    if (!confirm('确定要封禁此用户吗？封禁后该用户将无法再次申请加入此 Room。')) {
      return;
    }
    
    setIsProcessing(true);
    try {
      await onBlock(request.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSilenceSubmit = async () => {
    const hours = parseInt(silenceDuration, 10);
    if (isNaN(hours) || hours <= 0) {
      alert('请输入有效的小时数');
      return;
    }

    setIsProcessing(true);
    try {
      await onSilence(request.id, hours);
      setShowSilenceDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div>
            <p className="font-medium text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">
              申请时间: {new Date(request.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleApprove}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
            title="批准加入"
          >
            <Check className="w-4 h-4 mr-1" />
            批准
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing}
            title="拒绝申请"
          >
            <X className="w-4 h-4 mr-1" />
            拒绝
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleBlock}
            disabled={isProcessing}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="封禁用户"
          >
            <Ban className="w-4 h-4 mr-1" />
            封禁
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSilenceDialog(true)}
            disabled={isProcessing}
            title="静默（设置冷却期）"
          >
            <Clock className="w-4 h-4 mr-1" />
            静默
          </Button>
        </div>
      </div>

      <Dialog open={showSilenceDialog} onOpenChange={setShowSilenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置静默冷却期</DialogTitle>
            <DialogDescription>
              在冷却期内，该用户将无法重新申请加入此 Room。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="silence-duration">冷却时长（小时）</Label>
            <Input
              id="silence-duration"
              type="number"
              min="1"
              value={silenceDuration}
              onChange={(e) => setSilenceDuration(e.target.value)}
              placeholder="24"
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSilenceDialog(false)}
              disabled={isProcessing}
            >
              取消
            </Button>
            <Button
              onClick={handleSilenceSubmit}
              disabled={isProcessing}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
