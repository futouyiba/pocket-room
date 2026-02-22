'use client';

import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface TokenRefreshNotificationsProps {
  errors: Map<string, Error>;
  onReauthorize: (connectionId: string, provider: string) => void;
  onDismiss: (connectionId: string) => void;
}

export function TokenRefreshNotifications({
  errors,
  onReauthorize,
  onDismiss,
}: TokenRefreshNotificationsProps) {
  if (errors.size === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {Array.from(errors.entries()).map(([connectionId, error]) => (
        <Card key={connectionId} className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900">
                Token Refresh Failed
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {error.message}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => onReauthorize(connectionId, 'unknown')}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Re-authorize
                </Button>
                <Button
                  onClick={() => onDismiss(connectionId)}
                  size="sm"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-100"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              onClick={() => onDismiss(connectionId)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
