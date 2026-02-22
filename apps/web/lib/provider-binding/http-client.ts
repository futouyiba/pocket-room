/**
 * HTTP Client with Automatic Authentication Injection
 * 
 * Provides a unified HTTP client that automatically injects Authorization Bearer tokens
 * and handles token refresh on 401 responses.
 * 
 * Business logic doesn't need to handle tokens manually.
 * 
 * Requirements: 2.7
 */

import { getValidAccessToken, TokenRefreshError } from './token-refresh';
import { createLogger } from './logger';

const logger = createLogger('HttpClient');

/**
 * HTTP request options
 */
export interface HttpClientOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Maximum number of retry attempts for 401 responses (default: 1) */
  maxRetries?: number;
}

/**
 * HTTP client response
 */
export interface HttpClientResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

/**
 * HTTP client error
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

/**
 * HTTP Client class
 * 
 * Automatically injects Authorization header and handles token refresh.
 */
export class HttpClient {
  constructor(private readonly connectionId: string) {}
  
  /**
   * Make an HTTP request with automatic authentication
   * 
   * @param url - Request URL
   * @param options - Request options
   * @returns Response data
   */
  async request<T = any>(
    url: string,
    options: HttpClientOptions = {}
  ): Promise<HttpClientResponse<T>> {
    const maxRetries = options.maxRetries ?? 1;
    let lastError: Error | null = null;
    
    // Try request with automatic retry on 401
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Get valid access token (automatically refreshes if needed)
        const accessToken = await getValidAccessToken(this.connectionId);
        
        // Build headers with Authorization
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        };
        
        logger.debug('Making HTTP request', {
          url,
          method: options.method || 'GET',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
        });
        
        // Make request
        const response = await fetch(url, {
          ...options,
          headers,
        });
        
        // Handle 401 Unauthorized - token might be invalid
        if (response.status === 401 && attempt < maxRetries) {
          logger.warn('Received 401 response, will retry with token refresh', {
            url,
            attempt: attempt + 1,
          });
          
          // Force token refresh by continuing to next iteration
          // getValidAccessToken will refresh the token on next attempt
          continue;
        }
        
        // Handle other error responses
        if (!response.ok) {
          const errorBody = await this.parseErrorResponse(response);
          throw new HttpClientError(
            `HTTP request failed: ${response.statusText}`,
            response.status,
            response.statusText,
            errorBody
          );
        }
        
        // Parse response
        const data = await this.parseResponse<T>(response);
        
        logger.debug('HTTP request successful', {
          url,
          status: response.status,
        });
        
        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error as Error;
        
        // If it's a TokenRefreshError, don't retry
        if (error instanceof TokenRefreshError) {
          logger.error('Token refresh failed, cannot retry', {
            connectionId: this.connectionId,
            error: error.message,
          });
          throw error;
        }
        
        // If it's not a 401 error or we've exhausted retries, throw
        if (!(error instanceof HttpClientError) || error.status !== 401 || attempt >= maxRetries) {
          throw error;
        }
        
        // Otherwise, retry
        logger.info('Retrying request after error', {
          url,
          attempt: attempt + 1,
          error: error.message,
        });
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Request failed after all retries');
  }
  
  /**
   * Make a GET request
   */
  async get<T = any>(url: string, options: HttpClientOptions = {}): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }
  
  /**
   * Make a POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options: HttpClientOptions = {}
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  /**
   * Make a PUT request
   */
  async put<T = any>(
    url: string,
    body?: any,
    options: HttpClientOptions = {}
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  /**
   * Make a PATCH request
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options: HttpClientOptions = {}
  ): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  
  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, options: HttpClientOptions = {}): Promise<HttpClientResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
  
  /**
   * Parse response body
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as any;
    }
    
    // Default to JSON
    return response.json();
  }
  
  /**
   * Parse error response body
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch {
      return null;
    }
  }
}

/**
 * Get an HTTP client for a connection
 * 
 * This is the main entry point for business logic to make authenticated API calls.
 * 
 * @param connectionId - Connection ID
 * @returns HTTP client with automatic authentication
 * 
 * @example
 * ```typescript
 * // Business logic doesn't need to handle tokens
 * const client = getClient(connectionId);
 * const response = await client.post('https://api.openai.com/v1/chat/completions', {
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
export function getClient(connectionId: string): HttpClient {
  return new HttpClient(connectionId);
}
