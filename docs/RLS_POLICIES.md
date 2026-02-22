# Row Level Security (RLS) 策略文档

## 概述

本文档详细说明 Pocket Room Sprint 1 中所有表的 Row Level Security (RLS) 策略。RLS 是 PostgreSQL 的原生安全特性，确保用户只能访问自己有权限的数据，在数据库层面提供细粒度的访问控制。

### 核心安全原则

1. **最小权限原则**：用户只能访问必需的数据
2. **数据隔离**：不同用户的数据严格隔离
3. **透明性**：未授权访问返回空结果，不泄露资源存在性
4. **防御深度**：RLS 作为最后一道防线，即使应用层有漏洞也能保护数据

### RLS 启用状态

所有 12 个核心表都已启用 RLS：

- ✅ `rooms` - Room 表
- ✅ `invitations` - 邀请表
- ✅ `room_members` - Room 成员表
- ✅ `join_requests` - 加入申请表
- ✅ `room_blacklist` - Room 黑名单表
- ✅ `messages` - 消息表
- ✅ `segments` - Segment 表
- ✅ `segment_messages` - Segment 消息关联表
- ✅ `provider_connections` - Provider 连接表
- ✅ `ai_companions` - AI Companion 表
- ✅ `companion_whitelist` - Companion 白名单表
- ✅ `ai_invocations` - AI 调用记录表

## 安全模型

### 认证上下文

所有 RLS 策略使用 `auth.uid()` 函数获取当前认证用户的 ID。这个函数由 Supabase Auth 提供，返回当前会话用户的 UUID。


### 访问模式

#### 1. 所有权模式（Ownership）
用户只能访问自己拥有的资源。

**适用表**：
- `provider_connections` - 用户只能管理自己的 AI 服务商连接
- `ai_companions` - 用户只能管理自己的 Companion

**策略示例**：
```sql
USING (owner_id = auth.uid())
```

#### 2. 成员模式（Membership）
用户只能访问自己所属 Room 的资源。

**适用表**：
- `messages` - 只能看到所属 Room 的消息
- `room_members` - 只能看到同一 Room 的成员
- `ai_invocations` - 只能看到所属 Room 的 Companion 调用

**策略示例**：
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = messages.room_id
      AND room_members.user_id = auth.uid()
  )
)
```

#### 3. 时间窗口模式（Time Window）
用户只能访问特定时间点之后的资源。

**适用表**：
- `messages` - 只能看到加入 Room 后的消息

**策略示例**：
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = messages.room_id
      AND room_members.user_id = auth.uid()
      AND messages.created_at >= room_members.joined_at
  )
)
```


#### 4. 角色模式（Role-Based）
基于用户在 Room 中的角色授予权限。

**适用表**：
- `rooms` - Room Owner 可以管理自己的 Room
- `invitations` - Room Owner 可以创建邀请
- `join_requests` - Room Owner 可以处理加入申请
- `room_blacklist` - Room Owner 可以管理黑名单

**策略示例**：
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = join_requests.room_id
      AND rooms.owner_id = auth.uid()
  )
)
```

#### 5. 公开可见模式（Public Visibility）
特定资源对所有认证用户可见。

**适用表**：
- `rooms` - 所有 active 状态的 Room 对所有用户可见
- `ai_companions` - 所有 Companion 对所有用户可见（用于 Room 中展示）

**策略示例**：
```sql
USING (status = 'active')
```

## 详细策略说明

### 1. rooms 表策略

**表用途**：存储所有讨论空间（Room）

**策略列表**：

#### 策略 1.1：Anyone can view active rooms
```sql
CREATE POLICY "Anyone can view active rooms"
  ON public.rooms FOR SELECT
  USING (status = 'active');
