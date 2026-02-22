/**
 * Token Refresh Service
 * 
 * Automatically refreshes access tokens before they expire.
 * Handles refresh failures and notifies users to re-authorize.
 * 
 * Requirements: 2.4, 2.5
 */

import { Connection } from './types';
import { getConnection, updateConnection, isTokenExpiringSoon, isTokenExpired } from './connection-store';
import { getProviderInstance } from './providers';
import { createLogger } from './logger';

const logger = createLogger('TokenRefresh');

/**
 * Error thrown when token refresh fails
 */
export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public readonly connectionId: string,
    public readonly provider: string,
    public readonly shouldReauthorize: boolean = true
  ) {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

/**
 * Refresh a connection's access token if needed
 * 
 * Checks if the token is expiring soon (< 2 minutes) or already expired,
 * and refreshes it using the refresh_token.
 * 
 * @param connectionId - Connection ID to check and refresh
 * @returns Updated connection if refreshed, original connection if not needed, or null if not found
 * @throws TokenRefreshError if refresh fails
 */
export async function refreshTokenIfNeeded(
  connectionId: string
): Promise<Connection | null> {
  // Get current connection
  const connection = await getConnection(connectionId);
  
  if (!connection) {
    logger.warn('Connection not found for refresh', { connectionId });
    return null;
  }
  
  // Check if token needs refresh
  const needsRefresh = isTokenExpiringSoon(connection) || isTokenExpired(connection);
  
  if (!needsRefresh) {
    logger.debug('Token does not need refresh', {
      connectionId,
      provider: connection.provider,
      expiresAt: connection.expiresAt.toISOString(),
    });
    return connection;
  }
  
  // Check if refresh token is available
  if (!connection.refreshToken) {
    logger.error('No refresh token available', {
      connectionId,
      provider: connection.provider,
    });
    throw new TokenRefreshError(
      'No refresh token available. Please re-authorize.',
      connectionId,
      connection.provider,
      true
    );
  }
  
  logger.info('Refreshing token', {
    connectionId,
    provider: connection.provider,
    expiresAt: connection.expiresAt.toISOString(),
  });
  
  try {
    // Get provider instance
    const provider = getProviderInstance(connection.provider);
    
    // Refresh the token
    const refreshedConnection = await provider.refresh(connection);
    
    // Update in database
    const updatedConnection = await updateConnection(connectionId, {
      accessToken: refreshedConnection.accessToken,
      refreshToken: refreshedConnection.refreshToken,
      expiresIn: Math.floor((refreshedConnection.expiresAt.getTime() - Date.now()) / 1000),
    });
    
    logger.info('Token refreshed successfully', {
      connectionId,
      provider: connection.provider,
      newExpiresAt: updatedConnection.expiresAt.toISOString(),
    });
    
    return updatedConnection;
  } catch (error) {
    logger.error('Token refresh failed', {
      connectionId,
      provider: connection.provider,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Determine if user should re-authorize
    const shouldReauthorize = isRefreshErrorFatal(error);
    
    throw new TokenRefreshError(
      `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`,
      connectionId,
      connection.provider,
      shouldReauthorize
    );
  }
}

/**
 * Check if a refresh error is fatal (requires re-authorization)
 * 
 * @param error - Error from refresh attempt
 * @returns true if user should re-authorize
 */
function isRefreshErrorFatal(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }
  
  const message = error.message.toLowerCase();
  
  // Fatal errors that require re-authorization
  const fatalErrors = [
    'invalid_grant',
    'invalid refresh token',
    'refresh token expired',
    'refresh token revoked',
    'unauthorized',
    'access denied',
  ];
  
  return fatalErrors.some(fatal => message.includes(fatal));
}

/**
 * Get a valid access token for a connection
 * 
 * Automatically refreshes the token if needed.
 * This is the main entry point for getting tokens to use in API calls.
 * 
 * @param connectionId - Connection ID
 * @returns Valid access token
 * @throws TokenRefreshError if refresh fails
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const connection = await refreshTokenIfNeeded(connectionId);
  
  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  
  return connection.accessToken;
}

/**
 * Batch refresh multiple connections
 * 
 * Useful for refreshing all of a user's connections at once.
 * 
 * @param connectionIds - Array of connection IDs
 * @returns Map of connection ID to refresh result (connection or error)
 */
export async function batchRefreshTokens(
  connectionIds: string[]
): Promise<Map<string, Connection | TokenRefreshError>> {
  const results = new Map<string, Connection | TokenRefreshError>();
  
  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        const connection = await refreshTokenIfNeeded(connectionId);
        if (connection) {
          results.set(connectionId, connection);
        }
      } catch (error) {
        if (error instanceof TokenRefreshError) {
          results.set(connectionId, error);
        } else {
          results.set(
            connectionId,
            new TokenRefreshError(
              error instanceof Error ? error.message : String(error),
              connectionId,
              'unknown',
              true
            )
          );
        }
      }
    })
  );
  
  return results;
}
