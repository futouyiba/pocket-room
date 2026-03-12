/**
 * Automatic Retry Mechanism
 * 
 * Implements exponential backoff retry strategy for failed operations.
 * Used for token refresh and realtime reconnection.
 * 
 * Requirements: 2.4, 8.6
 */

import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('RetryMechanism');

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.info('Attempting operation', { attempt, maxAttempts: opts.maxAttempts });
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === opts.maxAttempts) {
        logger.error('Max retry attempts reached', {
          attempts: opts.maxAttempts,
          error: lastError.message,
        });
        throw lastError;
      }

      logger.warn('Operation failed, retrying...', {
        attempt,
        nextDelay: delay,
        error: lastError.message,
      });

      opts.onRetry(attempt, lastError);

      // Wait before next attempt
      await sleep(delay);

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Retry specifically for token refresh
 * Uses 3 attempts with exponential backoff
 */
export async function retryTokenRefresh<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
      logger.warn('Token refresh retry', { attempt, error: error.message });
      onRetry?.(attempt);
    },
  });
}

/**
 * Retry specifically for realtime reconnection
 * Uses 10 attempts with exponential backoff
 */
export async function retryRealtimeConnection<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 10,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    onRetry: (attempt, error) => {
      logger.warn('Realtime reconnection retry', { attempt, error: error.message });
      onRetry?.(attempt);
    },
  });
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const retryableMessages = [
    'network',
    'timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'fetch failed',
  ];

  return retryableMessages.some((msg) =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
}
