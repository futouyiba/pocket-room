# Pocket Room 开发者文档

## 概述

本文档面向 Pocket Room 的开发者，提供 API 文档、数据库 Schema、RLS 策略和测试指南。

## 目录

1. [架构概览](#架构概览)
2. [API 文档](#api-文档)
3. [数据库 Schema](#数据库-schema)
4. [RLS 策略](#rls-策略)
5. [测试指南](#测试指南)
6. [开发工作流](#开发工作流)

## 架构概览

### 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind CSS
- **后端**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **测试**: Vitest + fast-check + Playwright
- **浏览器扩展**: Vite + Manifest V3

### 模块划分

```
apps/web/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API Routes (Edge Functions)
│   ├── rooms/             # Room 相关页面
│   ├── basket/            # Basket 页面
│   └── settings/          # 设置页面
├── components/            # React 组件
│   ├── companion/         # Companion 组件
│   ├── rooms/             # Room 组件
│   ├── segments/          # Segment 组件
│   └── ui/                # UI 基础组件
├── lib/                   # 工具库
│   ├── supabase/          # Supabase 客户端
│   ├── provider-binding/  # Provider Binding 逻辑
│   ├── errors/            # 错误处理
│   └── utils/             # 工具函数
└── tests/                 # 测试文件
```

## API 文档

### 认证 API

#### POST /api/auth/login
登录用户

**请求体:**
```json
{
  "provider": "google" | "email" | "feishu" | "wechat",
  "email": "user@example.com" // 仅 email provider 需要
}
```

**响应:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

### Room API

#### POST /api/rooms/create
创建新 Room

**请求体:**
```json
{
  "name": "Room 名称",
  "description": "Room 描述",
  "join_strategy": "approval" | "free" | "passcode",
  "passcode": "密码", // 仅 passcode 策略需要
  "invitees": ["user-id-1", "user-id-2"],
  "invitation_segment_id": "segment-uuid" // 可选
}
```

**响应:**
```json
{
  "room_id": "uuid",
  "invitations": [
    {
      "id": "uuid",
      "invitee_id": "user-id",
      "status": "pending"
    }
  ]
}
```

#### POST /api/rooms/join
加入 Room

**请求体:**
```json
{
  "room_id": "uuid",
  "passcode": "密码" // 仅密码模式需要
}
```

**响应:**
```json
{
  "success": true,
  "requires_approval": false // 申请审批模式为 true
}
```

#### POST /api/rooms/handle-join-request
处理加入申请

**请求体:**
```json
{
  "request_id": "uuid",
  "action": "approve" | "reject" | "block" | "silence",
  "silence_duration": 24 // 仅 silence 需要，单位：小时
}
```

**响应:**
```json
{
  "success": true
}
```

#### POST /api/rooms/leave
退出 Room

**请求体:**
```json
{
  "room_id": "uuid",
  "keep_history": true | false
}
```

**响应:**
```json
{
  "success": true
}
```

### 消息 API

#### POST /api/messages/send
发送消息

**请求体:**
```json
{
  "room_id": "uuid",
  "content": "消息内容（Markdown）",
  "attachments": ["image-url-1", "image-url-2"], // 可选
  "message_type": "text" | "segment_share" | "system",
  "shared_segment_id": "segment-uuid" // 仅 segment_share 需要
}
```

**响应:**
```json
{
  "message_id": "uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### DELETE /api/messages/delete
删除消息

**请求体:**
```json
{
  "message_id": "uuid"
}
```

**响应:**
```json
{
  "success": true
}
```

### Segment API

#### POST /api/segments/create
创建 Segment

**请求体:**
```json
{
  "name": "Segment 名称",
  "description": "Segment 描述",
  "room_id": "uuid",
  "message_ids": ["msg-id-1", "msg-id-2"],
  "is_draft": true | false,
  "source_url": "https://example.com" // 可选，浏览器扩展使用
}
```

**响应:**
```json
{
  "segment_id": "uuid"
}
```

#### POST /api/segments/share
分享 Segment

**请求体:**
```json
{
  "segment_id": "uuid",
  "target_type": "room" | "dm",
  "target_id": "room-id 或 user-id"
}
```

**响应:**
```json
{
  "success": true,
  "message_id": "uuid" // 仅 room 类型返回
}
```

#### PATCH /api/segments/update
更新 Segment

**请求体:**
```json
{
  "segment_id": "uuid",
  "name": "新名称",
  "description": "新描述",
  "is_draft": false
}
```

**响应:**
```json
{
  "success": true
}
```

### Companion API

#### POST /api/companion/register
注册 Companion

**请求体:**
```json
{
  "name": "Companion 名称",
  "provider_connection_id": "uuid",
  "model": "gpt-4",
  "system_prompt": "你是一个...",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**响应:**
```json
{
  "companion_id": "uuid"
}
```

#### POST /api/companion/summon
召唤 Companion

**请求体:**
```json
{
  "room_id": "uuid",
  "companion_id": "uuid"
}
```

**响应:**
```json
{
  "invocation_id": "uuid",
  "status": "summoned"
}
```

#### POST /api/companion/request
请求 Companion 回应

**请求体:**
```json
{
  "room_id": "uuid",
  "companion_id": "uuid"
}
```

**响应:**
```json
{
  "invocation_id": "uuid",
  "status": "pending_approval"
}
```

#### POST /api/companion/approve
批准 Companion 请求

**请求体:**
```json
{
  "invocation_id": "uuid",
  "approval_type": "once" | "whitelist"
}
```

**响应:**
```json
{
  "success": true
}
```

#### POST /api/companion/set-context
设置 Companion 上下文

**请求体:**
```json
{
  "invocation_id": "uuid",
  "context_segment_id": "segment-uuid",
  "visibility": "public" | "private"
}
```

**响应:**
```json
{
  "success": true
}
```

#### POST /api/companion/execute-response
执行 Companion 响应

**请求体:**
```json
{
  "invocation_id": "uuid"
}
```

**响应:**
```json
{
  "message_id": "uuid",
  "tokens_used": 1234
}
```

### Provider Binding API

#### POST /api/provider-binding/start
开始 OAuth 流程

**请求体:**
```json
{
  "provider": "openai" | "google"
}
```

**响应:**
```json
{
  "auth_url": "https://provider.com/oauth/authorize?...",
  "state": "random-state-string"
}
```

#### GET /api/provider-binding/callback/:provider
OAuth 回调处理

**查询参数:**
- `code`: Authorization code
- `state`: State 参数

**响应:**
重定向到 Settings 页面

#### POST /api/provider-binding/revoke
撤销 Provider 连接

**请求体:**
```json
{
  "connection_id": "uuid"
}
```

**响应:**
```json
{
  "success": true
}
```

## 数据库 Schema

### 核心表

#### users
由 Supabase Auth 管理

```sql
-- auth.users 扩展字段
user_metadata: {
  display_name: string,
  avatar_url: string
}
```

#### rooms
```sql
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  join_strategy TEXT CHECK (join_strategy IN ('approval', 'free', 'passcode')) DEFAULT 'approval',
  passcode_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'archived')) DEFAULT 'pending',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### room_members
```sql
CREATE TABLE public.room_members (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at TIMESTAMPTZ,
  keep_history BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (room_id, user_id)
);
```

#### messages
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'segment_share', 'system')) DEFAULT 'text',
  shared_segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### segments
```sql
CREATE TABLE public.segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  is_shared_to_room BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### ai_companions
```sql
CREATE TABLE public.ai_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE CASCADE NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT,
  temperature FLOAT DEFAULT 0.7,
  max_tokens INT DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

完整 Schema 请参考 `docs/db.sql`

## RLS 策略

### rooms 表

```sql
-- 所有已登录用户可以查看已建立的 Room
CREATE POLICY "Anyone can view active rooms"
  ON public.rooms FOR SELECT
  USING (status = 'active');

-- Room Owner 可以管理自己的 Room
CREATE POLICY "Owners manage their rooms"
  ON public.rooms FOR ALL
  USING (owner_id = auth.uid());
```

### messages 表

```sql
-- Room Member 可以查看自己加入后的消息
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

-- Room Member 可以发送消息
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

完整 RLS 策略请参考 `docs/rls-policies.sql`

## 测试指南

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行特定测试文件
npm run test -- tests/room-creation-properties.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e
```

### 编写属性测试

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Property: Room 创建输入验证', () => {
  it('should validate room creation input', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          invitees: fc.array(fc.uuid(), { minLength: 1 }),
          join_strategy: fc.constantFrom('approval', 'free', 'passcode'),
        }),
        (input) => {
          // 测试逻辑
          expect(validateRoomInput(input)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 编写单元测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom } from '@/lib/rooms';

describe('Room Creation', () => {
  beforeEach(() => {
    // 设置测试环境
  });

  it('should create room with valid input', async () => {
    const input = {
      name: 'Test Room',
      invitees: ['user-id-1'],
      join_strategy: 'approval',
    };

    const result = await createRoom(input);

    expect(result.room_id).toBeDefined();
    expect(result.invitations).toHaveLength(1);
  });
});
```

## 开发工作流

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 代码规范

```bash
# 运行 ESLint
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/your-feature

# 提交代码
git add .
git commit -m "feat: add new feature"

# 推送到远程
git push origin feature/your-feature

# 创建 Pull Request
```

### 提交消息规范

遵循 Conventional Commits：

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

## 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Vitest 文档](https://vitest.dev/)
- [fast-check 文档](https://fast-check.dev/)
- [shadcn/ui 文档](https://ui.shadcn.com/)

## 获取帮助

- GitHub Issues: https://github.com/your-org/pocket-room/issues
- 开发者邮箱: dev@your-domain.com
