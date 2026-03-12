/**
 * Leave Room Functionality Tests
 * 
 * Tests for the leave room feature including:
 * - Leave room button visibility
 * - Confirmation dialog display
 * - History preservation options
 * 
 * Requirements:
 * - 11.2: Room Member 点击"退出 Room"按钮时，显示确认对话框
 * - 11.3: 确认对话框提供两个选项：保留个人消息历史副本，或删除个人消息历史副本
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaveRoomDialog } from '@/components/rooms/leave-room-dialog';

describe('Leave Room Dialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  it('should not render when isOpen is false', () => {
    render(
      <LeaveRoomDialog
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('退出 Room')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('退出 Room')).toBeInTheDocument();
  });

  it('should display room name when provided', () => {
    const roomName = 'Test Room';
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        roomName={roomName}
      />
    );

    expect(screen.getByText(roomName)).toBeInTheDocument();
  });

  it('should display two history options - 需求 11.3', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Check for "Keep History" option
    expect(screen.getByText('保留我的消息历史')).toBeInTheDocument();
    expect(screen.getByText(/您的消息历史将被保留/)).toBeInTheDocument();

    // Check for "Delete History" option
    expect(screen.getByText('删除我的消息历史')).toBeInTheDocument();
    expect(screen.getByText(/您的消息历史将被标记为不可访问/)).toBeInTheDocument();
  });

  it('should allow selecting keep history option', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const keepHistoryButton = screen.getByText('保留我的消息历史').closest('button');
    expect(keepHistoryButton).toBeInTheDocument();

    fireEvent.click(keepHistoryButton!);

    // Check that the option is visually selected (has blue border)
    expect(keepHistoryButton).toHaveClass('border-blue-500');
  });

  it('should allow selecting delete history option', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const deleteHistoryButton = screen.getByText('删除我的消息历史').closest('button');
    expect(deleteHistoryButton).toBeInTheDocument();

    fireEvent.click(deleteHistoryButton!);

    // Check that the option is visually selected (has red border)
    expect(deleteHistoryButton).toHaveClass('border-red-500');
  });

  it('should disable confirm button when no option is selected', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByText('确认退出');
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when an option is selected', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const keepHistoryButton = screen.getByText('保留我的消息历史').closest('button');
    fireEvent.click(keepHistoryButton!);

    const confirmButton = screen.getByText('确认退出');
    expect(confirmButton).not.toBeDisabled();
  });

  it('should call onConfirm with keepHistory=true when keep option is selected and confirmed', async () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select keep history option
    const keepHistoryButton = screen.getByText('保留我的消息历史').closest('button');
    fireEvent.click(keepHistoryButton!);

    // Click confirm
    const confirmButton = screen.getByText('确认退出');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith(true);
    });
  });

  it('should call onConfirm with keepHistory=false when delete option is selected and confirmed', async () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select delete history option
    const deleteHistoryButton = screen.getByText('删除我的消息历史').closest('button');
    fireEvent.click(deleteHistoryButton!);

    // Click confirm
    const confirmButton = screen.getByText('确认退出');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith(false);
    });
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Find the X button (close button in header)
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg'));
    
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should show loading state when confirming', async () => {
    // Make onConfirm take some time
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select an option
    const keepHistoryButton = screen.getByText('保留我的消息历史').closest('button');
    fireEvent.click(keepHistoryButton!);

    // Click confirm
    const confirmButton = screen.getByText('确认退出');
    fireEvent.click(confirmButton);

    // Check for loading state
    await waitFor(() => {
      expect(screen.getByText('退出中...')).toBeInTheDocument();
    });
  });

  it('should close dialog after successful confirmation', async () => {
    render(
      <LeaveRoomDialog
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select an option
    const keepHistoryButton = screen.getByText('保留我的消息历史').closest('button');
    fireEvent.click(keepHistoryButton!);

    // Click confirm
    const confirmButton = screen.getByText('确认退出');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
