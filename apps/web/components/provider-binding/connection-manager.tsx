/**
 * Connection Manager Component
 * 
 * Example component demonstrating automatic token refresh with user notifications.
 * Shows how to integrate token refresh into a real UI component.
 */

'use client';

import { useState, useEffect } from 'react';
import { useTokenRefresh } from '@/lib/provider-binding/hooks/use-token-refresh';
import { TokenRefreshNotifications } from './token-refresh-notification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { Connection } from '@/lib/provider-binding/types';

export interface ConnectionManagerProps {
  connections: Connection[];
  onReauthorize?: (connectionId: string, provider: string) => void;
  onRevoke?: (connectionId: string) => void;
}

/**
 * Connection Manager with automatic token refresh
 * 
 * Features:
 * - Automatic token refresh every minute
 * - Visual status indicators for each connection
 * - Error notifications when refresh fails
 * - Manual refresh button
 */
export function ConnectionManager({ connections, onReauthorize, onRevoke }: ConnectionManagerProps) {
  const [refreshErrors, setRefreshErrors] = useState(new Map());
  
  const { statuses, refreshConnection, refreshAll } = useTokenRefresh(
    connections.map(c => c.id),
    {
      checkInterval: 60000, // Check every minute
      onRefreshSuccess: (connectionId, connection) => {
        console.log('Token refreshed successfully:', connectionId);
        // Remove error if it exists
        setRefreshErrors(prev => {
          const next = new Map(prev);
          next.delete(connectionId);
          return next;
        });
      },
      onRefreshError: (connectionId, error) => {
        console.error('Token refresh failed:', connectionId, error);
        // Add error to display notification
        setRefreshErrors(prev => new Map(prev).set(connectionId, error));
      },
    }
  );
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'refreshing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'refreshing':
        return <Badge variant="secondary">Refreshing...</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };
  
  const formatExpiryTime = (expiresAt: Date) => {
    const now = Date.now();
    const expiresAtMs = expiresAt.getTime();
    const diffMs = expiresAtMs - now;
    
    if (diffMs < 0) {
      return 'Expired';
    }
    
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 60) {
      return `Expires in ${diffMinutes} min`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `Expires in ${diffHours} hr`;
  };
  
  return (
    <div className="space-y-4">
      {/* Error Notifications */}
      <TokenRefreshNotifications
        errors={refreshErrors}
        onReauthorize={(connectionId, provider) => {
          onReauthorize?.(connectionId, provider);
        }}
        onDismiss={(connectionId) => {
          setRefreshErrors(prev => {
            const next = new Map(prev);
            next.delete(connectionId);
            return next;
          });
        }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Provider Connections</h2>
          <p className="text-sm text-muted-foreground">
            Manage your AI service provider connections
          </p>
        </div>
        <Button
          onClick={() => refreshAll()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>
      
      {/* Connection Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map(connection => {
          const status = statuses.get(connection.id);
          
          return (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">
                    {connection.provider}
                  </CardTitle>
                  {status && getStatusIcon(status.status)}
                </div>
                <CardDescription>
                  {connection.accountId || 'No account ID'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {status && getStatusBadge(status.status)}
                </div>
                
                {/* Expiry Time */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Token</span>
                  <span className="text-sm font-medium">
                    {formatExpiryTime(connection.expiresAt)}
                  </span>
                </div>
                
                {/* Last Refreshed */}
                {status?.lastRefreshed && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Refreshed</span>
                    <span className="text-sm">
                      {status.lastRefreshed.toLocaleTimeString()}
                    </span>
                  </div>
                )}
                
                {/* Scopes */}
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Scopes</span>
                  <div className="flex flex-wrap gap-1">
                    {connection.scopes.map(scope => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => refreshConnection(connection.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={status?.status === 'refreshing'}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => onRevoke?.(connection.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    Revoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Empty State */}
      {connections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Connections</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You haven't connected any AI service providers yet.
            </p>
            <Button onClick={() => onReauthorize?.('', 'openai')}>
              Connect Provider
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
