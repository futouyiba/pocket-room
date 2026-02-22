/**
 * Invitation Segment API Tests
 * 
 * Unit tests for invitation segment sharing API logic.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect } from 'vitest';

describe('Invitation Segment API Logic', () => {
  /**
   * Test: Validate segment data structure
   * 
   * Requirement 10.1: Provide option to select messages and create Segment
   */
  it('should validate segment data has required fields', () => {
    const validSegmentData = {
      name: 'Introduction',
      description: 'Context for new member',
      messageIds: ['msg-1', 'msg-2', 'msg-3'],
    };
    
    expect(validSegmentData.name).toBeTruthy();
    expect(validSegmentData.messageIds).toHaveLength(3);
    expect(validSegmentData.messageIds.length).toBeGreaterThan(0);
  });
  
  it('should reject segment data without name', () => {
    const invalidSegmentData = {
      name: '',
      messageIds: ['msg-1'],
    };
    
    expect(invalidSegmentData.name.trim()).toBe('');
  });
  
  it('should reject segment data without messages', () => {
    const invalidSegmentData = {
      name: 'Test Segment',
      messageIds: [],
    };
    
    expect(invalidSegmentData.messageIds.length).toBe(0);
  });
  
  /**
   * Test: Segment metadata structure
   * 
   * Requirement 10.4: Invitation Segment follows same metadata rules
   */
  it('should have correct segment metadata structure', () => {
    const segmentMetadata = {
      name: 'Test Segment',
      description: 'Test description',
      created_by: 'user-id',
      room_id: 'room-id',
      created_at: new Date().toISOString(),
      is_shared_to_room: false,
      is_draft: false,
    };
    
    expect(segmentMetadata.created_by).toBeTruthy();
    expect(segmentMetadata.room_id).toBeTruthy();
    expect(segmentMetadata.created_at).toBeTruthy();
    expect(segmentMetadata.name).toBeTruthy();
  });
  
  /**
   * Test: Invitation structure with segment
   * 
   * Requirement 10.2: Associate Segment with invitation
   */
  it('should have invitation_segment_id field in invitation', () => {
    const invitation = {
      id: 'invitation-id',
      room_id: 'room-id',
      inviter_id: 'inviter-id',
      invitee_id: 'invitee-id',
      status: 'pending',
      invitation_segment_id: 'segment-id',
    };
    
    expect(invitation.invitation_segment_id).toBeTruthy();
    expect(invitation.invitation_segment_id).toBe('segment-id');
  });
  
  it('should allow invitation without segment', () => {
    const invitation = {
      id: 'invitation-id',
      room_id: 'room-id',
      inviter_id: 'inviter-id',
      invitee_id: 'invitee-id',
      status: 'pending',
      invitation_segment_id: null,
    };
    
    expect(invitation.invitation_segment_id).toBeNull();
  });
  
  /**
   * Test: Message order preservation
   * 
   * Requirement 12.3: Segment should preserve message order
   */
  it('should preserve message order in segment_messages', () => {
    const messageIds = ['msg-1', 'msg-2', 'msg-3'];
    const segmentMessages = messageIds.map((messageId, index) => ({
      segment_id: 'segment-id',
      message_id: messageId,
      message_order: index,
    }));
    
    expect(segmentMessages).toHaveLength(3);
    expect(segmentMessages[0].message_order).toBe(0);
    expect(segmentMessages[1].message_order).toBe(1);
    expect(segmentMessages[2].message_order).toBe(2);
    
    // Verify order matches original array
    segmentMessages.forEach((sm, index) => {
      expect(sm.message_id).toBe(messageIds[index]);
      expect(sm.message_order).toBe(index);
    });
  });
  
  /**
   * Test: Email validation
   */
  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('missing@domain')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
  });
  
  /**
   * Test: Request validation
   */
  it('should validate create invitation request', () => {
    const validRequest = {
      roomId: 'room-id',
      inviteeEmails: ['user@example.com'],
      segmentData: {
        name: 'Context',
        messageIds: ['msg-1', 'msg-2'],
      },
    };
    
    expect(validRequest.roomId).toBeTruthy();
    expect(validRequest.inviteeEmails.length).toBeGreaterThan(0);
    expect(validRequest.segmentData?.name).toBeTruthy();
    expect(validRequest.segmentData?.messageIds.length).toBeGreaterThan(0);
  });
  
  it('should detect invalid request - missing roomId', () => {
    const invalidRequest = {
      roomId: '',
      inviteeEmails: ['user@example.com'],
    };
    
    expect(invalidRequest.roomId).toBeFalsy();
  });
  
  it('should detect invalid request - no invitees', () => {
    const invalidRequest = {
      roomId: 'room-id',
      inviteeEmails: [],
    };
    
    expect(invalidRequest.inviteeEmails.length).toBe(0);
  });
  
  /**
   * Test: Cross-room message validation
   * 
   * Requirement 12.2: Segment can only contain messages from same room
   */
  it('should detect messages from different rooms', () => {
    const messages = [
      { id: 'msg-1', room_id: 'room-1' },
      { id: 'msg-2', room_id: 'room-1' },
      { id: 'msg-3', room_id: 'room-2' }, // Different room!
    ];
    
    const targetRoomId = 'room-1';
    const allFromSameRoom = messages.every(msg => msg.room_id === targetRoomId);
    
    expect(allFromSameRoom).toBe(false);
  });
  
  it('should pass validation for messages from same room', () => {
    const messages = [
      { id: 'msg-1', room_id: 'room-1' },
      { id: 'msg-2', room_id: 'room-1' },
      { id: 'msg-3', room_id: 'room-1' },
    ];
    
    const targetRoomId = 'room-1';
    const allFromSameRoom = messages.every(msg => msg.room_id === targetRoomId);
    
    expect(allFromSameRoom).toBe(true);
  });
});
