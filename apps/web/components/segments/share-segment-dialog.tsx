'use client';

/**
 * Share Segment Dialog Component
 * 
 * Allows users to share a segment to a room or via DM.
 * 
 * Requirements:
 * - 12.4: 将 Segment 分享到 Room
 * - 12.5: 通过私信分享 Segment
 */

import { useState } from 'react';
import { createLogger } from '@/lib/provider-binding/logger';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const logger = createLogger('ShareSegmentDialog');

interface Room {
  id: string;
  name: string;
}

interface ShareSegmentDialogProps {
  segmentId: string;
  segmentName: string;
  rooms: Room[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ShareSegmentDialog({
  segmentId,
  segmentName,
  rooms,
  isOpen,
  onClose,
  onSuccess,
}: ShareSegmentDialogProps) {
  const [targetType, setTargetType] = useState<'room' | 'dm'>('room');
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const handleShare = async () => {
    setError(null);
    setSuccess(false);
    
    // Validation
    if (targetType === 'room' && !targetRoomId) {
      setError('请选择一个 Room');
      return;
    }
    
    setIsSharing(true);
    
    try {
      logger.info('Sharing segment', {
        segmentId,
        targetType,
        targetRoomId,
      });
      
      const response = await fetch('/api/segments/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentId,
          targetType,
          targetId: targetRoomId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分享失败');
      }
      
      const data = await response.json();
      
      logger.info('Segment shared successfully', {
        segmentId,
        targetType,
        targetRoomId,
        messageId: data.messageId,
      });
      
      setSuccess(true);
      
      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
      
    } catch (err) {
      logger.error('Failed to share segment', err);
      setError(err instanceof Error ? err.message : '分享失败');
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleClose = () => {
    if (!isSharing) {
      setError(null);
      setSuccess(false);
      setTargetRoomId('');
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">
              分享 Segment
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              将 "{segmentName}" 分享到 Room
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Target Type Selection */}
            <div>
              <Label htmlFor="target-type">分享方式</Label>
              <select
                id="target-type"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as 'room' | 'dm')}
                disabled={isSharing}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="room">分享到 Room</option>
                <option value="dm" disabled>
                  私信分享（即将推出）
                </option>
              </select>
            </div>
            
            {/* Room Selection */}
            {targetType === 'room' && (
              <div>
                <Label htmlFor="target-room">选择 Room</Label>
                <select
                  id="target-room"
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                  disabled={isSharing}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">请选择...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* Success Message */}
            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-800">分享成功！</p>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 p-4 flex gap-3">
            <Button
              onClick={handleClose}
              disabled={isSharing}
              variant="outline"
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSharing || success}
              className="flex-1"
            >
              {isSharing ? '分享中...' : success ? '已分享' : '分享'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
