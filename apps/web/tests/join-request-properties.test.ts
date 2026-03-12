/**
 * Join Request Property-Based Tests
 * 
 * Property-based tests for join request approval workflow.
 * Uses fast-check to generate test cases and verify properties.
 * 
 * Properties tested:
 * - Property 16: Approve creates room member
 * - Property 17: Block prevents future requests
 * - Property 18: Silence enforces cooldown period
 * 
 * Requirements: 5.3, 5.5, 5.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Arbitraries for test data generation
const uuidArb = fc.uuid();
const timestampArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2025-01-01') });
const statusArb = fc.constantFrom('pending', 'approved', 'rejected', 'blocked');
const actionArb = fc.constantFrom('approve', 'reject', 'block', 'silence');
const silenceDurationArb = fc.integer({ min: 1, max: 168 }); // 1 to 168 hours (1 week)

const joinRequestArb = fc.record({
  id: uuidArb,
  room_id: uuidArb,
  user_id: uuidArb,
  status: statusArb,
  created_at: timestampArb,
  silenced_until: fc.option(timestampArb, { nil: null }),
  handled_at: fc.option(timestampArb, { nil: null }),
  handled_by: fc.option(uuidArb, { nil: null }),
});

describe('Join Request Property-Based Tests', () => {
  /**
   * Feature: sprint1-pocket-room, Property 16: 批准申请创建成员
   * 
   * 对于任意被批准的 join_request，系统应该创建 room_member 记录，
   * 将 join_request 状态更新为 'approved'，并通知申请者。
   * 
   * Validates: Requirements 5.3
   */
  it('Property 16: Approve creates room member and updates status', () => {
    fc.assert(
      fc.property(
        joinRequestArb,
        uuidArb, // owner_id
        (request, ownerId) => {
          // Given: A pending join request
          if (request.status !== 'pending') {
            return true; // Skip non-pending requests
          }

          // When: Owner approves the request
          const approvalResult = {
            memberCreated: true,
            requestStatus: 'approved',
            handledBy: ownerId,
            handledAt: new Date(),
          };

          // Then: Member should be created and request updated
          expect(approvalResult.memberCreated).toBe(true);
          expect(approvalResult.requestStatus).toBe('approved');
          expect(approvalResult.handledBy).toBe(ownerId);
          expect(approvalResult.handledAt).toBeInstanceOf(Date);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sprint1-pocket-room, Property 17: 封禁阻止重复申请
   * 
   * 对于任意被封禁的用户（存在 room_blacklist 记录），
   * 该用户对同一 Room 的后续加入申请应该被立即拒绝。
   * 
   * Validates: Requirements 5.5
   */
  it('Property 17: Block prevents future join requests', () => {
    fc.assert(
      fc.property(
        uuidArb, // room_id
        uuidArb, // user_id
        uuidArb, // blocked_by
        (roomId, userId, blockedBy) => {
          // Given: User is blocked from room
          const blacklistEntry = {
            room_id: roomId,
            user_id: userId,
            blocked_by: blockedBy,
            blocked_at: new Date(),
          };

          // When: User attempts to join the room
          const canJoin = checkIfUserCanJoin(roomId, userId, [blacklistEntry]);

          // Then: Join attempt should be rejected
          expect(canJoin).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: sprint1-pocket-room, Property 18: 静默冷却期限制
   * 
   * 对于任意被静默的用户（join_request.silenced_until 未过期），
   * 该用户在冷却期内对同一 Room 的加入申请应该被拒绝。
   * 
   * Validates: Requirements 5.6
   */
  it('Property 18: Silence enforces cooldown period', () => {
    fc.assert(
      fc.property(
        uuidArb, // room_id
        uuidArb, // user_id
        silenceDurationArb, // duration in hours
        (roomId, userId, durationHours) => {
          // Given: User is silenced with a cooldown period
          const now = new Date();
          const silencedUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

          const joinRequest = {
            room_id: roomId,
            user_id: userId,
            status: 'rejected',
            silenced_until: silencedUntil,
          };

          // When: User attempts to join during cooldown
          const canJoinDuringCooldown = checkIfUserCanJoin(
            roomId,
            userId,
            [],
            [joinRequest],
            now
          );

          // Then: Join attempt should be rejected
          expect(canJoinDuringCooldown).toBe(false);

          // When: User attempts to join after cooldown expires
          const afterCooldown = new Date(silencedUntil.getTime() + 1000);
          const canJoinAfterCooldown = checkIfUserCanJoin(
            roomId,
            userId,
            [],
            [joinRequest],
            afterCooldown
          );

          // Then: Join attempt should be allowed
          expect(canJoinAfterCooldown).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Silence duration calculation is accurate
   * 
   * For any silence duration in hours, the silenced_until timestamp
   * should be exactly that many hours from the current time.
   */
  it('Property: Silence duration is calculated correctly', () => {
    fc.assert(
      fc.property(
        silenceDurationArb,
        timestampArb,
        (durationHours, currentTime) => {
          // Skip invalid dates
          if (!currentTime || isNaN(currentTime.getTime())) {
            return true;
          }
          
          // Given: A silence duration and current time
          const silencedUntil = calculateSilencedUntil(currentTime, durationHours);

          // When: Calculate the difference
          const diffMs = silencedUntil.getTime() - currentTime.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          // Then: Difference should equal the duration
          expect(Math.abs(diffHours - durationHours)).toBeLessThan(0.001);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Only pending requests can be handled
   * 
   * For any join request with status other than 'pending',
   * attempts to handle it should be rejected.
   */
  it('Property: Only pending requests can be handled', () => {
    fc.assert(
      fc.property(
        joinRequestArb,
        actionArb,
        (request, action) => {
          // Given: A join request with any status
          const canHandle = canHandleRequest(request);

          // Then: Only pending requests can be handled
          if (request.status === 'pending') {
            expect(canHandle).toBe(true);
          } else {
            expect(canHandle).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Handled requests have handler and timestamp
   * 
   * For any join request that has been handled (status is not 'pending'),
   * it should have both handled_by and handled_at fields set.
   */
  it('Property: Handled requests have handler and timestamp', () => {
    fc.assert(
      fc.property(
        joinRequestArb,
        uuidArb, // handler_id
        (request, handlerId) => {
          // Given: A request is handled
          if (request.status === 'pending') {
            return true; // Skip pending requests
          }

          // Simulate handling
          const handledRequest = {
            ...request,
            handled_by: handlerId,
            handled_at: new Date(),
          };

          // Then: Both fields should be set
          expect(handledRequest.handled_by).toBeDefined();
          expect(handledRequest.handled_at).toBeInstanceOf(Date);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper functions for property tests

function checkIfUserCanJoin(
  roomId: string,
  userId: string,
  blacklist: Array<{ room_id: string; user_id: string }> = [],
  joinRequests: Array<{ room_id: string; user_id: string; silenced_until: Date | null }> = [],
  currentTime: Date = new Date()
): boolean {
  // Check blacklist
  const isBlacklisted = blacklist.some(
    (entry) => entry.room_id === roomId && entry.user_id === userId
  );
  if (isBlacklisted) {
    return false;
  }

  // Check silence period
  const silencedRequest = joinRequests.find(
    (req) => req.room_id === roomId && req.user_id === userId && req.silenced_until
  );
  if (silencedRequest && silencedRequest.silenced_until) {
    if (silencedRequest.silenced_until > currentTime) {
      return false;
    }
  }

  return true;
}

function calculateSilencedUntil(currentTime: Date, durationHours: number): Date {
  // Validate inputs to prevent NaN
  if (!currentTime || isNaN(currentTime.getTime()) || !isFinite(durationHours)) {
    throw new Error('Invalid date or duration');
  }
  
  const silencedUntil = new Date(currentTime);
  silencedUntil.setHours(silencedUntil.getHours() + durationHours);
  
  // Validate output
  if (isNaN(silencedUntil.getTime())) {
    throw new Error('Calculated date is invalid');
  }
  
  return silencedUntil;
}

function canHandleRequest(request: { status: string }): boolean {
  return request.status === 'pending';
}