```

**说明**：
- 所有已登录用户可以查看状态为 `active` 的 Room
- `pending` 状态的 Room（等待邀请确认）对所有人不可见
- `archived` 状态的 Room 对所有人不可见

**验证需求**：4.1, 4.2


#### 策略 1.2：Owners manage their rooms
```sql
CREATE POLICY "Owners manage their rooms"
  ON public.rooms FOR ALL
  USING (owner_id = auth.uid());
```

**说明**：
- Room Owner 可以对自己的 Room 执行所有操作（SELECT, INSERT, UPDATE, DELETE）
- 包括查看 `pending` 状态的 Room（虽然不会在列表中显示）
- 允许 Owner 更新 Room 配置（名称、描述、加入策略等）

**验证需求**：3.1, 3.2, 3.3

---

### 2. invitations 表策略

**表用途**：管理 Room 创建时的邀请确认流程

**策略列表**：

#### 策略 2.1：Invitees see own invitations
```sql
CREATE POLICY "Invitees see own invitations"
  ON public.invitations FOR SELECT
  USING (invitee_id = auth.uid());
```

**说明**：
- 被邀请人可以查看发给自己的邀请
- 用于展示待处理的邀请列表

**验证需求**：3.5

#### 策略 2.2：Inviters see sent invitations
```sql
CREATE POLICY "Inviters see sent invitations"
  ON public.invitations FOR SELECT
  USING (inviter_id = auth.uid());
```

**说明**：
- 邀请者（通常是 Room Owner）可以查看自己发出的邀请
- 用于追踪邀请状态

**验证需求**：3.5


#### 策略 2.3：Owners can create invitations
```sql
CREATE POLICY "Owners can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = invitations.room_id
        AND rooms.owner_id = auth.uid()
    )
  );
```

**说明**：
- 只有 Room Owner 可以为自己的 Room 创建邀请
- 防止用户为其他人的 Room 创建邀请

**验证需求**：3.1

#### 策略 2.4：Invitees can respond to invitations
```sql
CREATE POLICY "Invitees can respond to invitations"
  ON public.invitations FOR UPDATE
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());
```

**说明**：
- 被邀请人可以更新邀请状态（接受或拒绝）
- `USING` 子句确保只能更新发给自己的邀请
- `WITH CHECK` 子句确保不能将邀请转移给其他人

**验证需求**：3.5, 3.7

---

### 3. room_members 表策略

**表用途**：记录用户加入和退出 Room 的时间

**策略列表**：

#### 策略 3.1：Members see other members
```sql
CREATE POLICY "Members see other members"
  ON public.room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_members.room_id
        AND rm.user_id = auth.uid()
    )
  );
```

**说明**：
- Room Member 可以查看同一 Room 的其他成员
- 非成员无法查看 Room 的成员列表

**验证需求**：4.2


#### 策略 3.2：Owners can add members
```sql
CREATE POLICY "Owners can add members"
  ON public.room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_members.room_id
        AND rooms.owner_id = auth.uid()
    )
  );
```

**说明**：
- Room Owner 可以添加新成员
- 用于邀请确认和加入申请批准流程

**验证需求**：3.5, 5.3

#### 策略 3.3：Users can update own membership
```sql
CREATE POLICY "Users can update own membership"
  ON public.room_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**说明**：
- 用户可以更新自己的成员记录
- 主要用于退出 Room（设置 `left_at` 和 `keep_history`）

**验证需求**：11.2, 11.3, 11.4, 11.5

---

### 4. join_requests 表策略

**表用途**：管理申请审批流程

**策略列表**：

#### 策略 4.1：Users see own requests
```sql
CREATE POLICY "Users see own requests"
  ON public.join_requests FOR SELECT
  USING (user_id = auth.uid());
```

**说明**：
- 申请者可以查看自己的加入申请
- 用于追踪申请状态

**验证需求**：5.1


#### 策略 4.2：Owners see room requests
```sql
CREATE POLICY "Owners see room requests"
  ON public.join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = join_requests.room_id
        AND rooms.owner_id = auth.uid()
    )
  );
```

