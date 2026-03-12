/**
 * CompanionCard Component
 * 
 * Displays a Companion in the Room with visual status indicators.
 * Validates requirement: 14.1, 14.6
 * 
 * Status colors:
 * - summoned: Gray (standby mode - in room but silent)
 * - pending_approval: Yellow (waiting for owner approval)
 * - processing: Blue (actively generating response)
 * - completed: Green (response delivered)
 */

import { Bot, Clock, Loader2, CheckCircle, Sparkles } from 'lucide-react';

interface CompanionCardProps {
  companionName: string;
  status: 'summoned' | 'pending_approval' | 'processing' | 'completed';
  isOwner: boolean;
  triggeredBy?: string;
  ownerName?: string;
  requesterName?: string;
  onDismiss?: () => void;
  onRequest?: () => void;
  onApprove?: () => void;
}

export function CompanionCard({
  companionName,
  status,
  isOwner,
  triggeredBy,
  ownerName,
  requesterName,
  onDismiss,
  onRequest,
  onApprove,
}: CompanionCardProps) {
  // Determine visual styling based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'summoned':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          iconColor: 'text-gray-400',
          borderColor: 'border-gray-300',
          label: '待命',
          description: '在场但不发言',
        };
      case 'pending_approval':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          borderColor: 'border-yellow-300',
          label: '等待批准',
          description: isOwner && requesterName 
            ? `${requesterName} 请求回应` 
            : ownerName 
            ? `等待 ${ownerName} 的批准` 
            : '等待主人批准',
        };
      case 'processing':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-300',
          label: '思考中',
          description: '正在生成回应...',
        };
      case 'completed':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          borderColor: 'border-green-300',
          label: '已完成',
          description: '回应已发送',
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          iconColor: 'text-gray-400',
          borderColor: 'border-gray-300',
          label: '未知',
          description: '',
        };
    }
  };

  const config = getStatusConfig();

  // Render status icon
  const renderStatusIcon = () => {
    switch (status) {
      case 'summoned':
        return <Bot size={20} className={config.iconColor} />;
      case 'pending_approval':
        return <Clock size={20} className={config.iconColor} />;
      case 'processing':
        return <Loader2 size={20} className={`${config.iconColor} animate-spin`} />;
      case 'completed':
        return <CheckCircle size={20} className={config.iconColor} />;
      default:
        return <Bot size={20} className={config.iconColor} />;
    }
  };

  return (
    <div
      data-testid={`companion-card-${status}`}
      className={`
        ${config.bgColor} 
        ${config.borderColor} 
        border rounded-lg p-3 
        flex items-center gap-3
        transition-all duration-200
        ${status === 'summoned' ? 'opacity-70' : 'opacity-100'}
      `}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {renderStatusIcon()}
      </div>

      {/* Companion Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-sm ${config.textColor}`}>
            {companionName}
          </h3>
          {isOwner && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 text-gray-600">
              你的
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs ${config.textColor} font-medium`}>
            {config.label}
          </span>
          {config.description && (
            <>
              <span className={`text-xs ${config.textColor} opacity-50`}>•</span>
              <span className={`text-xs ${config.textColor} opacity-75`}>
                {config.description}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Dismiss button (optional) */}
      {onDismiss && status === 'completed' && (
        <button
          onClick={onDismiss}
          className={`text-xs ${config.textColor} hover:opacity-75 transition`}
          title="关闭"
        >
          ✕
        </button>
      )}

      {/* Request button for non-owners when companion is summoned */}
      {!isOwner && status === 'summoned' && onRequest && (
        <button
          onClick={onRequest}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1"
          title="请求回应"
        >
          <Sparkles size={14} />
          请求回应
        </button>
      )}

      {/* Approve button for owners when companion is pending approval */}
      {isOwner && status === 'pending_approval' && onApprove && (
        <button
          onClick={onApprove}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-1"
          title="批准请求"
        >
          <CheckCircle size={14} />
          批准
        </button>
      )}
    </div>
  );
}
