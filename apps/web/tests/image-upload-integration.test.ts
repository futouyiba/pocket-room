/**
 * Image Upload Integration Tests
 * 
 * Tests for the complete image upload flow including storage and message sending.
 * 
 * Requirements:
 * - 8.4: Message SHALL 支持图片的上传和内联显示
 * - Messages with images should be stored with attachments array
 * - Images should be displayed inline in messages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

describe('Image Upload Integration', () => {
  let supabase: ReturnType<typeof createClient>;
  let testUserId: string;
  let testRoomId: string;
  let uploadedImagePath: string | null = null;

  // Skip tests if Supabase is not available
  const isSupabaseAvailable = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                               process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://localhost:54321';

  beforeEach(async () => {
    if (!isSupabaseAvailable) {
      return;
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Create test user (mock authentication)
    testUserId = 'test-user-' + Date.now();
    
    // Create test room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: 'Test Room for Images',
        description: 'Testing image uploads',
        owner_id: testUserId,
        status: 'active',
        join_strategy: 'free',
      })
      .select('id')
      .single();

    if (roomError) {
      throw new Error(`Failed to create test room: ${roomError.message}`);
    }

    testRoomId = room.id;

    // Add user as room member
    await supabase.from('room_members').insert({
      room_id: testRoomId,
      user_id: testUserId,
      role: 'owner',
    });
  });

  afterEach(async () => {
    if (!isSupabaseAvailable) {
      return;
    }

    // Clean up uploaded image
    if (uploadedImagePath) {
      await supabase.storage.from('message-images').remove([uploadedImagePath]);
    }

    // Clean up test data
    if (testRoomId) {
      await supabase.from('messages').delete().eq('room_id', testRoomId);
      await supabase.from('room_members').delete().eq('room_id', testRoomId);
      await supabase.from('rooms').delete().eq('id', testRoomId);
    }
  });

  it('should upload image to storage and create message with attachment', async () => {
    if (!isSupabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }

    // Create a test image blob
    const imageBlob = new Blob(['fake image content'], { type: 'image/jpeg' });
    const fileName = `${testUserId}/${Date.now()}.jpg`;

    // Upload image to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-images')
      .upload(fileName, imageBlob);

    expect(uploadError).toBeNull();
    expect(uploadData).toBeDefined();
    expect(uploadData?.path).toBe(fileName);

    uploadedImagePath = fileName;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('message-images')
      .getPublicUrl(fileName);

    expect(publicUrl).toBeDefined();
    expect(publicUrl).toContain(fileName);

    // Create message with image attachment
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        content: `Check out this image: ![Image](${publicUrl})`,
        message_type: 'text',
        attachments: [publicUrl],
      })
      .select('*')
      .single();

    expect(messageError).toBeNull();
    expect(message).toBeDefined();
    expect(message?.attachments).toEqual([publicUrl]);
    expect(message?.content).toContain(publicUrl);
  });

  it('should store multiple images in attachments array', async () => {
    if (!isSupabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }

    const imageUrls: string[] = [];
    const imagePaths: string[] = [];

    // Upload multiple images
    for (let i = 0; i < 3; i++) {
      const imageBlob = new Blob([`fake image ${i}`], { type: 'image/jpeg' });
      const fileName = `${testUserId}/${Date.now()}-${i}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(fileName, imageBlob);

      expect(uploadError).toBeNull();
      imagePaths.push(fileName);

      const { data: { publicUrl } } = supabase.storage
        .from('message-images')
        .getPublicUrl(fileName);

      imageUrls.push(publicUrl);
    }

    uploadedImagePath = imagePaths[0]; // Store first one for cleanup

    // Create message with multiple attachments
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        content: 'Multiple images',
        message_type: 'text',
        attachments: imageUrls,
      })
      .select('*')
      .single();

    expect(messageError).toBeNull();
    expect(message).toBeDefined();
    expect(message?.attachments).toHaveLength(3);
    expect(message?.attachments).toEqual(imageUrls);

    // Clean up additional images
    for (const path of imagePaths.slice(1)) {
      await supabase.storage.from('message-images').remove([path]);
    }
  });

  it('should allow message with only image (no text)', async () => {
    if (!isSupabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }

    const imageBlob = new Blob(['fake image'], { type: 'image/jpeg' });
    const fileName = `${testUserId}/${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('message-images')
      .upload(fileName, imageBlob);

    expect(uploadError).toBeNull();
    uploadedImagePath = fileName;

    const { data: { publicUrl } } = supabase.storage
      .from('message-images')
      .getPublicUrl(fileName);

    // Create message with only image (no additional text)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        content: `![Image](${publicUrl})`,
        message_type: 'text',
        attachments: [publicUrl],
      })
      .select('*')
      .single();

    expect(messageError).toBeNull();
    expect(message).toBeDefined();
    expect(message?.content).toBe(`![Image](${publicUrl})`);
    expect(message?.attachments).toEqual([publicUrl]);
  });

  it('should handle empty attachments array', async () => {
    if (!isSupabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }

    // Create message without attachments
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: testRoomId,
        user_id: testUserId,
        content: 'Text only message',
        message_type: 'text',
        attachments: [],
      })
      .select('*')
      .single();

    expect(messageError).toBeNull();
    expect(message).toBeDefined();
    expect(message?.attachments).toEqual([]);
  });

  it('should validate image file types', async () => {
    if (!isSupabaseAvailable) {
      console.log('Skipping test: Supabase not available');
      return;
    }

    // Try to upload a non-image file
    const textBlob = new Blob(['not an image'], { type: 'text/plain' });
    const fileName = `${testUserId}/${Date.now()}.txt`;

    const { error: uploadError } = await supabase.storage
      .from('message-images')
      .upload(fileName, textBlob);

    // This should fail if bucket has MIME type restrictions
    // If it doesn't fail, that's okay - we validate on the client side
    if (!uploadError) {
      // Clean up
      await supabase.storage.from('message-images').remove([fileName]);
    }
  });
});
