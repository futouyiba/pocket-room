-- Pocket Room Sprint 1 - Complete Database Schema
-- Based on design.md v1.0
-- Last Updated: 2024-01-XX

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. rooms (Room 表)
-- 修改：新增 join_strategy, passcode_hash, status 字段
CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- 加入策略（三选一）
  join_strategy TEXT CHECK (join_strategy IN ('approval', 'free', 'passcode')) DEFAULT 'approval',
  passcode_hash TEXT, -- 仅当 join_strategy = 'passcode' 时有值，使用 bcrypt 加密
  
  -- Room 状态
  status TEXT CHECK (status IN ('pending', 'active', 'archived')) DEFAULT 'pending',
  -- pending: 等待被邀请人确认
  -- active: 已建立，可正常使用
  -- archived: 已归档
  
  is_public BOOLEAN DEFAULT TRUE, -- 是否在 Room List 中可见
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_rooms_owner ON public.rooms(owner_id);

-- 2. invitations (邀请表) - 新增
CREATE TABLE public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) NOT NULL,
  
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  
  -- 邀请时分享的 Segment（可选）
  invitation_segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ,
  
  UNIQUE(room_id, invitee_id)
);

CREATE INDEX idx_invitations_invitee ON public.invitations(invitee_id, status);

-- 3. room_members (Room 成员表)
-- 修改：新增 left_at, keep_history 字段
CREATE TABLE public.room_members (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  
  -- 加入时间（决定可见消息的起点）
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 退出时间（NULL 表示仍在 Room 中）
  left_at TIMESTAMPTZ,
  
  -- 是否保留消息历史（退出时选择）
  keep_history BOOLEAN DEFAULT TRUE,
  
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_members_user ON public.room_members(user_id);
CREATE INDEX idx_room_members_room_active ON public.room_members(room_id) WHERE left_at IS NULL;

-- 4. join_requests (加入申请表)
-- 修改：新增 silenced_until, handled_at, handled_by 字段
CREATE TABLE public.join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')) DEFAULT 'pending',
  
  -- 静默冷却期（如果 Room Owner 选择静默）
  silenced_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  handled_at TIMESTAMPTZ,
  handled_by UUID REFERENCES auth.users(id),
  
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_join_requests_room_pending ON public.join_requests(room_id, status);

-- 5. room_blacklist (Room 黑名单表) - 新增
CREATE TABLE public.room_blacklist (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_by UUID REFERENCES auth.users(id) NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reason TEXT,
  
  PRIMARY KEY (room_id, user_id)
);

-- ============================================================================
-- MESSAGE TABLES
-- ============================================================================

-- 6. messages (消息表)
-- 修改：新增 message_type, shared_segment_id, attachments, updated_at 字段
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- 消息内容（Markdown 格式）
  content TEXT NOT NULL,
  
  -- 消息类型
  message_type TEXT CHECK (message_type IN ('text', 'segment_share', 'system')) DEFAULT 'text',
  
  -- 如果是 segment_share 类型，关联的 Segment
  shared_segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  
  -- 附件（图片 URL 数组，存储在 Supabase Storage）
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- 删除标记
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_messages_room_time ON public.messages(room_id, created_at DESC);
CREATE INDEX idx_messages_user ON public.messages(user_id);

-- 7. segments (Segment 表)
-- 修改：新增 is_draft, source_url, updated_at 字段
CREATE TABLE public.segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  
  -- 是否分享到 Room
  is_shared_to_room BOOLEAN DEFAULT FALSE,
  
  -- 是否为草稿（在 Basket 中）
  is_draft BOOLEAN DEFAULT FALSE,
  
  -- 如果是从浏览器扩展捕获的，记录来源 URL
  source_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_segments_creator ON public.segments(created_by);
CREATE INDEX idx_segments_room ON public.segments(room_id);
CREATE INDEX idx_segments_draft ON public.segments(created_by, is_draft) WHERE is_draft = TRUE;

-- 8. segment_messages (Segment 消息关联表)
CREATE TABLE public.segment_messages (
  segment_id UUID REFERENCES public.segments(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  
  -- 消息在 Segment 中的顺序
  message_order INT NOT NULL,
  
  PRIMARY KEY (segment_id, message_id)
);

CREATE INDEX idx_segment_messages_order ON public.segment_messages(segment_id, message_order);

-- ============================================================================
-- AI COMPANION TABLES
-- ============================================================================

-- 9. provider_connections (Provider 连接表) - 新增
CREATE TABLE public.provider_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Provider 类型
  provider TEXT CHECK (provider IN ('openai', 'google', 'anthropic')) NOT NULL,
  
  -- 外部账户 ID（如果 Provider 提供）
  account_id TEXT,
  
  -- OAuth scopes
  scopes TEXT[] NOT NULL,
  
  -- 加密存储的 tokens（使用 Supabase Vault 或应用层加密）
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  
  -- Token 过期时间
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- 额外的 Provider 特定元数据
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, provider, account_id)
);

CREATE INDEX idx_provider_connections_user ON public.provider_connections(user_id);

