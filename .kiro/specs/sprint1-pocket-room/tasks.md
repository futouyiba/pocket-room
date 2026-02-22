# 实施计划：Pocket Room Sprint 1

## 概述

本实施计划将 Pocket Room Sprint 1 的设计转换为可执行的编码任务。实施顺序遵循依赖关系，确保每个任务都能在前序任务完成的基础上进行。所有任务都包含对应的需求引用，以确保可追溯性。

## 技术栈

- **前端**：Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind CSS
- **后端**：Supabase (PostgreSQL + Realtime + Auth + Storage)
- **测试**：Vitest + fast-check (属性测试) + Playwright (E2E)
- **浏览器扩展**：Vite + Manifest V3

## 任务列表

### 1. 基础设施与数据库设置

- [x] 1.1 配置 Supabase 项目并更新数据库 schema
  - 基于设计文档中的数据模型更新 `docs/db.sql`
  - 新增表：`invitations`, `room_blacklist`, `provider_connections`, `companion_whitelist`
  - 修改表：`rooms`, `room_members`, `join_requests`, `messages`, `segments`, `ai_companions`, `ai_invocations`
  - 执行数据库迁移脚本
  - _需求：全部需求的数据基础_

- [x] 1.2 配置 Row Level Security (RLS) 策略
  - 为所有表启用 RLS
  - 实现设计文档中定义的 RLS 策略（rooms, messages, room_members, join_requests, segments, ai_companions, provider_connections, ai_invocations）
  - _需求：17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 1.3 编写 RLS 策略的属性测试
  - **属性 43：RLS 强制表级隔离**
  - **属性 44：消息 RLS 成员检查**
  - **属性 45：资源所有权 RLS**
  - **属性 46：Invocation RLS 成员检查**
  - **验证需求：17.1, 17.2, 17.3, 17.4, 17.5**

- [x] 1.4 配置环境变量和项目结构
  - 创建 `.env.local` 文件（基于 `.env.example`）
  - 配置 Supabase 连接信息
  - 配置 OAuth Provider 客户端 ID 和密钥（OpenAI, Google, Feishu, WeChat）
  - _需求：1.1, 1.2, 1.3, 1.4, 2.1_


### 2. 门禁认证（Gate Auth）

- [x] 2.1 实现 Supabase Auth 集成
  - 配置 Supabase Auth 客户端
  - 实现 Google OAuth 登录
  - 实现 Email OTP 登录
  - 实现飞书 OAuth 登录
  - 实现微信登录
  - _需求：1.1, 1.2, 1.3, 1.4_

- [x] 2.2 实现登录页面 UI (`/login`)
  - 创建登录页面组件
  - 展示多种登录方式的按钮
  - 处理 OAuth 回调
  - 实现错误提示和重试机制
  - _需求：1.1, 1.2, 1.3, 1.4, 1.8_

- [x] 2.3 实现认证状态管理和路由保护
  - 创建认证上下文（AuthContext）
  - 实现会话持久化（跨设备云端存储）
  - 实现未登录用户重定向到登录页面
  - 登录成功后重定向到 Room List
  - _需求：1.5, 1.6, 1.7_

- [x] 2.4 编写 Gate Auth 的属性测试
  - **属性 1：认证状态一致性**
  - **属性 2：会话持久化**
  - **验证需求：1.5, 1.6, 1.7**

- [x] 2.5 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

### 3. AI 服务商绑定（Provider Binding）

- [x] 3.1 实现 OAuth 2.0 + PKCE 核心逻辑
  - 创建 `AuthProvider` 接口和实现
  - 实现 PKCE code_verifier 和 code_challenge (S256) 生成
  - 实现 state 参数生成和验证
  - 实现授权 URL 构建
  - _需求：2.1, 2.2_

- [x] 3.2 实现 Token 安全存储和管理
  - 实现 Token 加密存储（使用应用层加密）
  - 创建 `provider_connections` 表的 CRUD 操作
  - 确保 Token 不以明文记录到日志
  - _需求：2.3_

