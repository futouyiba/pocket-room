/**
 * Error Toast Component
 * 
 * Displays user-friendly error notifications with action buttons.
 * Automatically dismisses after a timeout.
 * 
 * Requirements: 1.8, 8.6
 */

'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { ErrorResponse } from '@/lib/errors/error-handler';
import { Button } from '@/components/ui/button';

interface ErrorToastProps {
  error: ErrorResponse;
  onDismiss: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

export function ErrorToast({
  error,
  onDismiss,
  onRetry,
  autoHideDuration = 5000,
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!error.retryable && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [error.retryable, autoHideDuration, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        max-w-md w-full
        bg-white rounded-lg shadow-lg border border-red-200
        p-4
        animate-in slide-in-from-bottom-2
        ${!isVisible ? 'animate-out slide-out-to-bottom-2' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {error.message}
          </h3>

          {error.details && (
            <p className="text-sm text-gray-600 mb-2">
              {error.details}
            </p>
          )}

          {error.action && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded-md">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                {error.action}
              </p>
            </div>
          )}

          {error.retryable && onRetry && (
            <Button
              size="sm"
              onClick={onRetry}
              className="mt-3 flex items-center gap-2"
            >
              <RefreshCw size={14} />
              重试
            </Button>
          )}
        </div>

        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook for managing error toasts
 */
export function useErrorToast() {
  const [errors, setErrors] = useState<ErrorResponse[]>([]);

  const showError = (error: ErrorResponse) => {
    setErrors((prev) => [...prev, error]);
  };

  const dismissError = (index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return {
    errors,
    showError,
    dismissError,
    clearErrors,
  };
}
