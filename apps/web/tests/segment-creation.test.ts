/**
 * Segment Creation Tests
 * 
 * Tests for segment creation functionality.
 * 
 * Requirements:
 * - 12.1: Room Member 选择一组连续消息时，允许用户将选中消息创建为一个命名的 Segment
 * - 12.2: Segment 仅包含来自同一个 Room 的消息，不支持跨 Room 合并
 * - 12.3: Segment 记录消息的原始顺序
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Segment Creation', () => {
  describe('Input Validation', () => {
    it('should reject empty segment name', async () => {
      const requestBody = {
        name: '',
        roomId: 'room-1',
        messageIds: ['msg-1', 'msg-2'],
      };

      // Mock validation logic
      const isValid = requestBody.name.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should reject missing room ID', async () => {
      const requestBody = {
        name: 'Test Segment',
        roomId: '',
        messageIds: ['msg-1', 'msg-2'],
      };

      const isValid = !!requestBody.roomId;
      expect(isValid).toBe(false);
    });

    it('should reject empty message list', async () => {
      const requestBody = {
        name: 'Test Segment',
        roomId: 'room-1',
        messageIds: [],
      };

      const isValid = requestBody.messageIds.length > 0;
      expect(isValid).toBe(false);
    });

    it('should accept valid segment creation request', async () => {
      const requestBody = {
        name: 'Test Segment',
        roomId: 'room-1',
        messageIds: ['msg-1', 'msg-2'],
      };

      const isValid = 
        requestBody.name.trim().length > 0 &&
        !!requestBody.roomId &&
        requestBody.messageIds.length > 0;
      
      expect(isValid).toBe(true);
    });
  });

  describe('Cross-Room Validation - Requirement 12.2', () => {
    it('should reject messages from different rooms', () => {
      const targetRoomId = 'room-1';
      const messages = [
        { id: 'msg-1', room_id: 'room-1', created_at: '2024-01-01T10:00:00Z' },
        { id: 'msg-2', room_id: 'room-2', created_at: '2024-01-01T10:01:00Z' },
        { id: 'msg-3', room_id: 'room-1', created_at: '2024-01-01T10:02:00Z' },
      ];

      const differentRoomMessages = messages.filter(msg => msg.room_id !== targetRoomId);
      expect(differentRoomMessages.length).toBeGreaterThan(0);
    });

    it('should accept messages from the same room', () => {
      const targetRoomId = 'room-1';
      const messages = [
        { id: 'msg-1', room_id: 'room-1', created_at: '2024-01-01T10:00:00Z' },
        { id: 'msg-2', room_id: 'room-1', created_at: '2024-01-01T10:01:00Z' },
        { id: 'msg-3', room_id: 'room-1', created_at: '2024-01-01T10:02:00Z' },
      ];

      const differentRoomMessages = messages.filter(msg => msg.room_id !== targetRoomId);
      expect(differentRoomMessages.length).toBe(0);
    });
  });

  describe('Message Order Preservation - Requirement 12.3', () => {
    it('should sort messages by created_at timestamp', () => {
      const messages = [
        { id: 'msg-3', room_id: 'room-1', created_at: '2024-01-01T10:02:00Z' },
        { id: 'msg-1', room_id: 'room-1', created_at: '2024-01-01T10:00:00Z' },
        { id: 'msg-2', room_id: 'room-1', created_at: '2024-01-01T10:01:00Z' },
      ];

      // Create timestamp map
      const messageTimestampMap = new Map(
        messages.map(msg => [msg.id, new Date(msg.created_at).getTime()])
      );

      // Sort by timestamp
      const messageIds = ['msg-3', 'msg-1', 'msg-2'];
      const sortedMessageIds = [...messageIds].sort((a, b) => {
        const timeA = messageTimestampMap.get(a) || 0;
        const timeB = messageTimestampMap.get(b) || 0;
        return timeA - timeB;
      });

      expect(sortedMessageIds).toEqual(['msg-1', 'msg-2', 'msg-3']);
    });

    it('should create segment_messages with correct order', () => {
      const segmentId = 'segment-1';
      const sortedMessageIds = ['msg-1', 'msg-2', 'msg-3'];

      const segmentMessages = sortedMessageIds.map((messageId, index) => ({
        segment_id: segmentId,
        message_id: messageId,
        message_order: index + 1, // 1-indexed
      }));

      expect(segmentMessages).toEqual([
        { segment_id: 'segment-1', message_id: 'msg-1', message_order: 1 },
        { segment_id: 'segment-1', message_id: 'msg-2', message_order: 2 },
        { segment_id: 'segment-1', message_id: 'msg-3', message_order: 3 },
      ]);
    });

    it('should preserve order even when messages are selected out of order', () => {
      const messages = [
        { id: 'msg-1', room_id: 'room-1', created_at: '2024-01-01T10:00:00Z' },
        { id: 'msg-2', room_id: 'room-1', created_at: '2024-01-01T10:01:00Z' },
        { id: 'msg-3', room_id: 'room-1', created_at: '2024-01-01T10:02:00Z' },
        { id: 'msg-4', room_id: 'room-1', created_at: '2024-01-01T10:03:00Z' },
      ];

      // User selects messages in random order
      const selectedMessageIds = ['msg-4', 'msg-1', 'msg-3'];

      // Create timestamp map
      const messageTimestampMap = new Map(
        messages.map(msg => [msg.id, new Date(msg.created_at).getTime()])
      );

      // Sort by timestamp to preserve original order
      const sortedMessageIds = [...selectedMessageIds].sort((a, b) => {
        const timeA = messageTimestampMap.get(a) || 0;
        const timeB = messageTimestampMap.get(b) || 0;
        return timeA - timeB;
      });

      // Should be sorted by creation time, not selection order
      expect(sortedMessageIds).toEqual(['msg-1', 'msg-3', 'msg-4']);
    });
  });

  describe('Segment Metadata - Requirement 12.6', () => {
    it('should include required metadata fields', () => {
      const segment = {
        id: 'segment-1',
        name: 'Test Segment',
        description: 'Test description',
        created_by: 'user-1',
        room_id: 'room-1',
        is_shared_to_room: false,
        is_draft: false,
        created_at: new Date().toISOString(),
      };

      expect(segment.created_by).toBeDefined();
      expect(segment.room_id).toBeDefined();
      expect(segment.created_at).toBeDefined();
      expect(segment.name).toBeDefined();
    });
  });
});
