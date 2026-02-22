/**
 * Segment Creator Component Tests
 * 
 * Tests for the SegmentCreator component.
 * Requirements: 10.1, 12.1, 12.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SegmentCreator from '@/components/segments/segment-creator';

describe('SegmentCreator Component', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      content: 'First message',
      created_at: '2024-01-01T10:00:00Z',
      user_id: 'user-1',
    },
    {
      id: 'msg-2',
      content: 'Second message',
      created_at: '2024-01-01T10:01:00Z',
      user_id: 'user-1',
    },
    {
      id: 'msg-3',
      content: 'Third message',
      created_at: '2024-01-01T10:02:00Z',
      user_id: 'user-1',
    },
  ];
  
  /**
   * Test: Component renders correctly
   */
  it('should render segment creator with title', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    expect(screen.getByRole('heading', { name: '创建 Segment' })).toBeInTheDocument();
    expect(screen.getByText('选择消息并为 Segment 命名')).toBeInTheDocument();
  });
  
  /**
   * Test: Name input field
   */
  it('should have segment name input field', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    const nameInput = screen.getByLabelText(/Segment 名称/);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('placeholder', '例如：项目介绍');
  });
  
  /**
   * Test: Description input field
   */
  it('should have optional description field', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    const descriptionInput = screen.getByLabelText(/描述/);
    expect(descriptionInput).toBeInTheDocument();
  });
  
  /**
   * Test: Message list display
   * 
   * Requirement 10.1: Allow selecting messages
   */
  it('should display all messages for selection', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Third message')).toBeInTheDocument();
  });
  
  /**
   * Test: Message selection
   */
  it('should allow selecting messages', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    // Initially shows 0 selected
    expect(screen.getByText(/0 已选/)).toBeInTheDocument();
    
    // Click on first message
    const firstMessage = screen.getByText('First message').closest('div');
    fireEvent.click(firstMessage!);
    
    // Should show 1 selected
    expect(screen.getByText(/1 已选/)).toBeInTheDocument();
  });
  
  /**
   * Test: Validation - empty name
   */
  it('should show error when name is empty', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    // Click create without entering name
    const createButton = screen.getByRole('button', { name: '创建 Segment' });
    fireEvent.click(createButton);
    
    expect(screen.getByText('Segment 名称不能为空')).toBeInTheDocument();
    expect(onSegmentCreate).not.toHaveBeenCalled();
  });
  
  /**
   * Test: Validation - no messages selected
   */
  it('should show error when no messages selected', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    // Enter name but don't select messages
    const nameInput = screen.getByLabelText(/Segment 名称/);
    fireEvent.change(nameInput, { target: { value: 'Test Segment' } });
    
    // Click create
    const createButton = screen.getByRole('button', { name: '创建 Segment' });
    fireEvent.click(createButton);
    
    expect(screen.getByText('请至少选择一条消息')).toBeInTheDocument();
    expect(onSegmentCreate).not.toHaveBeenCalled();
  });
  
  /**
   * Test: Successful segment creation
   * 
   * Requirement 12.3: Preserve message order
   */
  it('should call onSegmentCreate with correct data and preserve order', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    // Enter name
    const nameInput = screen.getByLabelText(/Segment 名称/);
    fireEvent.change(nameInput, { target: { value: 'Test Segment' } });
    
    // Enter description
    const descriptionInput = screen.getByLabelText(/描述/);
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    
    // Select messages (in reverse order to test sorting)
    const thirdMessage = screen.getByText('Third message').closest('div');
    const firstMessage = screen.getByText('First message').closest('div');
    fireEvent.click(thirdMessage!);
    fireEvent.click(firstMessage!);
    
    // Click create
    const createButton = screen.getByRole('button', { name: '创建 Segment' });
    fireEvent.click(createButton);
    
    // Verify callback was called with correct data
    expect(onSegmentCreate).toHaveBeenCalledWith({
      name: 'Test Segment',
      description: 'Test description',
      messageIds: ['msg-1', 'msg-3'], // Should be in chronological order
    });
  });
  
  /**
   * Test: Cancel button
   */
  it('should call onCancel when cancel button clicked', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={mockMessages}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
    expect(onSegmentCreate).not.toHaveBeenCalled();
  });
  
  /**
   * Test: Empty message list
   */
  it('should show message when no messages available', () => {
    const onSegmentCreate = vi.fn();
    const onCancel = vi.fn();
    
    render(
      <SegmentCreator
        messages={[]}
        onSegmentCreate={onSegmentCreate}
        onCancel={onCancel}
      />
    );
    
    expect(screen.getByText('暂无消息可选')).toBeInTheDocument();
  });
});
