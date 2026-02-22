/**
 * React Hook for Automatic Token Refresh
 * 
 * Monitors connections and automatically refreshes tokens before they expire.
 * Notifies users when re-authorization is required.
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { refreshTokenIfNeeded, TokenRefreshError } from '../token-refresh';
import { Connection } from '../types';

/**
 * Refresh status for a connection
 */
export interface RefreshStatus {
  connectionId: string;
  status: 'idle' | 'refreshing' | 'success' | 'error';
  error?: TokenRefreshError;
  lastRefreshed?: Date;
}

/**
 * Hook options
 */
export interface UseTokenRefreshOptions {
  /**
   * Check interval in milliseconds (default: 60000 = 1 minute)
   */
  checkInterval?: number;
  
  /**
   * Callback when refresh succeeds
   */
  onRefreshSuccess?: (connectionId: string, connection: Connection) => void;
  
  /**
   * Callback when refresh fails
   */
  onRefreshError?: (connectionId: string, error: TokenRefreshError) => void;
  
  /**
   * Enable automatic refresh (default: true)
   */
  enabled?: boolean;
}

/**
 * Hook for automatic token refresh
 * 
 * @param connectionIds - Array of connection IDs to monitor
 * @param options - Hook options
 * @returns Refresh status for each connection and manual refresh function
 */
export function useTokenRefresh(
  connectionIds: string[],
  options: UseTokenRefreshOptions = {}
) {
  const {
    checkInterval = 60000, // 1 minute
    onRefreshSuccess,
    onRefreshError,
    enabled = true,
  } = options;
  
  const [statuses, setStatuses] = useState<Map<string, RefreshStatus>>(
    new Map(connectionIds.map(id => [id, { connectionId: id, status: 'idle' }]))
  );
  
  /**
   * Refresh a single connection
   */
  const refreshConnection = useCallback(async (connectionId: string) => {
    setStatuses(prev => {
      const next = new Map(prev);
      next.set(connectionId, { connectionId, status: 'refreshing' });
      return next;
    });
    
    try {
      const connection = await refreshTokenIfNeeded(connectionId);
      
      if (connection) {
        setStatuses(prev => {
          const next = new Map(prev);
          next.set(connectionId, {
            connectionId,
            status: 'success',
            lastRefreshed: new Date(),
          });
          return next;
        });
        
        onRefreshSuccess?.(connectionId, connection);
      } else {
        // Connection not found
        setStatuses(prev => {
          const next = new Map(prev);
          next.set(connectionId, {
            connectionId,
            status: 'error',
            error: new TokenRefreshError(
              'Connection not found',
              connectionId,
              'unknown',
              false
            ),
          });
          return next;
        });
      }
    } catch (error) {
      const refreshError = error instanceof TokenRefreshError
        ? error
        : new TokenRefreshError(
            error instanceof Error ? error.message : String(error),
            connectionId,
            'unknown',
            true
          );
      
      setStatuses(prev => {
        const next = new Map(prev);
        next.set(connectionId, {
          connectionId,
          status: 'error',
          error: refreshError,
        });
        return next;
      });
      
      onRefreshError?.(connectionId, refreshError);
    }
  }, [onRefreshSuccess, onRefreshError]);
  
  /**
   * Refresh all connections
   */
  const refreshAll = useCallback(async () => {
    await Promise.all(connectionIds.map(refreshConnection));
  }, [connectionIds, refreshConnection]);
  
  /**
   * Set up automatic refresh interval
   */
  useEffect(() => {
    if (!enabled || connectionIds.length === 0) {
      return;
    }
    
    // Initial check
    refreshAll();
    
    // Set up interval
    const intervalId = setInterval(refreshAll, checkInterval);
    
    return () => clearInterval(intervalId);
  }, [enabled, connectionIds, checkInterval, refreshAll]);
  
  return {
    statuses,
    refreshConnection,
    refreshAll,
  };
}
