"use client";

import { useState, useRef } from 'react';
import { Image, X, Upload, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  onRemove?: () => void;
  maxSizeMB?: number;
}

export function ImageUpload({ 
  onImageUploaded, 
  onRemove,
  maxSizeMB = 5 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`Image size must be less than ${maxSizeMB}MB`);
      return;
    }

    try {
      setIsUploading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-images')
        .getPublicUrl(data.path);

      setUploadedImageUrl(publicUrl);
      onImageUploaded(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedImageUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (uploadedImageUrl) {
    return (
      <div className="relative inline-block">
        <img
          src={uploadedImageUrl}
          alt="Uploaded preview"
          className="max-w-xs max-h-32 rounded-lg border border-gray-200"
        />
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
          title="Remove image"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        title="Upload image"
      >
        {isUploading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Image size={20} />
        )}
      </button>

      {error && (
        <div className="absolute bottom-full mb-2 left-0 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg shadow-lg border border-red-200 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
