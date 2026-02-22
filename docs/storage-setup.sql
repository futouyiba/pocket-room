-- Supabase Storage Setup for Message Images
-- 
-- This script creates the storage bucket for message images and sets up
-- the necessary policies for secure access.
--
-- Requirements:
-- - 8.4: Message SHALL 支持图片的上传和内联显示

-- Create storage bucket for message images
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
