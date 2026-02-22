/**
 * Token Refresh Tests
 * 
 * Unit tests for automatic token refresh functionality.
 * Validates requirements 2.4 and 2.5.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  refreshTokenIfNeeded,
  getValidAccessToken,
  TokenRefreshError,
  batchRefreshTokens,
} from '@/lib/provider-binding/token-refresh';
import * as connectionStore from '@/lib/provider-binding/connection-store';
import * as providers from '@/lib/provider-binding/providers';
import type { Connection } from '@/lib/provider-binding/types';

// Mock dependencies
vi.mock('@/lib/provider-binding/connection-store');
vi.mock('@/lib/provider-binding/providers');
vi.mock('@/lib/provider-binding/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Token Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('refreshTokenIfNeeded', () => {
    it('should return null if connection not found', async () => {
      vi.mocked(connectionStore.getConnection).mockResolvedValue(null);
      
      const result = await refreshTokenIfNeeded('non-existent-id');
      
      expect(result).toBeNull();
      expect(connectionStore.getConnection).toHaveBeenCalledWith('non-existent-id');
    });
    
    it('should return connection unchanged if token not expiring soon', async () => {
      const connection: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(connectionStore.getConnection).mockResolvedValue(connection);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(false);
      vi.mocked(connectionStore.isTokenExpired).mockReturnValue(false);
      
      const result = await refreshTokenIfNeeded('conn-1');
      
      expect(result).toEqual(connection);
      expect(connectionStore.updateConnection).not.toHaveBeenCalled();
    });
    
    it('should refresh token if expiring soon', async () => {
      const connection: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 60 * 1000), // 1 minute from now
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const refreshedConnection: Connection = {
        ...connection,
        accessToken: 'new-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        updatedAt: new Date(),
      };
      
      const mockProvider = {
        refresh: vi.fn().mockResolvedValue(refreshedConnection),
      };
      
      vi.mocked(connectionStore.getConnection).mockResolvedValue(connection);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(true);
      vi.mocked(connectionStore.isTokenExpired).mockReturnValue(false);
      vi.mocked(providers.getProviderInstance).mockReturnValue(mockProvider as any);
      vi.mocked(connectionStore.updateConnection).mockResolvedValue(refreshedConnection);
      
      const result = await refreshTokenIfNeeded('conn-1');
      
      expect(result).toEqual(refreshedConnection);
      expect(mockProvider.refresh).toHaveBeenCalledWith(connection);
      expect(connectionStore.updateConnection).toHaveBeenCalledWith('conn-1', {
        accessToken: 'new-token',
        refreshToken: 'refresh-token',
        expiresIn: expect.any(Number),
      });
    });
    
    it('should throw TokenRefreshError if no refresh token available', async () => {
      const connection: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'old-token',
        refreshToken: undefined, // No refresh token
        expiresAt: new Date(Date.now() + 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(connectionStore.getConnection).mockResolvedValue(connection);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(true);
      
      await expect(refreshTokenIfNeeded('conn-1')).rejects.toThrow(TokenRefreshError);
      await expect(refreshTokenIfNeeded('conn-1')).rejects.toThrow('No refresh token available');
    });
    
    it('should throw TokenRefreshError if refresh fails', async () => {
      const connection: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockProvider = {
        refresh: vi.fn().mockRejectedValue(new Error('invalid_grant')),
      };
      
      vi.mocked(connectionStore.getConnection).mockResolvedValue(connection);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(true);
      vi.mocked(providers.getProviderInstance).mockReturnValue(mockProvider as any);
      
      await expect(refreshTokenIfNeeded('conn-1')).rejects.toThrow(TokenRefreshError);
      
      try {
        await refreshTokenIfNeeded('conn-1');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenRefreshError);
        expect((error as TokenRefreshError).shouldReauthorize).toBe(true);
      }
    });
    
    it('should handle already expired tokens', async () => {
      const connection: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const refreshedConnection: Connection = {
        ...connection,
        accessToken: 'new-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(),
      };
      
      const mockProvider = {
        refresh: vi.fn().mockResolvedValue(refreshedConnection),
      };
      
      vi.mocked(connectionStore.getConnection).mockResolvedValue(connection);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(false);
      vi.mocked(connectionStore.isTokenExpired).mockReturnValue(true);
      vi.mocked(providers.getProviderInstance).mockReturnValue(mockProvider as any);
      vi.mocked(connectionStore.updateConnection).mockResolvedValue(refreshedConnection);
      
      const result = await refreshTokenIfNeeded('conn-1');
      
      expect(result).toEqual(refreshedConnection);
      expect(mockProvider.refresh).toHaveBeenCalled();
    });
  });
  
  describe('getValidAccessToken', () => {
    it('should return access token after refresh if needed', async () => {
      const connection: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(connectionStore.getConnection).mockResolvedValue(connection);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(false);
      vi.mocked(connectionStore.isTokenExpired).mockReturnValue(false);
      
      const token = await getValidAccessToken('conn-1');
      
      expect(token).toBe('valid-token');
    });
    
    it('should throw error if connection not found', async () => {
      vi.mocked(connectionStore.getConnection).mockResolvedValue(null);
      
      await expect(getValidAccessToken('non-existent')).rejects.toThrow('Connection not found');
    });
  });
  
  describe('batchRefreshTokens', () => {
    it('should refresh multiple connections', async () => {
      const connection1: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const connection2: Connection = {
        id: 'conn-2',
        userId: 'user-1',
        provider: 'google',
        scopes: ['scope'],
        accessToken: 'token-2',
        refreshToken: 'refresh-2',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(connectionStore.getConnection)
        .mockResolvedValueOnce(connection1)
        .mockResolvedValueOnce(connection2);
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(false);
      vi.mocked(connectionStore.isTokenExpired).mockReturnValue(false);
      
      const results = await batchRefreshTokens(['conn-1', 'conn-2']);
      
      expect(results.size).toBe(2);
      expect(results.get('conn-1')).toEqual(connection1);
      expect(results.get('conn-2')).toEqual(connection2);
    });
    
    it('should handle mixed success and failure', async () => {
      const connection1: Connection = {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'openai',
        scopes: ['openai.api'],
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(connectionStore.getConnection)
        .mockResolvedValueOnce(connection1)
        .mockResolvedValueOnce(null); // Second connection not found
      vi.mocked(connectionStore.isTokenExpiringSoon).mockReturnValue(false);
      vi.mocked(connectionStore.isTokenExpired).mockReturnValue(false);
      
      const results = await batchRefreshTokens(['conn-1', 'conn-2']);
      
      expect(results.size).toBe(1);
      expect(results.get('conn-1')).toEqual(connection1);
      expect(results.has('conn-2')).toBe(false);
    });
  });
});
