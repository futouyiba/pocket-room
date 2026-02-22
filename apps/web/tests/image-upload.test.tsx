/**
 * Image Upload Component Tests
 * 
 * Tests for the image upload functionality in messages.
 * 
 * Requirements:
 * - 8.4: Message SHALL 支持图片的上传和内联显示
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUpload } from '@/components/rooms/image-upload';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('ImageUpload Component', () => {
  const mockOnImageUploaded = vi.fn();
  const mockOnRemove = vi.fn();

  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockReturnValue(mockSupabase);
  });

  it('should render upload button', () => {
    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />);
    
    const button = screen.getByTitle('Upload image');
    expect(button).toBeDefined();
  });

  it('should show error for non-image files', async () => {
    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();

    // Create a non-image file
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    // Trigger file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Please select an image file')).toBeDefined();
    });
  });

  it('should show error for files exceeding size limit', async () => {
    render(<ImageUpload onImageUploaded={mockOnImageUploaded} maxSizeMB={1} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a large file (2MB)
    const largeContent = new Array(2 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Image size must be less than 1MB')).toBeDefined();
    });
  });

  it('should upload image successfully', async () => {
    const mockUser = { id: 'user-123' };
    const mockUploadData = { path: 'user-123/12345.jpg' };
    const mockPublicUrl = 'https://example.com/image.jpg';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockUpload = vi.fn().mockResolvedValue({
      data: mockUploadData,
      error: null,
    });

    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: mockPublicUrl },
    });

    mockSupabase.storage.from.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create an image file
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
      expect(mockGetPublicUrl).toHaveBeenCalledWith(mockUploadData.path);
      expect(mockOnImageUploaded).toHaveBeenCalledWith(mockPublicUrl);
    });

    // Should show preview
    await waitFor(() => {
      const preview = screen.getByAltText('Uploaded preview');
      expect(preview).toBeDefined();
      expect(preview.getAttribute('src')).toBe(mockPublicUrl);
    });
  });

  it('should remove uploaded image', async () => {
    const mockUser = { id: 'user-123' };
    const mockUploadData = { path: 'user-123/12345.jpg' };
    const mockPublicUrl = 'https://example.com/image.jpg';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: mockUploadData,
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      }),
    });

    render(
      <ImageUpload 
        onImageUploaded={mockOnImageUploaded} 
        onRemove={mockOnRemove}
      />
    );
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByAltText('Uploaded preview')).toBeDefined();
    });

    // Click remove button
    const removeButton = screen.getByTitle('Remove image');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalled();
      expect(screen.queryByAltText('Uploaded preview')).toBeNull();
    });
  });

  it('should handle upload errors gracefully', async () => {
    const mockUser = { id: 'user-123' };
    const mockError = new Error('Upload failed');

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeDefined();
    });

    expect(mockOnImageUploaded).not.toHaveBeenCalled();
  });

  it('should handle unauthenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    render(<ImageUpload onImageUploaded={mockOnImageUploaded} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('User not authenticated')).toBeDefined();
    });

    expect(mockOnImageUploaded).not.toHaveBeenCalled();
  });
});
