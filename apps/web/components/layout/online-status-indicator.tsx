/**
 * Online Status Indicator Component
 * 
 * Displays online/offline status for room members.
 * Can be used as a badge or standalone indicator.
 * 
 * Requirements: 8.6
 */

'use client';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function OnlineStatusIndicator({
  isOnline,
  size = 'md',
  showLabel = false,
  className = '',
}: OnlineStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className={`
          ${dotSize} rounded-full
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          ${isOnline ? 'animate-pulse' : ''}
        `}
        title={isOnline ? '在线' : '离线'}
      />
      {showLabel && (
        <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {isOnline ? '在线' : '离线'}
        </span>
      )}
    </div>
  );
}