**说明**：
- Room Owner 可以查看自己 Room 的所有加入申请
- 用于展示加入申请队列

**验证需求**：5.1, 5.7

#### 策略 4.3：Users can create requests
```sql
CREATE POLICY "Users can create requests"
  ON public.join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

**说明**：
- 用户可以创建加入申请
- 确保用户只能为自己创建申请，不能冒充他人

**验证需求**：5.1

#### 策略 4.4：Owners can handle requests
```sql
CREATE POLICY "Owners can handle requests"
  ON public.join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = join_requests.room_id
        AND rooms.owner_id = auth.uid()
    )
  );
```

**说明**：
- Room Owner 可以处理加入申请（批准、拒绝、封禁、静默）
- 更新 `status`、`silenced_until`、`handled_at`、`handled_by` 字段

**验证需求**：5.2, 5.3, 5.4, 5.5, 5.6

---

### 5. room_blacklist 表策略

**表用途**：存储被封禁的用户

**策略列表**：


#### 策略 5.1：Owners manage blacklist
```sql
CREATE POLICY "Owners manage blacklist"
  ON public.room_blacklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_blacklist.room_id
        AND rooms.owner_id = auth.uid()
    )
  );
```

**说明**：
- Room Owner 可以管理自己 Room 的黑名单
- 包括添加、查看、删除黑名单记录
- 被封禁的用户无法查看黑名单记录（不泄露自己被封禁的信息）

**验证需求**：5.5

---

### 6. messages 表策略

**表用途**：存储所有 Room 消息

**策略列表**：

#### 策略 6.1：Members see messages after join
```sql
CREATE POLICY "Members see messages after join"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
        AND messages.created_at >= room_members.joined_at
    )
  );
```

**说明**：
- Room Member 只能查看自己加入后的消息
- `messages.created_at >= room_members.joined_at` 确保时间窗口限制
- 这是 Pocket Room 的核心隐私特性：后加入成员看不到历史消息

**验证需求**：9.2, 9.3, 17.2

**安全属性**：属性 26（后加入成员消息可见性）、属性 44（消息 RLS 成员检查）


#### 策略 6.2：Members can send messages
```sql
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
    )
  );
```

**说明**：
- 只有 Room Member 可以发送消息
- 非成员无法向 Room 发送消息

**验证需求**：8.1

#### 策略 6.3：Users can delete own messages
```sql
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**说明**：
- 用户只能删除（标记为已删除）自己的消息
- 实际上是更新 `is_deleted` 和 `deleted_at` 字段，不是物理删除

**验证需求**：8.5

---

### 7. segments 表策略

**表用途**：存储摘取的消息片段

**策略列表**：

#### 策略 7.1：Creators manage segments
```sql
CREATE POLICY "Creators manage segments"
  ON public.segments FOR ALL
  USING (created_by = auth.uid());
```

**说明**：
- Segment 创建者可以管理自己的 Segment
- 包括创建、查看、更新、删除操作

**验证需求**：12.1, 12.6


#### 策略 7.2：Members see shared segments
```sql
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
```

**说明**：
- Room Member 可以查看分享到 Room 的 Segment
- 只有 `is_shared_to_room = true` 的 Segment 才对其他成员可见
- 草稿 Segment（`is_draft = true`）只有创建者可见

**验证需求**：12.4

---

### 8. segment_messages 表策略

**表用途**：维护 Segment 中消息的顺序

**策略列表**：

#### 策略 8.1：Creators manage segment messages
```sql
CREATE POLICY "Creators manage segment messages"
  ON public.segment_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.segments
      WHERE segments.id = segment_messages.segment_id
        AND segments.created_by = auth.uid()
    )
  );
```

**说明**：
- Segment 创建者可以管理 Segment 的消息关联
- 用于创建 Segment 时添加消息，或编辑 Segment 时调整消息顺序

