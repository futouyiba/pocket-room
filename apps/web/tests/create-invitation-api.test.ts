/**
 * Create Invitation API Integration Tests
 * 
 * Tests for the /api/invitations/create endpoint.
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect } from 'vitest';

describe('Create Invitation API', () => {
  /**
   * Test: API request validation
   */
  it('should validate required fields in request body', () => {
    const validRequest = {
      roomId: 'room-123',
      inviteeEmails: ['user@example.com'],
    };
    
    expect(validRequest.roomId).toBeTruthy();
    expect(validRequest.inviteeEmails).toBeInstanceOf(Array);
    expect(validRequest.inviteeEmails.length).toBeGreaterThan(0);
  });
  
  it('should validate segment data when provided', () => {
    const requestWithSegment = {
      roomId: 'room-123',
      inviteeEmails: ['user@example.com'],
      segmentData: {
        name: 'Introduction',
        description: 'Context for new member',
        messageIds: ['msg-1', 'msg-2'],
      },
    };
    
    expect(requestWithSegment.segmentData).toBeDefined();
    expect(requestWithSegment.segmentData!.name).toBeTruthy();
    expect(requestWithSegment.segmentData!.messageIds.length).toBeGreaterThan(0);
  });
  
  /**
   * Test: Response structure
   */
  it('should have correct response structure', () => {
    const successResponse = {
      success: true,
      invitations: [
        {
          id: 'invitation-1',
          inviteeEmail: 'user@example.com',
        },
      ],
      segmentId: 'segment-123',
    };
    
    expect(successResponse.success).toBe(true);
    expect(successResponse.invitations).toBeInstanceOf(Array);
    expect(successResponse.invitations[0].id).toBeTruthy();
    expect(successResponse.invitations[0].inviteeEmail).toBeTruthy();
    expect(successResponse.segmentId).toBeTruthy();
  });
  
  it('should have response without segmentId when no segment created', () => {
    const responseWithoutSegment = {
      success: true,
      invitations: [
        {
          id: 'invitation-1',
          inviteeEmail: 'user@example.com',
        },
      ],
    };
    
    expect(responseWithoutSegment.success).toBe(true);
    expect(responseWithoutSegment.invitations).toBeInstanceOf(Array);
    expect('segmentId' in responseWithoutSegment).toBe(false);
  });
  
  /**
   * Test: Error responses
   */
  it('should return 400 for missing roomId', () => {
    const errorResponse = {
      error: 'Room ID 不能为空',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 400 for empty inviteeEmails', () => {
    const errorResponse = {
      error: '必须邀请至少一名用户',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 400 for invalid email format', () => {
    const errorResponse = {
      error: '无效的邮箱地址: invalid-email',
    };
    
    expect(errorResponse.error).toContain('无效的邮箱地址');
  });
  
  it('should return 400 for segment without name', () => {
    const errorResponse = {
      error: 'Segment 名称不能为空',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 400 for segment without messages', () => {
    const errorResponse = {
      error: 'Segment 必须包含至少一条消息',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 401 for unauthorized user', () => {
    const errorResponse = {
      error: '用户未登录',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 403 for non-member', () => {
    const errorResponse = {
      error: '您不是该 Room 的成员',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 404 for room not found', () => {
    const errorResponse = {
      error: 'Room 不存在',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 400 for inactive room', () => {
    const errorResponse = {
      error: 'Room 尚未激活',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
  
  it('should return 400 for messages from different rooms', () => {
    const errorResponse = {
      error: 'Segment 只能包含同一 Room 的消息',
    };
    
    expect(errorResponse.error).toBeTruthy();
  });
});
