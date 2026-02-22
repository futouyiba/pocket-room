/**
 * Invitation Confirmation Component Tests
 * 
 * Tests the InvitationConfirmation component.
 * Requirements: 3.5, 3.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvitationConfirmation from '@/components/invitations/invitation-confirmation';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock logger
vi.mock('@/lib/provider-binding/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('InvitationConfirmation Component', () => {
  const mockInvitation = {
    id: 'invitation-id',
    roomId: 'room-id',
    roomName: 'Test Room',
    roomDescription: 'A test room for testing',
    joinStrategy: 'approval',
    inviterEmail: 'inviter@example.com',
    createdAt: '2024-01-15T10:00:00Z',
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should display invitation details', () => {
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      expect(screen.getByText('Room 邀请')).toBeInTheDocument();
      expect(screen.getByText(/inviter@example.com 邀请您加入 Room/)).toBeInTheDocument();
      expect(screen.getByText('Test Room')).toBeInTheDocument();
      expect(screen.getByText('A test room for testing')).toBeInTheDocument();
      expect(screen.getByText('申请审批')).toBeInTheDocument();
    });
    
    it('should display accept and reject buttons', () => {
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      expect(screen.getByRole('button', { name: '接受' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '拒绝' })).toBeInTheDocument();
    });
    
    it('should display join strategy correctly', () => {
      const strategies = [
        { value: 'approval', text: '申请审批' },
        { value: 'free', text: '自由加入' },
        { value: 'passcode', text: '密码加入' },
      ];
      
      strategies.forEach(({ value, text }) => {
        const { unmount } = render(
          <InvitationConfirmation
            invitation={{ ...mockInvitation, joinStrategy: value }}
          />
        );
        
        expect(screen.getByText(text)).toBeInTheDocument();
        unmount();
      });
    });
  });
  
  describe('Accept Invitation (需求 3.5)', () => {
    it('should call API with accept=true when accept button is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          roomId: 'room-id',
          message: '已成功加入 Room',
        }),
      });
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const acceptButton = screen.getByRole('button', { name: '接受' });
      fireEvent.click(acceptButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/invitations/confirm',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invitationId: 'invitation-id',
              accept: true,
            }),
          })
        );
      });
    });
    
    it('should redirect to room page after accepting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          roomId: 'room-id',
          message: '已成功加入 Room',
        }),
      });
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const acceptButton = screen.getByRole('button', { name: '接受' });
      fireEvent.click(acceptButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/rooms/room-id');
      });
    });
    
    it('should disable buttons while processing', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const acceptButton = screen.getByRole('button', { name: '接受' });
      fireEvent.click(acceptButton);
      
      // Both buttons should be disabled and show "处理中..."
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      buttons.forEach(button => {
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent('处理中...');
      });
    });
  });
  
  describe('Reject Invitation (需求 3.7)', () => {
    it('should call API with accept=false when reject button is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '已拒绝邀请',
        }),
      });
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const rejectButton = screen.getByRole('button', { name: '拒绝' });
      fireEvent.click(rejectButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/invitations/confirm',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invitationId: 'invitation-id',
              accept: false,
            }),
          })
        );
      });
    });
    
    it('should redirect to rooms list after rejecting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: '已拒绝邀请',
        }),
      });
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const rejectButton = screen.getByRole('button', { name: '拒绝' });
      fireEvent.click(rejectButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/rooms');
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: '邀请不存在或已被处理',
        }),
      });
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const acceptButton = screen.getByRole('button', { name: '接受' });
      fireEvent.click(acceptButton);
      
      await waitFor(() => {
        expect(screen.getByText('邀请不存在或已被处理')).toBeInTheDocument();
      });
    });
    
    it('should re-enable buttons after error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Test error',
        }),
      });
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const acceptButton = screen.getByRole('button', { name: '接受' });
      fireEvent.click(acceptButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
      
      expect(acceptButton).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '拒绝' })).not.toBeDisabled();
    });
    
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      render(<InvitationConfirmation invitation={mockInvitation} />);
      
      const acceptButton = screen.getByRole('button', { name: '接受' });
      fireEvent.click(acceptButton);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
