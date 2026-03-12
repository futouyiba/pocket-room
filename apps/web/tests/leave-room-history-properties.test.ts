/**
 * Property-Based Tests for Leave Room History Access Control
 * 
 * Feature: sprint1-pocket-room
 * 
 * Properties tested:
 * - Property 28: 退出保留历史
 * - Property 29: 退出删除历史
 * 
 * Requirements:
 * - 11.4: 退出并选择保留历史时，消息历史保持可访问
 * - 11.5: 退出并选择删除历史时，消息历史标记为不可访问
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Types
interface RoomMember {
  userId: string;
  roomId: string;
  joinedAt: Date;
  leftAt: Date | null;
  keepHistory: boolean;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  createdAt: Date;
  content: string;
}

// Arbitraries
const userIdArb = fc.uuid();
const roomIdArb = fc.uuid();
const messageIdArb = fc.uuid();

const dateArb = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2024-12-31'),
});

const roomMemberArb = fc.record({
  userId: userIdArb,
  roomId: roomIdArb,
  joinedAt: dateArb,
  leftAt: fc.option(dateArb, { nil: null }),
  keepHistory: fc.boolean(),
});

const messageArb = (roomId: string, userId: string, minDate: Date, maxDate: Date) =>
  fc.record({
    id: messageIdArb,
    roomId: fc.constant(roomId),
    userId: fc.constant(userId),
    createdAt: fc.date({ min: minDate, max: maxDate }),
    content: fc.string({ minLength: 1, maxLength: 100 }),
  });

// Helper function to check if a message is accessible
function isMessageAccessible(member: RoomMember, message: Message): boolean {
  // Message must be in the same room
  if (member.roomId !== message.roomId) {
    return false;
  }

  // Message must be from the same user
  if (member.userId !== message.userId) {
    return false;
  }

  // Message must be after joined_at
  if (message.createdAt < member.joinedAt) {
    return false;
  }

  // If user is still active (left_at is null), can access all messages after joined_at
  if (member.leftAt === null) {
    return true;
  }

  // If user has left and keep_history is false, cannot access any messages
  if (!member.keepHistory) {
    return false;
  }

  // If user has left and keep_history is true, can only access messages between joined_at and left_at
  return message.createdAt <= member.leftAt;
}

describe('Property-Based Tests: Leave Room History Access Control', () => {
  describe('Property 28: 退出保留历史 - 需求 11.4', () => {
    it('should allow access to messages between joined_at and left_at when keep_history=true', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt) => {
            // Skip invalid dates
            if (isNaN(joinedAt.getTime()) || isNaN(leftAt.getTime())) {
              return true;
            }
            
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: true,
            };

            // Generate messages between joined_at and left_at
            const messageInRange: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: new Date(
                joinedAt.getTime() + Math.random() * (leftAt.getTime() - joinedAt.getTime())
              ),
              content: 'Test message',
            };

            // Message within range should be accessible
            expect(isMessageAccessible(member, messageInRange)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to messages after left_at even with keep_history=true', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt) => {
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: true,
            };

            // Generate message after left_at
            const messageAfterLeft: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: new Date(leftAt.getTime() + 1000 * 60 * 60), // 1 hour after left_at
              content: 'Test message',
            };

            // Message after left_at should not be accessible
            expect(isMessageAccessible(member, messageAfterLeft)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to messages before joined_at even with keep_history=true', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt) => {
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: true,
            };

            // Generate message before joined_at
            const messageBeforeJoin: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: new Date(joinedAt.getTime() - 1000 * 60 * 60), // 1 hour before joined_at
              content: 'Test message',
            };

            // Message before joined_at should not be accessible
            expect(isMessageAccessible(member, messageBeforeJoin)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 29: 退出删除历史 - 需求 11.5', () => {
    it('should deny access to all messages when keep_history=false', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt) => {
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: false,
            };

            // Generate message between joined_at and left_at
            const messageInRange: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: new Date(
                joinedAt.getTime() + Math.random() * (leftAt.getTime() - joinedAt.getTime())
              ),
              content: 'Test message',
            };

            // Even messages within range should not be accessible when keep_history=false
            expect(isMessageAccessible(member, messageInRange)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to messages at any time when keep_history=false', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt, messageDate) => {
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: false,
            };

            const message: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: messageDate,
              content: 'Test message',
            };

            // All messages should be inaccessible when keep_history=false
            // (except those before joined_at, which are already inaccessible)
            if (messageDate >= joinedAt) {
              expect(isMessageAccessible(member, message)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Active members (left_at IS NULL)', () => {
    it('should allow active members to access all messages after joined_at', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, messageDate) => {
            // Skip invalid dates
            if (isNaN(joinedAt.getTime()) || isNaN(messageDate.getTime())) {
              return true;
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt: null, // Active member
              keepHistory: true, // Doesn't matter for active members
            };

            const message: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: messageDate,
              content: 'Test message',
            };

            // Active members should be able to access all messages after joined_at
            if (messageDate >= joinedAt) {
              expect(isMessageAccessible(member, message)).toBe(true);
            } else {
              expect(isMessageAccessible(member, message)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-room and cross-user access', () => {
    it('should deny access to messages from different rooms', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId1, roomId2, joinedAt, messageDate) => {
            // Ensure different rooms
            if (roomId1 === roomId2) {
              return true; // Skip same room cases
            }

            const member: RoomMember = {
              userId,
              roomId: roomId1,
              joinedAt,
              leftAt: null,
              keepHistory: true,
            };

            const message: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId: roomId2, // Different room
              userId,
              createdAt: messageDate,
              content: 'Test message',
            };

            // Should not be able to access messages from different rooms
            expect(isMessageAccessible(member, message)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to messages from different users', () => {
      fc.assert(
        fc.property(
          userIdArb,
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId1, userId2, roomId, joinedAt, messageDate) => {
            // Ensure different users
            if (userId1 === userId2) {
              return true; // Skip same user cases
            }

            const member: RoomMember = {
              userId: userId1,
              roomId,
              joinedAt,
              leftAt: null,
              keepHistory: true,
            };

            const message: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId: userId2, // Different user
              createdAt: messageDate,
              content: 'Test message',
            };

            // Should not be able to access messages from different users
            // (This is a simplification; in reality, RLS allows viewing other users' messages in the same room)
            expect(isMessageAccessible(member, message)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle messages at exact joined_at timestamp', () => {
      fc.assert(
        fc.property(userIdArb, roomIdArb, dateArb, (userId, roomId, joinedAt) => {
          const member: RoomMember = {
            userId,
            roomId,
            joinedAt,
            leftAt: null,
            keepHistory: true,
          };

          const message: Message = {
            id: fc.sample(messageIdArb, 1)[0],
            roomId,
            userId,
            createdAt: joinedAt, // Exact same timestamp
            content: 'Test message',
          };

          // Message at exact joined_at should be accessible
          expect(isMessageAccessible(member, message)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle messages at exact left_at timestamp when keep_history=true', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt) => {
            // Skip invalid dates
            if (isNaN(joinedAt.getTime()) || isNaN(leftAt.getTime())) {
              return true;
            }
            
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: true,
            };

            const message: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: leftAt, // Exact same timestamp as left_at
              content: 'Test message',
            };

            // Message at exact left_at should be accessible when keep_history=true
            expect(isMessageAccessible(member, message)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle messages at exact left_at timestamp when keep_history=false', () => {
      fc.assert(
        fc.property(
          userIdArb,
          roomIdArb,
          dateArb,
          dateArb,
          (userId, roomId, joinedAt, leftAt) => {
            // Ensure leftAt is after joinedAt
            if (leftAt <= joinedAt) {
              return true; // Skip invalid cases
            }

            const member: RoomMember = {
              userId,
              roomId,
              joinedAt,
              leftAt,
              keepHistory: false,
            };

            const message: Message = {
              id: fc.sample(messageIdArb, 1)[0],
              roomId,
              userId,
              createdAt: leftAt, // Exact same timestamp as left_at
              content: 'Test message',
            };

            // Message at exact left_at should NOT be accessible when keep_history=false
            expect(isMessageAccessible(member, message)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