- [x] 3.3 实现 Token 自动刷新机制
  - 检测 Token 即将过期（距离过期时间 < 2 分钟）
  - 使用 refresh_token 自动刷新
  - 处理刷新失败的情况（通知用户重新授权）
  - _需求：2.4, 2.5_

- [x] 3.4 实现 HTTP 请求层自动注入认证
  - 创建统一的 HTTP 客户端（`getClient`）
  - 自动在请求中注入 `Authorization: Bearer <token>` header
  - 业务层无需感知 Token 细节
  - _需求：2.7_

- [x] 3.5 实现 Provider 适配层
  - 创建 OpenAI Provider 适配器
  - 创建 Google Provider 适配器
  - 封装服务商差异，提供统一接口
  - _需求：2.8_

- [x] 3.6 实现 Provider Binding UI
  - 创建 Provider 绑定页面（在 Settings 中）
  - 展示已绑定的 Provider 列表
  - 实现"绑定新 Provider"按钮和流程
  - 实现"撤销连接"功能
  - _需求：2.1, 2.6, 2.9_

- [x] 3.7 编写 Provider Binding 的属性测试
  - **属性 3：OAuth PKCE 完整性**
  - **属性 4：Token 安全存储**
  - **属性 5：Token 自动刷新**
  - **属性 6：HTTP 请求自动注入认证**
  - **属性 7：多 Provider 绑定**
  - **验证需求：2.2, 2.3, 2.4, 2.7, 2.9**

- [x] 3.8 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户


### 4. Room 创建与邀请确认

- [x] 4.1 实现 Room 创建表单和验证
  - 创建 Room 创建表单 UI
  - 实现输入验证：至少邀请一人、选择加入策略、密码策略需要密码
  - 实现密码 hash 生成（bcrypt）
  - _需求：3.1, 3.2, 3.3_

- [x] 4.2 实现 Room 创建 Edge Function (`create-room`)
  - 创建 Room 记录（状态：pending）
  - 创建 Invitation 记录
  - 发送邀请通知给被邀请人
  - _需求：3.1, 3.2, 3.3_

- [x] 4.3 实现邀请确认流程
  - 创建邀请确认页面 UI
  - 实现 `confirm-invitation` Edge Function
  - 接受邀请：将创建者和被邀请人设为 Room Member，Room 状态改为 active
  - 拒绝邀请：通知创建者，取消 Room 创建
  - _需求：3.5, 3.7_

- [x] 4.4 实现邀请时 Segment 分享
  - 在邀请流程中添加"选择消息创建 Segment"选项
  - 将 Segment 与邀请关联（`invitation_segment_id`）
  - 被邀请人确认后展示邀请 Segment
  - _需求：10.1, 10.2, 10.3, 10.4_

- [x] 4.5 编写 Room 创建的属性测试
  - **属性 8：Room 创建输入验证**
  - **属性 9：Pending Room 不可见**
  - **属性 10：邀请确认创建成员**
  - **属性 11：邀请永久有效**
  - **属性 12：邀请拒绝取消 Room**
  - **属性 27：邀请 Segment 关联**
  - **验证需求：3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.2, 10.4**

- [x] 4.6 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

### 5. Room 列表与加入策略

- [x] 5.1 实现 Room 列表页面 (`/rooms`)
  - 展示所有 active 状态的 Room
  - 显示 Room 名称、描述、活跃人数
  - 密码 Room 仅显示名称和锁图标，隐藏描述
  - 实时更新活跃人数（Supabase Realtime）
  - _需求：4.1, 4.2, 4.3, 4.4_

- [x] 5.2 实现申请审批加入策略
  - 创建 `join-room` Edge Function（处理申请审批模式）
  - 创建 Join Request 记录
  - 向 Room Owner 发送实时审批提醒
  - 记录到 Join Request Queue
  - _需求：5.1_