**验证需求**：12.1, 12.3

---

### 9. provider_connections 表策略

**表用途**：管理 OAuth 授权的 AI 服务商连接

**策略列表**：


#### 策略 9.1：Users manage own connections
```sql
CREATE POLICY "Users manage own connections"
  ON public.provider_connections FOR ALL
  USING (user_id = auth.uid());
```

**说明**：
- 用户只能管理自己的 Provider 连接
- 包括创建、查看、更新、删除操作
- 其他用户无法查看或修改他人的 Provider 连接（包括加密的 token）

**验证需求**：2.3, 2.6, 2.9, 17.3

**安全属性**：属性 4（Token 安全存储）、属性 45（资源所有权 RLS）

---

### 10. ai_companions 表策略

**表用途**：用户的个人 AI 助手配置

**策略列表**：

#### 策略 10.1：Users manage own companions
```sql
CREATE POLICY "Users manage own companions"
  ON public.ai_companions FOR ALL
  USING (owner_id = auth.uid());
```

**说明**：
- 用户只能管理自己的 Companion
- 包括创建、更新、删除操作
- 其他用户无法修改他人的 Companion 配置

**验证需求**：13.1, 13.2, 13.3, 13.4, 13.5, 17.3

**安全属性**：属性 34（多 Companion 注册）、属性 35（Companion 需要有效连接）、属性 45（资源所有权 RLS）

#### 策略 10.2：Everyone can see companions
```sql
CREATE POLICY "Everyone can see companions"
  ON public.ai_companions FOR SELECT
  USING (true);
```

**说明**：
- 所有认证用户可以查看 Companion 的基本信息
- 用于在 Room 中展示 Companion 列表（供其他成员请求）
- 不包括修改权限，只有 Owner 可以修改

**验证需求**：14.2


---

### 11. companion_whitelist 表策略

**表用途**：自动批准特定用户的请求

**策略列表**：

#### 策略 11.1：Owners manage whitelist
```sql
CREATE POLICY "Owners manage whitelist"
  ON public.companion_whitelist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_companions
      WHERE ai_companions.id = companion_whitelist.companion_id
        AND ai_companions.owner_id = auth.uid()
    )
  );
```

**说明**：
- Companion Owner 可以管理自己 Companion 的白名单
- 包括添加、查看、删除白名单记录
- 白名单成员无法查看自己是否在白名单中（隐私保护）

**验证需求**：14.4, 14.7

---

### 12. ai_invocations 表策略

**表用途**：追踪 Companion 的每次调用

**策略列表**：

#### 策略 12.1：Members see room invocations
```sql
CREATE POLICY "Members see room invocations"
  ON public.ai_invocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = ai_invocations.room_id
        AND room_members.user_id = auth.uid()
    )
  );
```

**说明**：
- Room Member 可以查看 Room 中的所有 Companion 调用记录
- 用于展示 Companion 的状态（召唤、等待审批、处理中、已完成）
- 非成员无法查看 Room 的 Companion 调用记录

**验证需求**：17.4

**安全属性**：属性 46（Invocation RLS 成员检查）


#### 策略 12.2：Triggerer can create invocation
```sql
CREATE POLICY "Triggerer can create invocation"
  ON public.ai_invocations FOR INSERT
  WITH CHECK (triggered_by = auth.uid());
```

**说明**：
- 用户可以创建 Companion 调用记录
- 确保 `triggered_by` 字段正确记录触发者
- 防止用户冒充他人触发 Companion

**验证需求**：14.1, 14.2

#### 策略 12.3：Owner can approve invocation
```sql
CREATE POLICY "Owner can approve invocation"
  ON public.ai_invocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_companions
      WHERE ai_companions.id = ai_invocations.companion_id
        AND ai_companions.owner_id = auth.uid()
    )
  );
```

