# Task 6.4: Image Upload and Display Implementation

## Overview

Implemented image upload and inline display functionality for messages in Pocket Room, fulfilling requirement 8.4.

## Requirements

- **需求 8.4**: Message SHALL 支持图片的上传和内联显示

## Implementation

### 1. Components

#### ImageUpload Component (`components/rooms/image-upload.tsx`)

A reusable component for uploading images to Supabase Storage:

**Features:**
- File type validation (images only)
- File size validation (configurable, default 5MB)
- Upload progress indication
- Image preview after upload
- Remove uploaded image functionality
- Error handling and user feedback

**Props:**
- `onImageUploaded: (url: string) => void` - Callback when image is uploaded
- `onRemove?: () => void` - Callback when image is removed
- `maxSizeMB?: number` - Maximum file size in MB (default: 5)

**Usage:**
```tsx
<ImageUpload
  onImageUploaded={(url) => setAttachedImageUrl(url)}
  onRemove={() => setAttachedImageUrl(null)}
  maxSizeMB={5}
/>
```

### 2. Storage Setup

#### Supabase Storage Bucket

Created `message-images` bucket with the following configuration:
- **Public access**: Yes (images are publicly viewable)
- **File size limit**: 5MB
- **Allowed MIME types**: image/png, image/jpeg, image/jpg, image/gif, image/webp

#### Storage Policies

Implemented Row Level Security policies for the storage bucket:

1. **Upload Policy**: Authenticated users can upload images to their own folder
   - Path structure: `{user_id}/{timestamp}.{ext}`
   - Ensures users can only upload to their own directory

2. **View Policy**: Anyone can view images (public bucket)
   - Supports sharing images in messages

3. **Delete Policy**: Users can delete their own images
   - Users can only delete images in their own folder

4. **Update Policy**: Users can update their own images
   - Users can only update images in their own folder

#### Setup Scripts

- **SQL Script**: `docs/storage-setup.sql` - Creates bucket and policies
- **TypeScript Script**: `scripts/setup-storage.ts` - Automated setup script

**To set up storage:**
```bash
# Option 1: Run TypeScript script
npx tsx scripts/setup-storage.ts

# Option 2: Execute SQL script in Supabase SQL editor
# Copy and paste contents of docs/storage-setup.sql
```

### 3. Room Page Integration

Updated `app/rooms/[id]/page.tsx` to integrate image upload:

**Changes:**
1. Added `ImageUpload` component import
2. Added `attachedImageUrl` state to track uploaded image
3. Updated message input area to include image upload button
4. Modified `handleSendMessage` to:
   - Accept messages with only images (no text required)
   - Include image URL in message content as Markdown: `![Image](url)`
   - Pass `attachments` array to API
5. Added image preview display when image is attached

**UI Flow:**
1. User clicks image upload button
2. File picker opens
3. User selects image
4. Image uploads to Supabase Storage
5. Preview shows below input area
6. User can remove image or send message
7. Message is sent with image URL in content and attachments array

### 4. Message API Update

The `send-message` API (`app/api/messages/send/route.ts`) already supports the `attachments` field:

```typescript
interface SendMessageRequest {
  roomId: string;
  content: string;
  attachments?: string[]; // Array of image URLs
}
```

The API:
- Validates that content or attachments are provided
- Stores attachments in the `messages.attachments` JSONB field
- Supabase Realtime automatically pushes messages to all room members

### 5. Message Display

The `MessageItem` component (`components/rooms/message-item.tsx`) already supports image display through Markdown rendering:

**Features:**
- Uses `react-markdown` with `remark-gfm` plugin
- Custom image renderer with styling:
  - `max-w-full` - Responsive width
  - `h-auto` - Maintains aspect ratio
  - `rounded-lg` - Rounded corners
  - `my-2` - Vertical spacing

**Markdown Format:**
```markdown
![Alt text](https://example.com/image.jpg)
```

Images are automatically rendered inline in messages.

## Data Model

### messages Table

The `attachments` field stores image URLs as a JSONB array:

```sql
attachments JSONB DEFAULT '[]'::jsonb
```

**Example:**
```json
{
  "id": "msg-123",
  "content": "Check this out: ![Image](https://...)",
  "attachments": [
    "https://supabase.co/storage/v1/object/public/message-images/user-123/1234567890.jpg"
  ]
}
```

## Testing

### Unit Tests (`tests/image-upload.test.tsx`)

