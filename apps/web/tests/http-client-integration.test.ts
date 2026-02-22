/**
 * HTTP Client Integration Tests
 * 
 * Tests integration between HTTP client and token refresh system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClient, HttpClient } from '../lib/provider-binding/http-client';
import * as tokenRefresh from '../lib/provider-binding/token-refresh';
import * as connectionStore from '../lib/provider-binding/connection-store';
import type { Connection } from '../lib/provider-binding/types';

// Mock modules
vi.mock('../lib/provider-binding/token-refresh');
vi.mock('../lib/provider-binding/connection-store');
vi.mock('../lib/provider-binding/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('HTTP Client Integration', () => {
  const mockConnectionId = 'test-connection-id';
  const mockAccessToken = 'valid-access-token';
  const mockRefreshedToken = 'refreshed-access-token';
  const mockUrl = 'https://api.openai.com/v1/chat/completions';
  
  const mockConnection: Connection = {
    id: mockConnectionId,
    userId: 'user-123',
    provider: 'openai',
    scopes: ['openai'],
    accessToken: mockAccessToken,
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Default mocks
    vi.mocked(tokenRefresh.getValidAccessToken).mockResolvedValue(mockAccessToken);
    vi.mocked(connectionStore.getConnection).mockResolvedValue(mockConnection);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Token Refresh Integration', () => {
    it('should use getValidAccessToken which handles refresh automatically', async () => {
      const client = getClient(mockConnectionId);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.get(mockUrl);
      
      // Verify getValidAccessToken was called (which handles refresh)
      expect(tokenRefresh.getValidAccessToken).toHaveBeenCalledWith(mockConnectionId);
      
      // Verify token was used in request
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });
    
    it('should handle token refresh on 401 response', async () => {
      const client = getClient(mockConnectionId);
      
      // First call returns 401
      const mock401Response = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ error: 'invalid_token' }),
      };
      
      // Second call succeeds with refreshed token
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mock401Response as any)
        .mockResolvedValueOnce(mockSuccessResponse as any);
      
      // Mock token refresh returning new token
      vi.mocked(tokenRefresh.getValidAccessToken)
        .mockResolvedValueOnce(mockAccessToken) // First attempt
        .mockResolvedValueOnce(mockRefreshedToken); // After refresh
      
      const response = await client.get(mockUrl);
      
      expect(response.data).toEqual({ success: true });
      
      // Verify retry happened
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(tokenRefresh.getValidAccessToken).toHaveBeenCalledTimes(2);
      
      // Verify second request used refreshed token
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockRefreshedToken}`,
          }),
        })
      );
    });
    
    it('should propagate TokenRefreshError when refresh fails', async () => {
      const client = getClient(mockConnectionId);
      const refreshError = new tokenRefresh.TokenRefreshError(
        'Refresh token expired',
        mockConnectionId,
        'openai',
        true
      );
      
      vi.mocked(tokenRefresh.getValidAccessToken).mockRejectedValue(refreshError);
      
      await expect(client.get(mockUrl)).rejects.toThrow(tokenRefresh.TokenRefreshError);
      
      // Verify no HTTP request was made
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
  
  describe('Real-world Scenarios', () => {
    it('should handle OpenAI API call with automatic token management', async () => {
      const client = getClient(mockConnectionId);
      const mockApiResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you today?'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockApiResponse as any);
      
      // Business logic makes API call without handling tokens
      const response = await client.post(mockUrl, {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      // Verify response
      expect(response.data.choices[0].message.content).toBe('Hello! How can I help you today?');
      expect(response.data.usage.total_tokens).toBe(30);
      
      // Verify token was injected automatically
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('gpt-4'),
        })
      );
    });
    
    it('should handle token expiration during long-running operation', async () => {
      const client = getClient(mockConnectionId);
      
      // Simulate token expiring between requests
      let requestCount = 0;
      vi.mocked(global.fetch).mockImplementation(async () => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request succeeds
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            json: async () => ({ result: 'first' }),
          } as any;
        } else if (requestCount === 2) {
          // Second request fails with 401 (token expired)
          return {
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            headers: new Headers(),
            json: async () => ({ error: 'token_expired' }),
          } as any;
        } else {
          // Third request succeeds with refreshed token
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            json: async () => ({ result: 'third' }),
          } as any;
        }
      });
      
      // Mock token refresh
      vi.mocked(tokenRefresh.getValidAccessToken)
        .mockResolvedValueOnce(mockAccessToken) // First request
        .mockResolvedValueOnce(mockAccessToken) // Second request (before 401)
        .mockResolvedValueOnce(mockRefreshedToken); // After refresh
      
      // First request succeeds
      const response1 = await client.get(mockUrl);
      expect(response1.data.result).toBe('first');
      
      // Second request fails with 401, then retries with refreshed token
      const response2 = await client.get(mockUrl);
      expect(response2.data.result).toBe('third');
      
      // Verify total requests
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(tokenRefresh.getValidAccessToken).toHaveBeenCalledTimes(3);
    });
    
    it('should handle concurrent requests with same connection', async () => {
      const client = getClient(mockConnectionId);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      // Make multiple concurrent requests
      const requests = [
        client.get(`${mockUrl}/1`),
        client.get(`${mockUrl}/2`),
        client.get(`${mockUrl}/3`),
      ];
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.data.success).toBe(true);
      });
      
      // All requests should use the same token
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(tokenRefresh.getValidAccessToken).toHaveBeenCalledTimes(3);
      
      // Verify all used correct token
      for (let i = 1; i <= 3; i++) {
        expect(global.fetch).toHaveBeenNthCalledWith(
          i,
          `${mockUrl}/${i}`,
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': `Bearer ${mockAccessToken}`,
            }),
          })
        );
      }
    });
  });
  
  describe('Error Recovery', () => {
    it('should recover from transient 401 errors', async () => {
      const client = getClient(mockConnectionId);
      
      // First attempt: 401
      // Second attempt: success
      const mock401 = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ error: 'invalid_token' }),
      };
      
      const mockSuccess = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ recovered: true }),
      };
      
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mock401 as any)
        .mockResolvedValueOnce(mockSuccess as any);
      
      const response = await client.get(mockUrl);
      
      expect(response.data.recovered).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    
    it('should fail after max retries exhausted', async () => {
      const client = getClient(mockConnectionId);
      
      const mock401 = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ error: 'invalid_token' }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mock401 as any);
      
      await expect(client.get(mockUrl, { maxRetries: 2 })).rejects.toThrow();
      
      // Should try 3 times (initial + 2 retries)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