-- 10. ai_companions (AI Companion 表)
-- 重命名自 ai_familiars，新增 provider_connection_id, temperature, max_tokens, updated_at 字段
CREATE TABLE public.ai_companions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 关联的 Provider Connection
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE CASCADE NOT NULL,
  
  -- 模型选择
  model TEXT NOT NULL, -- 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro', etc.
  
  -- System Prompt（定义人格和语气）
  system_prompt TEXT,
  
  -- 模型参数
  temperature FLOAT DEFAULT 0.7,
  max_tokens INT DEFAULT 2000,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_companions_owner ON public.ai_companions(owner_id);

-- 11. companion_whitelist (Companion 白名单表) - 新增
CREATE TABLE public.companion_whitelist (
  companion_id UUID REFERENCES public.ai_companions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (companion_id, user_id, room_id)
);

-- 12. ai_invocations (AI 调用记录表)
-- 修改：新增 visibility, tokens_used, error_message, completed_at 字段，扩展 status 枚举
CREATE TABLE public.ai_invocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  companion_id UUID REFERENCES public.ai_companions(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  
  -- 触发者（可能是 Owner 或其他成员）
  triggered_by UUID REFERENCES auth.users(id) NOT NULL,
  
  -- 批准者（如果需要审批）
  approved_by UUID REFERENCES auth.users(id),
  
  -- 显式选择的上下文 Segment
  context_segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  
  -- 生成的响应消息
  response_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  
  -- 调用状态
  status TEXT CHECK (status IN (
    'summoned',          -- 已召唤，待命状态
    'pending_approval',  -- 等待 Owner 批准
    'processing',        -- 正在调用 API
    'completed',         -- 已完成
    'rejected',          -- Owner 拒绝
    'failed'             -- API 调用失败
  )) DEFAULT 'summoned',
  
  -- 回复可见范围
  visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
  
  -- Token 消耗统计
  tokens_used INT,
  
  -- 错误信息（如果失败）
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_invocations_room ON public.ai_invocations(room_id, created_at DESC);
CREATE INDEX idx_ai_invocations_companion ON public.ai_invocations(companion_id);
CREATE INDEX idx_ai_invocations_status ON public.ai_invocations(status) WHERE status IN ('pending_approval', 'processing');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companion_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_invocations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROOMS POLICIES
-- ============================================================================

-- 所有已登录用户可以查看已建立的 Room（状态为 active）
CREATE POLICY "Anyone can view active rooms"
  ON public.rooms FOR SELECT
  USING (status = 'active');

-- Room Owner 可以管理自己的 Room
CREATE POLICY "Owners manage their rooms"
  ON public.rooms FOR ALL
  USING (owner_id = auth.uid());

-- ============================================================================
-- INVITATIONS POLICIES
-- ============================================================================

-- 被邀请人可以查看自己的邀请
CREATE POLICY "Invitees see own invitations"
  ON public.invitations FOR SELECT
  USING (invitee_id = auth.uid());

-- 邀请者可以查看自己发出的邀请
CREATE POLICY "Inviters see sent invitations"
  ON public.invitations FOR SELECT
  USING (inviter_id = auth.uid());

-- Room Owner 可以创建邀请
CREATE POLICY "Owners can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = invitations.room_id
        AND rooms.owner_id = auth.uid()
    )
  );

-- 被邀请人可以更新邀请状态（接受/拒绝）
CREATE POLICY "Invitees can respond to invitations"
  ON public.invitations FOR UPDATE
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- ============================================================================
-- ROOM_MEMBERS POLICIES
-- ============================================================================

-- Room Member 可以查看同一 Room 的其他成员
CREATE POLICY "Members see other members"
  ON public.room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_members.room_id
        AND rm.user_id = auth.uid()
    )
  );

-- Room Owner 可以添加成员
CREATE POLICY "Owners can add members"
  ON public.room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_members.room_id
        AND rooms.owner_id = auth.uid()
    )
  );

-- 用户可以更新自己的成员记录（退出 Room）
CREATE POLICY "Users can update own membership"
  ON public.room_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- JOIN_REQUESTS POLICIES
-- ============================================================================

-- 申请者可以查看自己的申请
CREATE POLICY "Users see own requests"
  ON public.join_requests FOR SELECT
  USING (user_id = auth.uid());

-- Room Owner 可以查看自己 Room 的申请
CREATE POLICY "Owners see room requests"
  ON public.join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = join_requests.room_id
        AND rooms.owner_id = auth.uid()
    )
  );

-- 用户可以创建加入申请
CREATE POLICY "Users can create requests"
  ON public.join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Room Owner 可以处理加入申请
CREATE POLICY "Owners can handle requests"
  ON public.join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = join_requests.room_id
        AND rooms.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- ROOM_BLACKLIST POLICIES
-- ============================================================================

-- Room Owner 可以管理黑名单
CREATE POLICY "Owners manage blacklist"
  ON public.room_blacklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_blacklist.room_id
        AND rooms.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Room Member 可以查看自己加入后的消息
