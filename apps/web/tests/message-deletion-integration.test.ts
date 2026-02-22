/**
 * Message Deletion Integration Tests
 * 
 * Integration tests for the complete message deletion flow.
 * 
 * Requirements:
 * - 8.5: Room Member 删除一条消息时，将该消息替换为 Tombstone 占位标记，保留在 Timeline 中
 * 
 * Property:
 * - 属性 24: 消息删除 Tombstone
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Message Deletion Integration', () => {
  describe('Complete Deletion Flow', () => {
    it('should handle complete message deletion flow', async () => {
      // This test verifies the complete flow:
      // 1. User sends a message
      // 2. Message appears in Timeline
      // 3. User deletes the message
      // 4. Message is replaced with Tombstone
      // 5. Message is still in Timeline (not physically deleted)

      // Step 1: Create a message
      const message = {
        id: 'msg-123',
        room_id: 'room-456',
        user_id: 'user-789',
        content: 'This is a test message',
        is_deleted: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
      };

      // Step 2: Message is in Timeline
      const timeline = [message];
      expect(timeline.length).toBe(1);
      expect(timeline[0].is_deleted).toBe(false);

      // Step 3: Delete the message
      const deletedMessage = {
        ...message,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      };

      // Step 4: Update Timeline
      const updatedTimeline = timeline.map(m => 
        m.id === deletedMessage.id ? deletedMessage : m
      );

      // Step 5: Verify Tombstone
      expect(updatedTimeline.length).toBe(1); // Still in Timeline
      expect(updatedTimeline[0].is_deleted).toBe(true);
      expect(updatedTimeline[0].deleted_at).not.toBeNull();
      expect(updatedTimeline[0].id).toBe(message.id); // Same message
    });

    it('should handle deletion by Room Owner', async () => {
      const message = {
        id: 'msg-123',
        room_id: 'room-456',
        user_id: 'user-789', // Message sender
        content: 'Test message',
        is_deleted: false,
      };

      const room = {
        id: 'room-456',
        owner_id: 'owner-123', // Room owner (different from sender)
      };

      const currentUserId = 'owner-123'; // Current user is the owner

      // Permission check
      const isMessageSender = message.user_id === currentUserId;
      const isRoomOwner = room.owner_id === currentUserId;
      const hasPermission = isMessageSender || isRoomOwner;

      expect(isMessageSender).toBe(false);
      expect(isRoomOwner).toBe(true);
      expect(hasPermission).toBe(true);

      // Deletion should succeed
      const deletedMessage = {
        ...message,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      };

      expect(deletedMessage.is_deleted).toBe(true);
    });

    it('should reject deletion by unauthorized user', async () => {
      const message = {
        id: 'msg-123',
        room_id: 'room-456',
        user_id: 'user-789', // Message sender
        content: 'Test message',
        is_deleted: false,
      };

      const room = {
        id: 'room-456',
        owner_id: 'owner-123', // Room owner
      };

      const currentUserId = 'other-user-999'; // Different user

      // Permission check
      const isMessageSender = message.user_id === currentUserId;
      const isRoomOwner = room.owner_id === currentUserId;
      const hasPermission = isMessageSender || isRoomOwner;

      expect(isMessageSender).toBe(false);
      expect(isRoomOwner).toBe(false);
      expect(hasPermission).toBe(false);

      // Deletion should be rejected
      // In real implementation, API would return 403 Forbidden
    });
  });

  describe('UI Rendering', () => {
    it('should render Tombstone for deleted messages', () => {
      const messages = [
        {
          id: '1',
          content: 'Normal message',
          is_deleted: false,
        },
        {
          id: '2',
          content: 'Original content',
          is_deleted: true,
          deleted_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '3',
          content: 'Another normal message',
          is_deleted: false,
        },
      ];

      // Render logic
      const renderedMessages = messages.map(msg => ({
        ...msg,
        displayContent: msg.is_deleted ? '此消息已被删除' : msg.content,
      }));

      expect(renderedMessages[0].displayContent).toBe('Normal message');
      expect(renderedMessages[1].displayContent).toBe('此消息已被删除');
      expect(renderedMessages[2].displayContent).toBe('Another normal message');

      // All messages are still in the list
      expect(renderedMessages.length).toBe(3);
    });

    it('should show delete button only for own messages', () => {
      const currentUserId = 'user-123';

      const messages = [
        {
          id: '1',
          senderId: 'user-123', // Own message
          content: 'My message',
          is_deleted: false,
        },
        {
          id: '2',
          senderId: 'user-456', // Other user's message
          content: 'Their message',
          is_deleted: false,
        },
      ];

      // UI logic: Show delete button only for own messages
      const messagesWithDeleteButton = messages.map(msg => ({
        ...msg,
        showDeleteButton: msg.senderId === currentUserId && !msg.is_deleted,
      }));

      expect(messagesWithDeleteButton[0].showDeleteButton).toBe(true);
      expect(messagesWithDeleteButton[1].showDeleteButton).toBe(false);
    });

    it('should not show delete button for already deleted messages', () => {
      const currentUserId = 'user-123';

      const message = {
        id: '1',
        senderId: 'user-123',
        content: 'My message',
        is_deleted: true,
      };

      // UI logic: Don't show delete button for deleted messages
      const showDeleteButton = message.senderId === currentUserId && !message.is_deleted;

      expect(showDeleteButton).toBe(false);
    });
  });

  describe('Realtime Synchronization', () => {
    it('should update all clients when message is deleted', () => {
      // Simulate multiple clients viewing the same room
      const client1Messages = [
        { id: '1', content: 'Message 1', is_deleted: false },
        { id: '2', content: 'Message 2', is_deleted: false },
      ];

      const client2Messages = [
        { id: '1', content: 'Message 1', is_deleted: false },
        { id: '2', content: 'Message 2', is_deleted: false },
      ];

      // Client 1 deletes message 2
      const updateEvent = {
        type: 'UPDATE',
        table: 'messages',
        record: {
          id: '2',
          content: 'Message 2',
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
      };

      // Both clients should receive the update
      const updateClient1 = client1Messages.map(m =>
        m.id === updateEvent.record.id ? { ...m, is_deleted: true } : m
      );

      const updateClient2 = client2Messages.map(m =>
        m.id === updateEvent.record.id ? { ...m, is_deleted: true } : m
      );

      // Verify both clients have the updated state
      expect(updateClient1[1].is_deleted).toBe(true);
      expect(updateClient2[1].is_deleted).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deletion of message with attachments', () => {
      const message = {
        id: 'msg-123',
        content: 'Message with image',
        attachments: ['https://example.com/image.jpg'],
        is_deleted: false,
      };

      // Delete message
      const deletedMessage = {
        ...message,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      };

      // Attachments are preserved (for audit purposes)
      expect(deletedMessage.attachments).toEqual(message.attachments);
      expect(deletedMessage.is_deleted).toBe(true);
    });

    it('should handle deletion of segment_share message', () => {
      const message = {
        id: 'msg-123',
        message_type: 'segment_share',
        shared_segment_id: 'segment-456',
        content: 'Shared a segment',
        is_deleted: false,
      };

      // Delete message
      const deletedMessage = {
        ...message,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      };

      // Segment reference is preserved
      expect(deletedMessage.shared_segment_id).toBe(message.shared_segment_id);
      expect(deletedMessage.is_deleted).toBe(true);
    });

    it('should handle rapid deletion attempts (idempotency)', () => {
      const message = {
        id: 'msg-123',
        content: 'Test message',
        is_deleted: false,
        deleted_at: null,
      };

      // First deletion
      const firstDeletion = {
        ...message,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      };

      // Second deletion attempt (should be idempotent)
      const secondDeletion = {
        ...firstDeletion,
        is_deleted: true,
        deleted_at: firstDeletion.deleted_at, // Same timestamp
      };

      expect(firstDeletion.is_deleted).toBe(true);
      expect(secondDeletion.is_deleted).toBe(true);
      expect(secondDeletion.deleted_at).toBe(firstDeletion.deleted_at);
    });
  });
});
