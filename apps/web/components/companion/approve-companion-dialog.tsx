/**
 * ApproveCompanionDialog Component
 * 
 * Displays approval request UI for Companion Owner.
 * Validates requirement: 14.4
 * 
 * Provides two options:
 * - "批准一次" (Approve once): One-time approval for this request
 * - "始终允许该成员" (Always allow this member): Add to whitelist for automatic future approvals
 */

'use client';

import { useState } from 'react';
import { CheckCircle, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ApproveCompanionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  requesterName: string;
  onApprove: (approvalType: 'once' | 'whitelist') => Promise<void>;
}

export function ApproveCompanionDialog({
  open,
  onOpenChange,
  companionName,
  requesterName,
  onApprove,
}: ApproveCompanionDialogProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = async (approvalType: 'once' | 'whitelist') => {
    setIsApproving(true);
    try {
      await onApprove(approvalType);
      onOpenChange(false);
    } catch (error) {
      console.error('Approval failed:', error);
      // Error handling is done in the parent component
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批准 Companion 请求</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-gray-900">{requesterName}</span> 请求你的 Companion{' '}
            <span className="font-medium text-gray-900">{companionName}</span> 进行回应
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Approve Once Option */}
          <button
            onClick={() => handleApprove('once')}
            disabled={isApproving}
            className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">批准一次</h3>
                <p className="text-sm text-gray-600">
                  仅批准此次请求，下次需要重新审批
                </p>
              </div>
            </div>
          </button>

          {/* Always Allow Option */}
          <button
            onClick={() => handleApprove('whitelist')}
            disabled={isApproving}
            className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <UserPlus className="w-5 h-5 text-green-600 group-hover:text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">始终允许该成员</h3>
                <p className="text-sm text-gray-600">
                  将 {requesterName} 加入白名单，未来请求自动批准
                </p>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApproving}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