-- 如果用户已退出且选择删除历史，则无法访问消息
-- 如果用户已退出且选择保留历史，则可以访问加入期间的消息
-- 如果消息是 Companion 响应且 visibility = 'private'，则仅 Companion Owner 可见
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

-- Room Member 可以发送消息（仅当仍在 Room 中）
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
        AND room_members.left_at IS NULL  -- 仅当仍在 Room 中
    )
  );

-- 用户可以删除自己的消息
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SEGMENTS POLICIES
-- ============================================================================

-- Segment 创建者可以管理自己的 Segment
CREATE POLICY "Creators manage segments"
  ON public.segments FOR ALL
  USING (created_by = auth.uid());

-- Room Member 可以查看分享到 Room 的 Segment
CREATE POLICY "Members see shared segments"
  ON public.segments FOR SELECT
  USING (
    is_shared_to_room = true
    AND EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = segments.room_id
        AND room_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEGMENT_MESSAGES POLICIES
-- ============================================================================

-- Segment 创建者可以管理 Segment 消息关联
CREATE POLICY "Creators manage segment messages"
  ON public.segment_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.segments
      WHERE segments.id = segment_messages.segment_id
        AND segments.created_by = auth.uid()
    )
  );

-- ============================================================================
-- PROVIDER_CONNECTIONS POLICIES
-- ============================================================================

-- 用户只能管理自己的 Provider 连接
CREATE POLICY "Users manage own connections"
  ON public.provider_connections FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- AI_COMPANIONS POLICIES
-- ============================================================================

-- 用户管理自己的 Companion
CREATE POLICY "Users manage own companions"
  ON public.ai_companions FOR ALL
  USING (owner_id = auth.uid());

-- 所有人可以查看 Companion（用于 Room 中展示）
CREATE POLICY "Everyone can see companions"
  ON public.ai_companions FOR SELECT
  USING (true);

-- ============================================================================
-- COMPANION_WHITELIST POLICIES
-- ============================================================================

-- Companion Owner 可以管理白名单
CREATE POLICY "Owners manage whitelist"
  ON public.companion_whitelist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_companions
      WHERE ai_companions.id = companion_whitelist.companion_id
        AND ai_companions.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- AI_INVOCATIONS POLICIES
-- ============================================================================

-- Room Member 可以查看 Room 中的 Invocation
CREATE POLICY "Members see room invocations"
  ON public.ai_invocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = ai_invocations.room_id
        AND room_members.user_id = auth.uid()
    )
  );

-- 触发者可以创建 Invocation
CREATE POLICY "Triggerer can create invocation"
  ON public.ai_invocations FOR INSERT
  WITH CHECK (triggered_by = auth.uid());

-- Companion Owner 可以更新 Invocation（审批）
CREATE POLICY "Owner can approve invocation"
  ON public.ai_invocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_companions
      WHERE ai_companions.id = ai_invocations.companion_id
        AND ai_companions.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- 自动更新 updated_at 时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要 updated_at 的表添加触发器
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_connections_updated_at
  BEFORE UPDATE ON public.provider_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_companions_updated_at
  BEFORE UPDATE ON public.ai_companions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- 为需要实时更新的表启用 Realtime
-- 注意：这些命令需要在 Supabase Dashboard 中执行，或通过 Supabase CLI

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_invocations;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- 已在表定义中创建的索引：
-- - idx_rooms_status
-- - idx_rooms_owner
-- - idx_invitations_invitee
-- - idx_room_members_user
-- - idx_room_members_room_active
-- - idx_join_requests_room_pending
-- - idx_messages_room_time
-- - idx_messages_user
-- - idx_segments_creator
-- - idx_segments_room
-- - idx_segments_draft
-- - idx_segment_messages_order
-- - idx_provider_connections_user
-- - idx_ai_companions_owner
-- - idx_ai_invocations_room
-- - idx_ai_invocations_companion
-- - idx_ai_invocations_status

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.rooms IS 'Room 表：存储所有讨论空间';
COMMENT ON TABLE public.invitations IS '邀请表：管理 Room 创建时的邀请确认流程';
COMMENT ON TABLE public.room_members IS 'Room 成员表：记录用户加入和退出时间';
COMMENT ON TABLE public.join_requests IS '加入申请表：管理申请审批流程';
COMMENT ON TABLE public.room_blacklist IS 'Room 黑名单表：存储被封禁的用户';
COMMENT ON TABLE public.messages IS '消息表：存储所有 Room 消息';
COMMENT ON TABLE public.segments IS 'Segment 表：存储摘取的消息片段';
COMMENT ON TABLE public.segment_messages IS 'Segment 消息关联表：维护 Segment 中消息的顺序';
COMMENT ON TABLE public.provider_connections IS 'Provider 连接表：管理 OAuth 授权的 AI 服务商连接';
COMMENT ON TABLE public.ai_companions IS 'AI Companion 表：用户的个人 AI 助手配置';
COMMENT ON TABLE public.companion_whitelist IS 'Companion 白名单表：自动批准特定用户的请求';
COMMENT ON TABLE public.ai_invocations IS 'AI 调用记录表：追踪 Companion 的每次调用';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
