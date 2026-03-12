/**
 * Fallback Polling Strategy
 * 
 * When Supabase Realtime is unavailable, falls back to polling mode.
 * Polls for new messages every 5 seconds.
 * 
 * Requirements: 8.6
 */

import { createClient } from '@/lib/supabase/client';
import { createLogger } from '@/lib/provider-binding/logger';

const logger = createLogger('FallbackPolling');

export interface PollingOptions {
  roomId: string;
  onNewMessages: (messages: any[]) => void;
  onError: (error: Error) => void;
  interval?: number; // milliseconds
}

export class FallbackPolling {
  private roomId: string;
  private onNewMessages: (messages: any[]) => void;
  private onError: (error: Error) => void;
  private interval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private lastFetchedAt: string;
  private isPolling: boolean = false;
  private supabase = createClient();

  constructor(options: PollingOptions) {
    this.roomId = options.roomId;
    this.onNewMessages = options.onNewMessages;
    this.onError = options.onError;
    this.interval = options.interval || 5000; // Default 5 seconds
    this.lastFetchedAt = new Date().toISOString();
  }

  /**
   * Start polling for new messages
   */
  start() {
    if (this.isPolling) {
      logger.warn('Polling already started', { roomId: this.roomId });
      return;
    }

    logger.info('Starting fallback polling', {
      roomId: this.roomId,
      interval: this.interval,
    });

    this.isPolling = true;
    this.poll(); // Initial poll
    this.intervalId = setInterval(() => this.poll(), this.interval);
  }

  /**
   * Stop polling
   */
  stop() {
    if (!this.isPolling) {
      return;
    }

    logger.info('Stopping fallback polling', { roomId: this.roomId });

    this.isPolling = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Poll for new messages
   */
  private async poll() {
    try {
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('room_id', this.roomId)
        .gt('created_at', this.lastFetchedAt)
        .order('created_at', { ascending: true }) as { data: Array<{ created_at: string; [key: string]: any }> | null; error: any };

      if (error) {
        throw error;
      }

      if (messages && messages.length > 0) {
        logger.info('Fetched new messages via polling', {
          roomId: this.roomId,
          count: messages.length,
        });

        // Update last fetched timestamp
        this.lastFetchedAt = messages[messages.length - 1].created_at;

        // Notify callback
        this.onNewMessages(messages);
      }
    } catch (error) {
      logger.error('Polling error', {
        roomId: this.roomId,
        error: error instanceof Error ? error.message : 'Unknown',
      });

      this.onError(error instanceof Error ? error : new Error('Polling failed'));
    }
  }

  /**
   * Check if polling is active
   */
  isActive(): boolean {
    return this.isPolling;
  }
}
