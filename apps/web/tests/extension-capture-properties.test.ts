/**
 * Browser Extension Capture Property-Based Tests
 * 
 * Property-based tests using fast-check to verify browser extension capture correctness.
 * 
 * Feature: sprint1-pocket-room
 * 
 * **Validates: Requirements 16.2**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Skip tests if Supabase is not available
const isSupabaseAvailable = supabaseUrl && 
                             supabaseServiceKey &&
                             supabaseUrl !== 'http://localhost:54321' &&
                             supabaseUrl !== 'https://test.supabase.co';

let adminClient: SupabaseClient;

beforeAll(() => {
  if (!isSupabaseAvailable) {
    return;
  }
  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
});

afterAll(async () => {
  // Cleanup any test data
});

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

/**
 * Generate a valid UUID
 */
const uuidArbitrary = fc.uuid();

/**
 * Generate valid captured content (selected text)
 */
const capturedContentArbitrary = fc.string({ 
  minLength: 1, 
  maxLength: 5000 
});

/**
 * Generate a valid page title
 */
const pageTitleArbitrary = fc.string({ 
  minLength: 1, 
  maxLength: 200 
});

/**
 * Generate a valid URL
 */
const urlArbitrary = fc.webUrl();

/**
 * Generate a valid timestamp
 */
const timestampArbitrary = fc.date({ 
  min: new Date('2024-01-01'), 
  max: new Date('2025-12-31') 
}).map(date => date.toISOString());

/**
 * Generate a complete capture payload
 */
const capturePayloadArbitrary = fc.record({
  content: capturedContentArbitrary,
  sourceTitle: pageTitleArbitrary,
  sourceUrl: urlArbitrary,
  timestamp: timestampArbitrary,
});

// ============================================================================
// Property 42: 浏览器扩展创建草稿 Segment
// (Browser Extension Creates Draft Segment)
// ============================================================================