- [x] 5.3 实现加入申请审批 UI
  - 创建加入申请队列展示组件（JoinRequestItem）
  - 实现审批操作：批准、拒绝、封禁、静默
  - 实现 `handle-join-request` Edge Function
  - 批准：添加为 Room Member，通知申请者
  - 拒绝：通知申请者
  - 封禁：添加到黑名单，阻止重复申请
  - 静默：设置冷却期，阻止重新申请
  - _需求：5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5.4 实现离线审批队列
  - Join Request Queue 持久化存储
  - Room Owner 上线后展示待处理申请
  - _需求：5.7_

- [x] 5.5 实现自由加入策略
  - 在 `join-room` Edge Function 中处理自由加入模式
  - 立即将用户设为 Room Member，无需审批
  - _需求：6.1, 6.2_

- [x] 5.6 实现密码加入策略
  - 在 `join-room` Edge Function 中处理密码加入模式
  - 验证用户输入的密码（bcrypt 比对）
  - 密码正确：添加为 Room Member
  - 密码错误：显示错误提示，允许重新输入
  - _需求：7.1, 7.2, 7.3_

- [x] 5.7 实现被邀请人加入特权
  - 被邀请人加入时跳过所有验证（审批、密码）
  - 直接创建 Room Member 记录
  - _需求：5.8, 7.4_

- [x] 5.8 编写 Room 加入策略的属性测试
  - **属性 13：Active Room 全局可见**
  - **属性 14：密码 Room 信息隐藏**
  - **属性 15：加入申请创建记录**
  - **属性 16：批准申请创建成员**
  - **属性 17：封禁阻止重复申请**
  - **属性 18：静默冷却期限制**
  - **属性 19：被邀请人加入特权**
  - **属性 20：自由加入立即成员**
  - **属性 21：密码验证加入**
  - **验证需求：4.1, 4.3, 5.1, 5.3, 5.5, 5.6, 5.8, 6.1, 7.2, 7.3, 7.4**

- [x] 5.9 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户


### 6. 实时消息系统

- [x] 6.1 实现消息发送功能
  - 创建 `send-message` Edge Function
  - 检查用户是否为 Room Member
  - 插入 Message 记录到数据库
  - Supabase Realtime 自动推送消息
  - _需求：8.1_

- [x] 6.2 实现 Room 页面和消息 Timeline (`/rooms/[id]`)
  - 创建 Room 页面组件
  - 展示消息 Timeline（按时间排序）
  - 实现 Supabase Realtime 订阅（实时接收新消息）
  - 实现连接状态指示器
  - 处理连接断开和重连
  - _需求：8.1, 8.6_

- [x] 6.3 实现 Markdown 渲染和代码高亮
  - 集成 react-markdown + remark-gfm
  - 集成 Prism.js 进行代码块语法高亮
  - 创建 MessageItem 组件
  - 支持 Markdown 语法（标题、列表、链接、强调等）
  - 支持代码块语法高亮（JavaScript、Python、SQL 等）
  - _需求：8.2, 8.3_

- [x] 6.4 实现图片上传和显示
  - 集成 Supabase Storage
  - 实现图片上传功能
  - 在消息中内联显示图片
  - 存储图片 URL 到 `messages.attachments` 字段
  - _需求：8.4_

- [x] 6.5 实现消息删除和 Tombstone
  - 创建 `delete-message` Edge Function
  - 检查权限（仅消息发送者或 Room Owner）
  - 设置 `is_deleted = true` 和 `deleted_at`
  - 在 Timeline 中显示 Tombstone 占位符
  - _需求：8.5_

- [x] 6.6 实现成员 Timeline 持久化
  - 为每个 Room Member 持久化保存消息记录（从 `joined_at` 开始）
  - 跨设备云端同步
  - _需求：9.1_

- [x] 6.7 实现后加入成员消息可见性规则
  - 在消息查询中添加 `created_at >= joined_at` 过滤
  - RLS 策略确保后加入成员无法访问加入前消息
  - _需求：9.2, 9.3_

- [x] 6.8 编写消息系统的属性测试
  - **属性 22：Markdown 渲染完整性**
  - **属性 23：代码块语法高亮**
  - **属性 24：消息删除 Tombstone**
  - **属性 25：消息持久化**
  - **属性 26：后加入成员消息可见性**
  - **验证需求：8.2, 8.3, 8.5, 9.1, 9.2, 9.3**

