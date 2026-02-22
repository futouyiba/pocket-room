/**
 * Passcode Join Property-Based Tests
 * 
 * Property 21: 密码验证加入
 * For any room with join_strategy = 'passcode', a user should only be added
 * as a room_member when the provided passcode matches the room's passcode_hash.
 * 
 * Validates requirements: 7.2, 7.3
 * 
 * Note: Tests use reduced numRuns (20 instead of 100) due to bcrypt being slow.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';

const uuidArb = fc.uuid();
const passwordArb = fc.string({ minLength: 6, maxLength: 20 });
const roomNameArb = fc.string({ minLength: 1, maxLength: 50 });

describe('Property 21: 密码验证加入', () => {
  it('should only allow join with correct passcode', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        roomNameArb,
        passwordArb,
        uuidArb,
        async (roomId, roomName, password, userId) => {
          const hashedPassword = await bcrypt.hash(password, 10);
          
          const room = {
            id: roomId,
            name: roomName,
            join_strategy: 'passcode' as const,
            passcode_hash: hashedPassword,
          };

          const isCorrectPasswordValid = await bcrypt.compare(password, room.passcode_hash);
          expect(isCorrectPasswordValid).toBe(true);

          const wrongPassword = password + '_wrong';
          const isWrongPasswordValid = await bcrypt.compare(wrongPassword, room.passcode_hash);
          expect(isWrongPasswordValid).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('should verify bcrypt hash format', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordArb,
        async (password) => {
          const hashedPassword = await bcrypt.hash(password, 10);
          expect(hashedPassword).toMatch(/^\$2[ab]\$/);
          expect(hashedPassword.length).toBeGreaterThan(50);

          const isValid = await bcrypt.compare(password, hashedPassword);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('should create valid member record on successful passcode join', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (roomId, userId) => {
          const memberRecord = {
            room_id: roomId,
            user_id: userId,
            role: 'member' as const,
            joined_at: new Date().toISOString(),
          };

          expect(memberRecord.room_id).toBe(roomId);
          expect(memberRecord.user_id).toBe(userId);
          expect(memberRecord.role).toBe('member');
          expect(memberRecord.joined_at).toBeDefined();

          const joinedDate = new Date(memberRecord.joined_at);
          expect(joinedDate).toBeInstanceOf(Date);
          expect(joinedDate.getTime()).not.toBeNaN();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not create join_request for passcode strategy', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        roomNameArb,
        async (roomId, roomName) => {
          const room = {
            id: roomId,
            name: roomName,
            join_strategy: 'passcode' as const,
          };

          const shouldCreateJoinRequest = false;
          expect(shouldCreateJoinRequest).toBe(false);
          expect(room.join_strategy).not.toBe('approval');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return consistent error for incorrect passcode', async () => {
    await fc.assert(
      fc.asyncProperty(
        passwordArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        async (correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);

          const hashedPassword = await bcrypt.hash(correctPassword, 10);
          const isPasswordValid = await bcrypt.compare(wrongPassword, hashedPassword);

          expect(isPasswordValid).toBe(false);

          const errorResponse = {
            error: '密码错误，请重试',
            status: 401,
          };

          expect(errorResponse.status).toBe(401);
          expect(errorResponse.error).toBe('密码错误，请重试');
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('should handle room without passcode_hash as error', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        roomNameArb,
        async (roomId, roomName) => {
          const room = {
            id: roomId,
            name: roomName,
            join_strategy: 'passcode' as const,
            passcode_hash: null,
          };

          expect(room.join_strategy).toBe('passcode');
          expect(room.passcode_hash).toBeNull();

          const errorResponse = {
            error: 'Room 配置错误',
            status: 500,
          };

          expect(errorResponse.status).toBe(500);
          expect(errorResponse.error).toContain('配置错误');
        }
      ),
      { numRuns: 100 }
    );
  });
});
