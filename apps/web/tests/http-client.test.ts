/**
 * HTTP Client Tests
 * 
 * Tests for automatic authentication injection and token refresh handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClient, HttpClient, HttpClientError } from '../lib/provider-binding/http-client';
import { TokenRefreshError } from '../lib/provider-binding/token-refresh';
import * as tokenRefresh from '../lib/provider-binding/token-refresh';

// Mock the token refresh module
vi.mock('../lib/provider-binding/token-refresh', () => ({
  getValidAccessToken: vi.fn(),
  TokenRefreshError: class TokenRefreshError extends Error {
    constructor(
      message: string,
      public readonly connectionId: string,
      public readonly provider: string,
      public readonly shouldReauthorize: boolean = true
    ) {
      super(message);
      this.name = 'TokenRefreshError';
    }
  },
}));

// Mock the logger
vi.mock('../lib/provider-binding/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('HttpClient', () => {
  const mockConnectionId = 'test-connection-id';
  const mockAccessToken = 'test-access-token';
  const mockUrl = 'https://api.example.com/test';
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = vi.fn();
    
    // Default mock for getValidAccessToken
    vi.mocked(tokenRefresh.getValidAccessToken).mockResolvedValue(mockAccessToken);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('getClient', () => {
    it('should create an HttpClient instance', () => {
      const client = getClient(mockConnectionId);
      expect(client).toBeInstanceOf(HttpClient);
    });
  });
  
  describe('request', () => {
    it('should inject Authorization header automatically', async () => {
      const client = getClient(mockConnectionId);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.request(mockUrl);
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });
    
    it('should call getValidAccessToken to get token', async () => {
      const client = getClient(mockConnectionId);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.request(mockUrl);
      
      expect(tokenRefresh.getValidAccessToken).toHaveBeenCalledWith(mockConnectionId);
    });
    
    it('should preserve custom headers', async () => {
      const client = getClient(mockConnectionId);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.request(mockUrl, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
    
    it('should return response data on success', async () => {
      const client = getClient(mockConnectionId);
      const mockData = { result: 'success', value: 42 };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockData),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      const response = await client.request(mockUrl);
      
      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
    });
    
    it('should throw HttpClientError on non-OK response', async () => {
      const client = getClient(mockConnectionId);
      const mockError = { error: 'Bad Request' };
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockError),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await expect(client.request(mockUrl)).rejects.toThrow(HttpClientError);
      await expect(client.request(mockUrl)).rejects.toThrow('HTTP request failed: Bad Request');
    });
    
    it('should retry on 401 response', async () => {
      const client = getClient(mockConnectionId);
      const mockData = { success: true };
      
      // First call returns 401, second call succeeds
      const mock401Response = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockData),
      };
      
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(mock401Response as any)
        .mockResolvedValueOnce(mockSuccessResponse as any);
      
      const response = await client.request(mockUrl);
      
      expect(response.data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(tokenRefresh.getValidAccessToken).toHaveBeenCalledTimes(2);
    });
    
    it('should not retry on 401 if maxRetries is 0', async () => {
      const client = getClient(mockConnectionId);
      const mock401Response = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mock401Response as any);
      
      await expect(client.request(mockUrl, { maxRetries: 0 })).rejects.toThrow(HttpClientError);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('should throw TokenRefreshError if token refresh fails', async () => {
      const client = getClient(mockConnectionId);
      const refreshError = new TokenRefreshError(
        'Token refresh failed',
        mockConnectionId,
        'openai',
        true
      );
      
      vi.mocked(tokenRefresh.getValidAccessToken).mockRejectedValue(refreshError);
      
      await expect(client.request(mockUrl)).rejects.toThrow(TokenRefreshError);
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should handle text responses', async () => {
      const client = getClient(mockConnectionId);
      const mockText = 'Plain text response';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: vi.fn().mockResolvedValue(mockText),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      const response = await client.request(mockUrl);
      
      expect(response.data).toBe(mockText);
    });
  });
  
  describe('HTTP method helpers', () => {
    it('should make GET request', async () => {
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
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
    
    it('should make POST request with body', async () => {
      const client = getClient(mockConnectionId);
      const mockBody = { key: 'value' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.post(mockUrl, mockBody);
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockBody),
        })
      );
    });
    
    it('should make PUT request with body', async () => {
      const client = getClient(mockConnectionId);
      const mockBody = { key: 'value' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.put(mockUrl, mockBody);
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockBody),
        })
      );
    });
    
    it('should make PATCH request with body', async () => {
      const client = getClient(mockConnectionId);
      const mockBody = { key: 'value' };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.patch(mockUrl, mockBody);
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(mockBody),
        })
      );
    });
    
    it('should make DELETE request', async () => {
      const client = getClient(mockConnectionId);
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({}),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      await client.delete(mockUrl);
      
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
  
  describe('Business logic integration', () => {
    it('should allow business logic to make API calls without handling tokens', async () => {
      // Simulate business logic making an API call
      const connectionId = 'user-openai-connection';
      const client = getClient(connectionId);
      
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          id: 'chatcmpl-123',
          choices: [{ message: { content: 'Hello!' } }],
        }),
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);
      
      // Business logic doesn't need to know about tokens
      const response = await client.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello!' }],
      });
      
      expect(response.data.choices[0].message.content).toBe('Hello!');
      
      // Verify Authorization header was injected automatically
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });
  });
});