Tests for the `ImageUpload` component:
- ✅ Renders upload button
- ✅ Validates file type (images only)
- ✅ Validates file size
- ✅ Uploads image successfully
- ✅ Shows image preview
- ✅ Removes uploaded image
- ✅ Handles upload errors
- ✅ Handles unauthenticated users

### Integration Tests (`tests/image-upload-integration.test.ts`)

Tests for the complete upload flow:
- ✅ Upload image to storage and create message with attachment
- ✅ Store multiple images in attachments array
- ✅ Allow message with only image (no text)
- ✅ Handle empty attachments array
- ✅ Validate image file types

**Run tests:**
```bash
cd apps/web
npm run test image-upload
```

## Security Considerations

1. **File Type Validation**: Client-side validation ensures only images are uploaded
2. **File Size Limit**: Configurable limit prevents large uploads (default 5MB)
3. **User Isolation**: Storage policies ensure users can only upload to their own folder
4. **Public Access**: Images are publicly accessible (required for sharing in messages)
5. **Authentication**: Upload requires authenticated user

## User Experience

### Upload Flow

1. **Select Image**: Click image icon in message input area
2. **File Picker**: Browser file picker opens (filtered to images)
3. **Validation**: Client validates file type and size
4. **Upload**: Image uploads to Supabase Storage with progress indicator
5. **Preview**: Uploaded image shows as preview below input
6. **Send**: User can send message with image or remove and try again

### Error Handling

- **Invalid File Type**: "Please select an image file"
- **File Too Large**: "Image size must be less than XMB"
- **Upload Failed**: Shows specific error message from Supabase
- **Not Authenticated**: "User not authenticated"

### Visual Feedback

- **Uploading**: Spinner icon replaces upload button
- **Preview**: Thumbnail preview with remove button
- **Error**: Red error message appears near upload button

## Future Enhancements

Potential improvements for future sprints:

1. **Image Compression**: Compress images before upload to reduce storage costs
2. **Multiple Images**: Allow uploading multiple images at once
3. **Drag & Drop**: Support drag-and-drop image upload
4. **Paste from Clipboard**: Support pasting images from clipboard
5. **Image Gallery**: View all images in a room as a gallery
6. **Image Editing**: Basic editing (crop, rotate) before upload
7. **CDN Integration**: Use CDN for faster image delivery
8. **Lazy Loading**: Lazy load images in long message threads

## Deployment Checklist

Before deploying to production:

- [ ] Run storage setup script: `npx tsx scripts/setup-storage.ts`
- [ ] Execute SQL script in Supabase: `docs/storage-setup.sql`
- [ ] Verify bucket exists in Supabase Dashboard
- [ ] Test image upload in staging environment
- [ ] Verify storage policies are working correctly
- [ ] Check image display in messages
- [ ] Test on mobile devices
- [ ] Monitor storage usage and costs

## Related Files

### New Files
- `components/rooms/image-upload.tsx` - Image upload component
- `docs/storage-setup.sql` - Storage bucket and policies SQL
- `scripts/setup-storage.ts` - Automated setup script
- `tests/image-upload.test.tsx` - Unit tests
- `tests/image-upload-integration.test.ts` - Integration tests
- `docs/TASK_6.4_IMAGE_UPLOAD_SUMMARY.md` - This document

### Modified Files
- `app/rooms/[id]/page.tsx` - Integrated image upload in Room page
- `app/api/messages/send/route.ts` - Already supported attachments field

### Existing Files (No Changes Needed)
- `components/rooms/message-item.tsx` - Already supports image display via Markdown
- `docs/db.sql` - Already has attachments field in messages table

## Verification

To verify the implementation:

1. **Setup Storage**:
   ```bash
   npx tsx scripts/setup-storage.ts
   ```

2. **Run Tests**:
   ```bash
   cd apps/web
   npm run test image-upload
   ```

3. **Manual Testing**:
   - Navigate to a room
   - Click image upload button
   - Select an image file
   - Verify preview appears
   - Send message
   - Verify image displays inline in message
   - Verify image is stored in Supabase Storage
   - Verify attachments array in database

4. **Check Storage**:
   - Open Supabase Dashboard
   - Navigate to Storage > message-images
   - Verify uploaded images are present
   - Verify folder structure: `{user_id}/{timestamp}.{ext}`

## Conclusion

Task 6.4 is complete. Image upload and display functionality has been successfully implemented, fulfilling requirement 8.4. Users can now upload images to messages, and images are displayed inline using Markdown rendering.