- [x] 6.9 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

### 7. Room 成员管理

- [-] 7.1 实现成员列表展示
  - 在 Room 页面中展示成员列表
  - 显示成员头像、名称、在线状态
  - _需求：4.2_

- [~] 7.2 实现退出 Room 功能
  - 创建"退出 Room"按钮
  - 显示确认对话框（保留历史 / 删除历史）
  - 实现退出逻辑：设置 `left_at` 和 `keep_history`
  - _需求：11.1, 11.2, 11.3_

- [~] 7.3 实现退出后的历史访问控制
  - 保留历史：消息历史保持可访问
  - 删除历史：消息历史标记为不可访问
  - _需求：11.4, 11.5_

- [~] 7.4 编写成员管理的属性测试
  - **属性 28：退出保留历史**
  - **属性 29：退出删除历史**
  - **验证需求：11.4, 11.5**

### 8. Segment 摘取与分享

- [~] 8.1 实现 Segment 创建功能
  - 在 Room 页面中实现消息选择 UI
  - 创建 `create-segment` Edge Function
  - 创建 Segment 记录和 Segment_Messages 关联记录
  - 保留消息的原始顺序（`message_order`）
  - 验证所有消息来自同一 Room
  - _需求：12.1, 12.2, 12.3_

- [~] 8.2 实现 Segment 分享到 Room
  - 创建 `share-segment` Edge Function
  - 创建 `message_type = 'segment_share'` 的消息
  - 包含 `shared_segment_id` 引用
  - 创建 SegmentPreview 组件展示预览和链接
  - _需求：12.4_

- [~] 8.3 实现 Segment 私信分享
  - 在 `share-segment` Edge Function 中处理私信分享
  - 创建 DM 记录（Sprint 1 简化实现）
  - _需求：12.5_

- [~] 8.4 实现 Segment 元数据管理
  - 确保 Segment 包含 `created_by`、`room_id`、`created_at` 字段
  - 展示 Segment 元数据（创建者、来源 Room、创建时间）
  - _需求：12.6_

- [~] 8.5 实现 Basket（收集篮）
  - 创建 Basket 页面 (`/basket`)
  - 展示草稿 Segment 列表（`is_draft = true`）
  - 实现 Segment 整理和编辑功能
  - 实现从 Basket 分享到 Room 或私信
  - _需求：12.1_

- [~] 8.6 编写 Segment 的属性测试
  - **属性 30：Segment 创建保序**
  - **属性 31：Segment 单 Room 限制**
  - **属性 32：Segment 分享创建消息**
  - **属性 33：Segment 元数据完整性**
  - **验证需求：12.1, 12.2, 12.3, 12.4, 12.6**

- [~] 8.7 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户


### 9. Companion 注册与管理

- [~] 9.1 实现 Companion 注册功能
  - 创建 Companion 注册表单 UI（在 Settings 中）
  - 输入：名称、关联的 Provider Connection、模型选择、System Prompt
  - 实现 Companion 创建逻辑
  - 验证 `provider_connection_id` 有效性
  - _需求：13.1, 13.2_

- [~] 9.2 实现 Companion 配置管理
  - 展示用户的 Companion 列表
  - 实现 Companion 编辑功能（名称、模型、System Prompt、temperature、max_tokens）
  - 实现 Companion 删除功能
  - _需求：13.3, 13.5_

- [~] 9.3 实现 Companion System Prompt 配置
  - 创建 System Prompt 编辑器
  - 支持多行文本输入
  - 提供 System Prompt 模板示例
  - _需求：13.4_

- [~] 9.4 编写 Companion 注册的属性测试
  - **属性 34：多 Companion 注册**
  - **属性 35：Companion 需要有效连接**
  - **验证需求：13.1, 13.2**

### 10. Companion 治理生命周期

