-- Migration: Add Companion Response Visibility Control to RLS
-- Task: 10.6 实现 Companion 响应可见性控制
-- Validates requirements: 15.3
-- 
-- This migration updates the messages RLS policy to enforce visibility control
-- for Companion responses. If a message is a Companion response with visibility='private',
-- only the Companion Owner can see it.

-- Drop existing policy
DROP POLICY IF EXISTS "Members see messages after join" ON public.messages;

-- Recreate policy with visibility control
CREATE POLICY "Members see messages after join"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
        AND messages.created_at >= room_members.joined_at
        AND (
          -- 仍在 Room 中（未退出）
          room_members.left_at IS NULL
          OR
          -- 已退出但选择保留历史，且消息在加入和退出之间
          (room_members.keep_history = TRUE AND messages.created_at <= room_members.left_at)
        )
    )
    AND (
      -- 如果消息是 Companion 响应且设置为 private，则仅 Companion Owner 可见
      NOT EXISTS (
        SELECT 1 FROM public.ai_invocations
        WHERE ai_invocations.response_message_id = messages.id
          AND ai_invocations.visibility = 'private'
          AND EXISTS (
            SELECT 1 FROM public.ai_companions
            WHERE ai_companions.id = ai_invocations.companion_id
              AND ai_companions.owner_id != auth.uid()
          )
      )
      OR
      -- 如果消息不是 Companion 响应，或者是 public 响应，或者用户是 Companion Owner，则可见
      TRUE
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'messages' 
      AND policyname = 'Members see messages after join'
  ) THEN
    RAISE EXCEPTION 'Failed to create RLS policy for message visibility control';
  END IF;
END $$;
