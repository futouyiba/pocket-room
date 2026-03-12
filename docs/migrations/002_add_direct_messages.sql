-- Migration: Add Direct Messages Table
-- Date: 2024-01-XX
-- Description: Adds direct_messages table for Sprint 1 simplified DM implementation (Requirement 12.5)

-- ============================================================================
-- DIRECT MESSAGES TABLE (Sprint 1 Simplified)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Shared segment (Sprint 1 only supports segment sharing via DM)
  shared_segment_id UUID REFERENCES public.segments(id) ON DELETE CASCADE NOT NULL,
  
  -- Optional message content
  content TEXT,
  
  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON public.direct_messages(recipient_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
DROP POLICY IF EXISTS "Users see own direct messages" ON public.direct_messages;
CREATE POLICY "Users see own direct messages"
  ON public.direct_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send direct messages
DROP POLICY IF EXISTS "Users can send direct messages" ON public.direct_messages;
CREATE POLICY "Users can send direct messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Recipients can update read status
DROP POLICY IF EXISTS "Recipients can mark as read" ON public.direct_messages;
CREATE POLICY "Recipients can mark as read"
  ON public.direct_messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.direct_messages IS 'Direct Messages 表：Sprint 1 简化实现，仅支持 Segment 分享';
COMMENT ON COLUMN public.direct_messages.shared_segment_id IS 'Sprint 1 仅支持通过 DM 分享 Segment';

