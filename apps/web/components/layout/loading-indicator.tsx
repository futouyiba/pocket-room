/**
 * Loading Indicator Component
 * 
 * Displays loading state during API calls or async operations.
 * Supports different sizes and variants.
 * 
 * Requirements: 8.6
 */

'use client';

import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'bar';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingIndicator({
  size = 'md',
  variant = 'spinner',
  message,
  fullScreen = false,
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinnerSize = sizeClasses[size];

  const renderSpinner = () => (
    <Loader2 className={`${spinnerSize} animate-spin text-indigo-600`} />
  );

  const renderDots = () => (
    <div className="flex gap-2">
      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );

  const renderBar = () => (
    <div className="w-full max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-indigo-600 animate-[loading_1.5s_ease-in-out_infinite]" />
    </div>
  );

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {variant === 'spinner' && renderSpinner()}
      {variant === 'dots' && renderDots()}
      {variant === 'bar' && renderBar()}
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

// Add custom animation for loading bar
const style = `
  @keyframes loading {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(0%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = style;
  document.head.appendChild(styleSheet);
}