**说明**：
- Companion Owner 可以更新 Invocation 记录（审批）
- 用于批准或拒绝 Companion 请求
- 更新 `status`、`approved_by`、`visibility`、`tokens_used` 等字段

**验证需求**：14.4, 14.5

---

## 安全验证

### 验证方法

#### 1. 表级 RLS 启用检查

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'rooms', 'invitations', 'room_members', 'join_requests', 'room_blacklist',
    'messages', 'segments', 'segment_messages',
    'provider_connections', 'ai_companions', 'companion_whitelist', 'ai_invocations'
  );
```

**预期结果**：所有表的 `rowsecurity` 列应该为 `true`。


#### 2. 策略列表检查

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**预期结果**：应该看到所有 12 个表的策略定义。

#### 3. 未授权访问测试

**测试场景 1：非成员尝试查看 Room 消息**

```sql
-- 以用户 A 身份登录
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_a_id>';

-- 尝试查询用户 A 不是成员的 Room 的消息
SELECT * FROM public.messages WHERE room_id = '<room_b_id>';
```

**预期结果**：返回空结果集（不是错误），不泄露消息是否存在。

**测试场景 2：后加入成员尝试查看加入前的消息**

```sql
-- 以用户 B 身份登录（在 T2 时刻加入 Room）
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_b_id>';

-- 尝试查询 T1 时刻（加入前）的消息
SELECT * FROM public.messages
WHERE room_id = '<room_id>'
  AND created_at < (
    SELECT joined_at FROM public.room_members
    WHERE room_id = '<room_id>' AND user_id = '<user_b_id>'
  );
```

**预期结果**：返回空结果集。

**测试场景 3：用户尝试查看他人的 Provider 连接**

```sql
-- 以用户 A 身份登录
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_a_id>';

-- 尝试查询用户 B 的 Provider 连接
SELECT * FROM public.provider_connections WHERE user_id = '<user_b_id>';
```

**预期结果**：返回空结果集，不泄露用户 B 是否有 Provider 连接。


#### 4. 授权访问测试

**测试场景 1：Room Member 查看加入后的消息**

```sql
-- 以用户 A 身份登录（Room Member）
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_a_id>';

-- 查询加入后的消息
SELECT * FROM public.messages
WHERE room_id = '<room_id>'
  AND created_at >= (
    SELECT joined_at FROM public.room_members
    WHERE room_id = '<room_id>' AND user_id = '<user_a_id>'
  );
```

**预期结果**：返回用户 A 加入后的所有消息。

**测试场景 2：Room Owner 处理加入申请**

```sql
-- 以 Room Owner 身份登录
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<owner_id>';

-- 更新加入申请状态
UPDATE public.join_requests
SET status = 'approved', handled_at = NOW(), handled_by = '<owner_id>'
WHERE room_id = '<room_id>' AND user_id = '<applicant_id>';
```

**预期结果**：更新成功。

**测试场景 3：用户管理自己的 Companion**

```sql
-- 以用户 A 身份登录
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_a_id>';