- [~] 10.1 实现 Companion 召唤（Summon）
  - 在 Room 页面中添加"召唤 Companion"按钮
  - 创建 `summon-companion` Edge Function
  - 创建 `ai_invocation` 记录（status = 'summoned'）
  - 显示灰色 Companion 图标（待命状态）
  - 不触发 API 调用，不消耗 token
  - _需求：14.1_

- [~] 10.2 实现 Companion 请求（Request）
  - 在 Room 页面中添加"请求 Companion 回应"按钮
  - 创建 `request-companion` Edge Function
  - 更新 `ai_invocation` 状态为 'pending_approval'
  - 向 Companion Owner 发送审批请求通知
  - 显示"等待 [Owner] 的批准"
  - 不触发 API 调用
  - _需求：14.2, 14.3_

- [~] 10.3 实现 Companion 批准（Approve）
  - 创建审批请求 UI（通知或队列）
  - 提供两个选项："批准一次"和"始终允许该成员"
  - 创建 `approve-companion-request` Edge Function
  - 更新 `ai_invocation` 状态为 'processing'
  - 如果选择"始终允许"，添加到 `companion_whitelist`
  - 更新 Companion 图标为明亮状态
  - _需求：14.4, 14.6_

- [~] 10.4 实现 Companion 上下文选择
  - 在批准后请求 Owner 显式选择上下文
  - 提供消息选择 UI 或 Segment 选择 UI
  - 将选择的上下文关联到 `ai_invocation.context_segment_id`
  - 阻止自动访问完整 Timeline
  - _需求：15.1, 15.2_

- [~] 10.5 实现 Companion 响应（Respond）
  - 创建 `execute-companion-response` Edge Function
  - 获取 Companion 配置（model, system_prompt, temperature, max_tokens）
  - 获取上下文内容（从 context_segment_id）
  - 通过 Provider Binding 调用 AI API（自动注入 token）
  - 创建包含响应的 Message 记录
  - 更新 `ai_invocation` 状态为 'completed'
  - 记录 `tokens_used`
  - _需求：14.5_

- [~] 10.6 实现 Companion 响应可见性控制
  - 在上下文选择时询问 Owner：公开到 Room 或仅私信给自己
  - 如果 `visibility = 'private'`，消息仅对 Owner 可见
  - 如果 `visibility = 'public'`，消息对所有 Room Member 可见
  - _需求：15.3_

- [~] 10.7 实现 Companion 审批豁免
  - Owner 触发自己的 Companion：跳过审批，直接执行
  - 白名单成员触发 Companion：跳过审批，直接执行
  - 检查 `companion_whitelist` 表
  - _需求：14.7, 14.8_

- [~] 10.8 实现 Companion API 调用错误处理
  - 捕获 API 调用失败
  - 更新 `ai_invocation` 状态为 'failed'
  - 记录 `error_message`
  - 向触发者和 Owner 显示错误信息
  - _需求：14.9_

- [~] 10.9 编写 Companion 治理的属性测试
  - **属性 36：Companion 召唤创建 Invocation**
  - **属性 37：Companion 请求等待审批**
  - **属性 38：Companion 批准触发响应**
  - **属性 39：Companion 审批豁免**
  - **属性 40：Companion 上下文显式选择**
  - **属性 41：Companion 响应可见性控制**
  - **验证需求：14.1, 14.2, 14.3, 14.5, 14.7, 14.8, 15.2, 15.3**

- [~] 10.10 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户


### 11. 浏览器扩展内容捕获

- [~] 11.1 设置浏览器扩展项目结构
  - 配置 Vite + Manifest V3
  - 创建 content script、background service worker、popup
  - 配置权限（activeTab, storage）
  - _需求：16.1_

- [~] 11.2 实现网页内容选择和捕获
  - 在 content script 中监听文本选择事件
  - 显示"发送到 Pocket Room"按钮
  - 捕获选中文本和来源 URL
  - _需求：16.1, 16.3_

- [~] 11.3 实现与 Web App 的通信
  - 检查用户登录状态
  - 如果未登录，提示用户先登录
  - 发送捕获内容到 Web App
  - _需求：16.4_