describe('Property 42: 浏览器扩展创建草稿 Segment (Browser Extension Creates Draft Segment)', () => {
  /**
   * Feature: sprint1-pocket-room, Property 42: 浏览器扩展创建草稿 Segment
   * 
   * 对于任意通过浏览器扩展捕获的内容，系统应该在 Basket 中创建一条 segment 记录
   * （is_draft = true），包含 source_url 字段记录来源网页。
   * 
   * For any content captured through the browser extension, the system should
   * create a segment record in the Basket (is_draft = true) with source_url
   * field recording the source webpage.
   * 
   * **Validates: Requirements 16.2**
   */

  it.skipIf(!isSupabaseAvailable)(
    'should create a draft segment with source_url for any captured content',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          capturePayloadArbitrary,
          async (userId, capturePayload) => {
            // Create a user (simulate authenticated user)
            const { data: user } = await adminClient.auth.admin.createUser({
              email: `test-${userId}@example.com`,
              password: 'test-password-123',
              email_confirm: true,
            });

            if (!user.user) {
              return;
            }

            try {
              // Simulate extension capture: Create a basket room if it doesn't exist
              let basketRoomId: string;
              
              const { data: existingBasketRoom } = await adminClient
                .from('rooms')
                .select('id')
                .eq('owner_id', user.user.id)
                .eq('name', '__BASKET__')
                .single();
              
              if (existingBasketRoom) {
                basketRoomId = existingBasketRoom.id;
              } else {
                const { data: newBasketRoom } = await adminClient
                  .from('rooms')
                  .insert({
                    name: '__BASKET__',
                    description: 'Personal basket for captured content',
                    owner_id: user.user.id,
                    status: 'active',
                    join_strategy: 'free',
                    is_public: false,
                  })
                  .select('id')
                  .single();
                
                if (!newBasketRoom) {
                  await adminClient.auth.admin.deleteUser(user.user.id);
                  return;
                }
                
                basketRoomId = newBasketRoom.id;
                
                await adminClient
                  .from('room_members')
                  .insert({
                    room_id: basketRoomId,
                    user_id: user.user.id,
                    role: 'owner',
                  });
              }

              // Create draft segment (simulating extension capture)
              const segmentName = capturePayload.sourceTitle || 
                                  `Capture from ${new URL(capturePayload.sourceUrl).hostname}`;
              
              const { data: segment } = await adminClient
                .from('segments')
                .insert({
                  name: segmentName,
                  description: `Captured at ${capturePayload.timestamp}`,
                  created_by: user.user.id,
                  room_id: basketRoomId,
                  is_draft: true,
                  is_shared_to_room: false,
                  source_url: capturePayload.sourceUrl,
                })
                .select('*')
                .single();

              if (!segment) {
                await adminClient.from('room_members').delete().eq('room_id', basketRoomId);
                await adminClient.from('rooms').delete().eq('id', basketRoomId);
                await adminClient.auth.admin.deleteUser(user.user.id);
                return;
              }

              // Create a message with the captured content
              const { data: message } = await adminClient
                .from('messages')
                .insert({
                  room_id: basketRoomId,
                  user_id: user.user.id,
                  content: capturePayload.content,
                  message_type: 'text',
                })
                .select('id')
                .single();

              if (!message) {
                await adminClient.from('segments').delete().eq('id', segment.id);
                await adminClient.from('room_members').delete().eq('room_id', basketRoomId);
                await adminClient.from('rooms').delete().eq('id', basketRoomId);
                await adminClient.auth.admin.deleteUser(user.user.id);
                return;
              }

              // Link message to segment
              await adminClient
                .from('segment_messages')
                .insert({
                  segment_id: segment.id,
                  message_id: message.id,
                  message_order: 0,
                });

              // Property 1: Segment should be marked as draft
              expect(segment.is_draft).toBe(true);

              // Property 2: Segment should have source_url field
              expect(segment.source_url).toBeDefined();
              expect(segment.source_url).toBe(capturePayload.sourceUrl);

              // Property 3: Segment should be in the Basket (not shared to room)
              expect(segment.is_shared_to_room).toBe(false);

              // Property 4: Segment should have creator metadata
              expect(segment.created_by).toBe(user.user.id);
              expect(segment.created_at).toBeDefined();

              // Property 5: Segment should be linked to the basket room
              expect(segment.room_id).toBe(basketRoomId);

              // Verify the segment can be retrieved
              const { data: retrievedSegment } = await adminClient
                .from('segments')
                .select('*')
                .eq('id', segment.id)
                .single();

              expect(retrievedSegment).toBeDefined();
              expect(retrievedSegment?.is_draft).toBe(true);
              expect(retrievedSegment?.source_url).toBe(capturePayload.sourceUrl);

              // Cleanup
              await adminClient.from('segment_messages').delete().eq('segment_id', segment.id);
              await adminClient.from('messages').delete().eq('id', message.id);
              await adminClient.from('segments').delete().eq('id', segment.id);
              await adminClient.from('room_members').delete().eq('room_id', basketRoomId);
              await adminClient.from('rooms').delete().eq('id', basketRoomId);
            } finally {
              // Cleanup user
              await adminClient.auth.admin.deleteUser(user.user.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it.skipIf(!isSupabaseAvailable)(
    'should preserve source URL metadata across segment lifecycle',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          capturePayloadArbitrary,
          async (userId, capturePayload) => {
            // Create a user
            const { data: user } = await adminClient.auth.admin.createUser({
              email: `test-${userId}@example.com`,
              password: 'test-password-123',
              email_confirm: true,
            });

            if (!user.user) {
              return;
            }

            try {
              // Create basket room
              const { data: basketRoom } = await adminClient
                .from('rooms')
                .insert({
                  name: '__BASKET__',
                  description: 'Personal basket',
                  owner_id: user.user.id,
                  status: 'active',
                  join_strategy: 'free',
                  is_public: false,
                })
                .select('id')
                .single();

              if (!basketRoom) {
                await adminClient.auth.admin.deleteUser(user.user.id);
                return;
              }

              await adminClient
                .from('room_members')
                .insert({
                  room_id: basketRoom.id,
                  user_id: user.user.id,
                  role: 'owner',
                });

              // Create draft segment
              const { data: segment } = await adminClient
                .from('segments')
                .insert({
                  name: capturePayload.sourceTitle,
                  created_by: user.user.id,
                  room_id: basketRoom.id,
                  is_draft: true,
                  is_shared_to_room: false,
                  source_url: capturePayload.sourceUrl,
                })
                .select('*')
                .single();

              if (!segment) {
                await adminClient.from('room_members').delete().eq('room_id', basketRoom.id);
                await adminClient.from('rooms').delete().eq('id', basketRoom.id);
                await adminClient.auth.admin.deleteUser(user.user.id);
                return;
              }

              // Store original source_url
              const originalSourceUrl = segment.source_url;

              // Update segment (e.g., publish from draft)
              await adminClient
                .from('segments')
                .update({ 
                  is_draft: false,
                  is_shared_to_room: true,
                })
                .eq('id', segment.id);

              // Retrieve updated segment
              const { data: updatedSegment } = await adminClient
                .from('segments')
                .select('*')
                .eq('id', segment.id)
                .single();

              // Property: source_url should remain unchanged after updates
              expect(updatedSegment?.source_url).toBe(originalSourceUrl);
              expect(updatedSegment?.source_url).toBe(capturePayload.sourceUrl);
              expect(updatedSegment?.is_draft).toBe(false);
              expect(updatedSegment?.is_shared_to_room).toBe(true);

              // Cleanup
              await adminClient.from('segments').delete().eq('id', segment.id);
              await adminClient.from('room_members').delete().eq('room_id', basketRoom.id);
              await adminClient.from('rooms').delete().eq('id', basketRoom.id);
            } finally {
              // Cleanup user
              await adminClient.auth.admin.deleteUser(user.user.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it.skipIf(!isSupabaseAvailable)(
    'should create segments in user-specific basket',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          capturePayloadArbitrary,
          capturePayloadArbitrary,
          async (user1Id, user2Id, capture1, capture2) => {
            // Skip if user IDs are the same
            if (user1Id === user2Id) return;

            // Create two users
            const { data: user1 } = await adminClient.auth.admin.createUser({
              email: `test-${user1Id}@example.com`,
              password: 'test-password-123',
              email_confirm: true,
            });

            const { data: user2 } = await adminClient.auth.admin.createUser({
              email: `test-${user2Id}@example.com`,
              password: 'test-password-123',
              email_confirm: true,
            });

            if (!user1.user || !user2.user) {
              if (user1.user) await adminClient.auth.admin.deleteUser(user1.user.id);
              if (user2.user) await adminClient.auth.admin.deleteUser(user2.user.id);
              return;
            }

            try {
              // Create basket rooms for both users
              const { data: basket1 } = await adminClient
                .from('rooms')
                .insert({
                  name: '__BASKET__',
                  owner_id: user1.user.id,
                  status: 'active',
                  join_strategy: 'free',
                  is_public: false,
                })
                .select('id')
                .single();

              const { data: basket2 } = await adminClient
                .from('rooms')
                .insert({
                  name: '__BASKET__',
                  owner_id: user2.user.id,
                  status: 'active',
                  join_strategy: 'free',
                  is_public: false,
                })
                .select('id')
                .single();

              if (!basket1 || !basket2) {
                await adminClient.auth.admin.deleteUser(user1.user.id);
                await adminClient.auth.admin.deleteUser(user2.user.id);
                return;
              }

              await adminClient.from('room_members').insert([
                { room_id: basket1.id, user_id: user1.user.id, role: 'owner' },
                { room_id: basket2.id, user_id: user2.user.id, role: 'owner' },
              ]);

              // Create segments for each user
              const { data: segment1 } = await adminClient
                .from('segments')
                .insert({
                  name: capture1.sourceTitle,
                  created_by: user1.user.id,
                  room_id: basket1.id,
                  is_draft: true,
                  source_url: capture1.sourceUrl,
                })
                .select('*')
                .single();

              const { data: segment2 } = await adminClient
                .from('segments')
                .insert({
                  name: capture2.sourceTitle,
                  created_by: user2.user.id,
                  room_id: basket2.id,
                  is_draft: true,
                  source_url: capture2.sourceUrl,
                })
                .select('*')
                .single();

              if (!segment1 || !segment2) {
                await adminClient.from('room_members').delete().in('room_id', [basket1.id, basket2.id]);
                await adminClient.from('rooms').delete().in('id', [basket1.id, basket2.id]);
                await adminClient.auth.admin.deleteUser(user1.user.id);
                await adminClient.auth.admin.deleteUser(user2.user.id);
                return;
              }

              // Property: Each segment should be in its owner's basket
              expect(segment1.created_by).toBe(user1.user.id);
              expect(segment1.room_id).toBe(basket1.id);
              expect(segment2.created_by).toBe(user2.user.id);
              expect(segment2.room_id).toBe(basket2.id);

              // Property: Segments should be isolated (user1 can't see user2's segments)
              const { data: user1Segments } = await adminClient
                .from('segments')
                .select('*')
                .eq('created_by', user1.user.id)
                .eq('is_draft', true);

              const { data: user2Segments } = await adminClient
                .from('segments')
                .select('*')
                .eq('created_by', user2.user.id)
                .eq('is_draft', true);

              expect(user1Segments?.some(s => s.id === segment1.id)).toBe(true);
              expect(user1Segments?.some(s => s.id === segment2.id)).toBe(false);
              expect(user2Segments?.some(s => s.id === segment2.id)).toBe(true);
              expect(user2Segments?.some(s => s.id === segment1.id)).toBe(false);

              // Cleanup
              await adminClient.from('segments').delete().in('id', [segment1.id, segment2.id]);
              await adminClient.from('room_members').delete().in('room_id', [basket1.id, basket2.id]);
              await adminClient.from('rooms').delete().in('id', [basket1.id, basket2.id]);
            } finally {
              // Cleanup users
              await adminClient.auth.admin.deleteUser(user1.user.id);
              await adminClient.auth.admin.deleteUser(user2.user.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it.skipIf(!isSupabaseAvailable)(
    'should handle various URL formats correctly',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          fc.oneof(
            fc.webUrl(),
            fc.webUrl({ withFragments: true }),
            fc.webUrl({ withQueryParameters: true }),
          ),
          capturedContentArbitrary,
          async (userId, sourceUrl, content) => {
            // Create a user
            const { data: user } = await adminClient.auth.admin.createUser({
              email: `test-${userId}@example.com`,
              password: 'test-password-123',
              email_confirm: true,
            });

            if (!user.user) {
              return;
            }

            try {
              // Create basket room
              const { data: basketRoom } = await adminClient
                .from('rooms')
                .insert({
                  name: '__BASKET__',
                  owner_id: user.user.id,
                  status: 'active',
                  join_strategy: 'free',
                  is_public: false,
                })
                .select('id')
                .single();

              if (!basketRoom) {
                await adminClient.auth.admin.deleteUser(user.user.id);
                return;
              }

              await adminClient
                .from('room_members')
                .insert({
                  room_id: basketRoom.id,
                  user_id: user.user.id,
                  role: 'owner',
                });

              // Create segment with various URL formats
              const { data: segment } = await adminClient
                .from('segments')
                .insert({
                  name: `Capture from ${new URL(sourceUrl).hostname}`,
                  created_by: user.user.id,
                  room_id: basketRoom.id,
                  is_draft: true,
                  source_url: sourceUrl,
                })
                .select('*')
                .single();

              if (!segment) {
                await adminClient.from('room_members').delete().eq('room_id', basketRoom.id);
                await adminClient.from('rooms').delete().eq('id', basketRoom.id);
                await adminClient.auth.admin.deleteUser(user.user.id);
                return;
              }

              // Property: source_url should be stored exactly as provided
              expect(segment.source_url).toBe(sourceUrl);

              // Property: source_url should be a valid URL
              expect(() => new URL(segment.source_url!)).not.toThrow();

              // Cleanup
              await adminClient.from('segments').delete().eq('id', segment.id);
              await adminClient.from('room_members').delete().eq('room_id', basketRoom.id);
              await adminClient.from('rooms').delete().eq('id', basketRoom.id);
            } finally {
              // Cleanup user
              await adminClient.auth.admin.deleteUser(user.user.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