-- 更新自己的 Companion
UPDATE public.ai_companions
SET system_prompt = 'New prompt'
WHERE id = '<companion_id>' AND owner_id = '<user_a_id>';
```

**预期结果**：更新成功。

---

## 性能考虑

### 索引优化

RLS 策略依赖的字段都已创建索引，确保查询性能：


**关键索引**：

1. **room_members 表**：
   - `idx_room_members_user` - 用于 `user_id` 查询
   - `idx_room_members_room_active` - 用于活跃成员查询

2. **messages 表**：
   - `idx_messages_room_time` - 用于按 Room 和时间查询消息
   - `idx_messages_user` - 用于按用户查询消息

3. **rooms 表**：
   - `idx_rooms_status` - 用于按状态过滤 Room
   - `idx_rooms_owner` - 用于按 Owner 查询 Room

4. **ai_invocations 表**：
   - `idx_ai_invocations_room` - 用于按 Room 查询 Invocation
   - `idx_ai_invocations_companion` - 用于按 Companion 查询 Invocation

### 查询优化建议

1. **避免全表扫描**：
   - 始终在查询中包含 `room_id` 或 `user_id` 过滤条件
   - 利用索引加速 RLS 策略的 EXISTS 子查询

2. **批量操作**：
   - 使用 `IN` 子句批量查询多个 Room 的数据
   - 避免在循环中执行单条查询

3. **缓存策略**：
   - 在应用层缓存用户的 Room 成员身份
   - 减少重复的 RLS 检查

---

## 常见问题

### Q1：为什么未授权访问返回空结果而不是错误？

**A**：这是 RLS 的设计原则，称为"透明性"。返回空结果而不是错误有以下好处：
- 不泄露资源是否存在（防止信息泄露）
- 简化应用层逻辑（不需要区分"不存在"和"无权限"）
- 提高安全性（攻击者无法通过错误消息推断系统状态）


### Q2：RLS 策略会影响性能吗？

**A**：RLS 策略会增加查询复杂度，但影响可控：
- PostgreSQL 查询优化器会优化 RLS 策略的执行
- 通过合理的索引可以最小化性能影响
- 对于大多数查询，RLS 开销在 5-10% 范围内
- 安全性收益远大于性能成本

### Q3：如何调试 RLS 策略？

**A**：使用以下方法调试 RLS 策略：

1. **查看策略定义**：
```sql
SELECT * FROM pg_policies WHERE tablename = 'messages';
```

2. **模拟用户身份**：
```sql
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<user_id>';
```

3. **查看查询计划**：
```sql
EXPLAIN ANALYZE SELECT * FROM public.messages WHERE room_id = '<room_id>';
```

4. **临时禁用 RLS（仅开发环境）**：
```sql
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
```

### Q4：如何处理 RLS 策略冲突？

**A**：PostgreSQL 的 RLS 策略是"宽松"（permissive）模式：
- 多个策略之间是 OR 关系
- 只要满足任一策略，就允许访问
- 例如：`messages` 表有两个 SELECT 策略，满足其中一个即可查看消息

### Q5：Service Role 会受 RLS 限制吗？

**A**：不会。Supabase Service Role 拥有 `service_role` 权限，可以绕过所有 RLS 策略：
- 用于后台任务和管理操作
- 不应该暴露给客户端
- 存储在服务器端环境变量中


---

## 最佳实践

### 1. 应用层验证

虽然 RLS 提供了数据库层的安全保障，但应用层仍应该进行验证：
- 在 UI 中隐藏用户无权访问的功能
- 在 API 层进行业务逻辑验证
- RLS 作为最后一道防线，防止绕过应用层的攻击

### 2. 最小权限原则

- 客户端使用 `anon` 或 `authenticated` 角色
- 后台任务使用 `service_role`
- 不要在客户端暴露 `service_role` key

### 3. 定期审计

- 定期检查 RLS 策略是否符合业务需求
- 使用自动化测试验证 RLS 策略
- 监控未授权访问尝试（可能的攻击）

### 4. 文档维护

- 每次修改 RLS 策略时更新本文档
- 记录策略变更的原因和影响
- 保持策略命名的一致性和可读性

---

## 策略变更历史

| 日期 | 表名 | 策略名称 | 变更类型 | 说明 |
|------|------|----------|----------|------|
| 2024-01-XX | 所有表 | - | 初始创建 | 创建所有 12 个表的 RLS 策略 |

---

## 相关文档

- [数据库 Schema 文档](./db.sql)
- [Schema 变更文档](./SCHEMA_CHANGES.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [设计文档](../.kiro/specs/sprint1-pocket-room/design.md)
- [需求文档](../.kiro/specs/sprint1-pocket-room/requirements.md)

---

**文档版本**：1.0  
**最后更新**：2024-01-XX  
**维护者**：Pocket Room 开发团队