- [~] 11.4 实现草稿 Segment 创建
  - 在 Web App 的 Basket 中创建草稿 Segment
  - 设置 `is_draft = true`
  - 记录 `source_url`
  - 显示成功确认提示
  - _需求：16.2, 16.5_

- [~] 11.5 编写浏览器扩展的属性测试
  - **属性 42：浏览器扩展创建草稿 Segment**
  - **验证需求：16.2**

### 12. UI 组件与样式

- [~] 12.1 实现核心 UI 组件
  - MessageItem 组件（Markdown 渲染、代码高亮、图片显示、Tombstone）
  - CompanionCard 组件（显示 Companion 状态，灰色/明亮图标）
  - JoinRequestItem 组件（审批操作按钮）
  - SegmentPreview 组件（Segment 预览和链接）
  - _需求：8.2, 8.3, 8.4, 8.5, 14.1, 14.6_

- [~] 12.2 实现页面布局和导航
  - 创建主布局组件（Header、Sidebar、Content）
  - 实现导航菜单（Room List、Basket、Settings）
  - 实现响应式设计（移动端适配）
  - _需求：全部需求的 UI 基础_

- [~] 12.3 实现 shadcn/ui 组件集成
  - 安装和配置 shadcn/ui
  - 集成常用组件（Button、Input、Dialog、Dropdown、Toast）
  - 配置 Tailwind CSS 主题
  - _需求：全部需求的 UI 基础_

- [~] 12.4 实现实时状态指示器
  - 连接状态指示器（Realtime 连接/断开）
  - 在线状态指示器（成员在线/离线）
  - 加载状态指示器（API 调用中）
  - _需求：8.6_

### 13. 错误处理与用户体验

- [~] 13.1 实现统一的错误处理机制
  - 创建 ErrorResponse 接口
  - 实现错误代码和消息映射
  - 实现错误日志记录（不记录敏感信息）
  - _需求：1.8, 2.5, 14.9_

- [~] 13.2 实现用户友好的错误提示
  - 认证错误：显示重试选项，自动重定向
  - 业务逻辑错误：显示明确的错误消息和操作建议
  - 网络错误：显示连接状态，自动重连
  - 验证错误：显示具体的字段错误信息
  - _需求：1.8, 8.6_

- [~] 13.3 实现降级策略
  - Realtime 不可用时降级为轮询模式（每 5 秒查询一次）
  - 图片上传失败时允许纯文本消息发送
  - Markdown 渲染失败时显示原始文本
  - _需求：8.6_

- [~] 13.4 实现自动重试机制
  - Token 刷新失败：最多重试 3 次，指数退避
  - Realtime 连接断开：自动重连，最多 10 次
  - _需求：2.4, 8.6_

### 14. 测试与质量保证

- [~] 14.1 配置测试框架
  - 配置 Vitest 用于单元测试
  - 配置 fast-check 用于属性测试
  - 配置 Playwright 用于 E2E 测试
  - 配置 Supabase Test Helpers
  - _需求：全部需求的测试基础_

- [~] 14.2 编写单元测试
  - 认证模块单元测试（OAuth 流程、Session 管理）
  - Provider Binding 单元测试（PKCE、Token 管理）
  - Room 模块单元测试（创建、加入、审批）
  - 消息模块单元测试（发送、删除、Markdown 渲染）
  - Segment 模块单元测试（创建、分享、验证）
  - Companion 模块单元测试（注册、召唤、请求、批准、响应）
  - _需求：全部需求的单元测试覆盖_

- [~] 14.3 编写所有属性测试（已在各模块中标记）
  - 确保所有 46 个属性都有对应的属性测试
  - 每个属性测试至少运行 100 次迭代
  - 使用 fast-check 的 arbitrary 生成器
  - 使用注释标记对应的设计属性和需求
  - _需求：全部需求的属性测试覆盖_

- [~] 14.4 编写 E2E 测试
  - 用户登录流程 E2E 测试
  - Room 创建和加入流程 E2E 测试
  - 消息发送和接收流程 E2E 测试
  - Companion 调用流程 E2E 测试
  - Segment 创建和分享流程 E2E 测试
  - _需求：全部需求的 E2E 测试覆盖_

- [~] 14.5 编写 RLS 策略集成测试
  - 使用 Supabase Test Database
  - 测试所有表的 RLS 策略
  - 测试未授权访问尝试
  - 测试跨用户资源访问尝试
  - _需求：17.1, 17.2, 17.3, 17.4, 17.5_

- [~] 14.6 最终检查点 - 确保所有测试通过
  - 运行所有单元测试
  - 运行所有属性测试（100 次迭代）
  - 运行所有 E2E 测试
  - 运行所有集成测试
  - 生成测试覆盖率报告（目标：≥ 80%）
  - 确保所有测试通过，如有问题请询问用户

### 15. 部署与文档

- [~] 15.1 配置生产环境
  - 配置 Vercel 部署（Web App）
  - 配置 Supabase 生产数据库
  - 配置环境变量（生产环境）
  - 配置 OAuth Provider 生产回调 URL
  - _需求：全部需求的生产环境基础_

- [~] 15.2 准备浏览器扩展发布
  - 构建浏览器扩展生产版本
  - 准备 Chrome Web Store 发布材料（图标、截图、描述）
  - 提交到 Chrome Web Store 审核
  - _需求：16.1, 16.2, 16.3, 16.4, 16.5_

- [~] 15.3 编写用户文档
  - 用户使用指南（登录、创建 Room、发送消息、使用 Companion）
  - Companion 配置指南（绑定 Provider、注册 Companion、设置 System Prompt）
  - 浏览器扩展使用指南
  - 常见问题解答（FAQ）

- [~] 15.4 编写开发者文档
  - API 文档（Edge Functions 接口）
  - 数据库 Schema 文档
  - RLS 策略文档
  - 测试指南（如何运行测试、如何编写新测试）

## 注意事项

1. **任务标记说明**：
   - `[ ]` - 必须实现的核心任务
   - `[ ]*` - 可选任务（测试、文档等），可以跳过以加快 MVP 交付

2. **属性测试要求**：
   - 每个属性测试必须运行至少 100 次迭代（`numRuns: 100`）
   - 使用注释标记对应的设计属性编号和需求编号
   - 使用 fast-check 的 arbitrary 生成器创建测试数据

3. **检查点说明**：
   - 检查点任务用于确保阶段性验证
   - 在检查点处，确保所有测试通过
   - 如有问题，询问用户后再继续

4. **需求追溯**：
   - 每个任务都标记了对应的需求编号（_需求：X.Y_）
   - 确保所有 17 个需求都被任务覆盖
   - 确保所有 46 个属性都有对应的属性测试

5. **实施顺序**：
   - 任务按依赖关系排序，建议按顺序执行
   - 可以并行执行无依赖关系的任务（如 UI 组件和后端逻辑）

6. **代码质量**：
   - 遵循 TypeScript 最佳实践
   - 使用 ESLint 和 Prettier 保持代码风格一致
   - 编写清晰的注释和文档字符串
   - 确保无障碍性（Accessibility）合规

## 完成标准

Sprint 1 完成的标准：

1. ✅ 所有核心任务（非 `*` 标记）已实现
2. ✅ 所有 17 个需求的验收标准已满足
3. ✅ 所有 46 个属性都有对应的属性测试
4. ✅ 所有测试通过（单元测试、属性测试、E2E 测试）
5. ✅ 测试覆盖率 ≥ 80%
6. ✅ Web App 已部署到 Vercel
7. ✅ 浏览器扩展已提交到 Chrome Web Store
8. ✅ 所有 RLS 策略已配置并测试通过

---

**文档版本**：1.0  
**创建日期**：2024-01-XX  
**对应设计文档**：`.kiro/specs/sprint1-pocket-room/design.md`  
**对应需求文档**：`.kiro/specs/sprint1-pocket-room/requirements.md`
