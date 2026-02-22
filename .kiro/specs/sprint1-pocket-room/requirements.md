# 需求文档

## 简介

Pocket Room Sprint 1 的完整功能需求。Pocket Room 是一个共享思考、记忆与协作的空间，由 Room（实时讨论）和 Pocket（上下文沉淀）两部分组成。Sprint 1 交付范围包括：门禁认证（Gate Auth）、AI 服务商绑定（Provider Binding）、Room 创建与加入、实时消息、Segment 摘取与分享、Companion（随从）集成、以及浏览器扩展 MVP。

## 术语表

- **Web_App**: 基于 Next.js 14 的 Pocket Room Web 应用程序
- **Gate_Auth (门禁)**: 基于 Supabase 的用户登录认证系统，支持 Google OAuth、Email OTP、飞书（Feishu）和微信（WeChat）登录
- **Provider_Binding (绑定)**: OAuth 2.0 授权系统，用于绑定外部 AI 服务商账户（如 OpenAI/ChatGPT、Google/Gemini 等），采用 PKCE + state 校验，管理 token 全生命周期（存储、刷新、撤销）
- **Companion (随从)**: 用户的个人 AI 助手，通过 Provider_Binding 绑定外部 AI 服务商。每个用户可注册多个 Companion，数量不限
- **Companion_Owner (随从主人)**: 拥有并控制 Companion 的用户
- **Summon (召唤)**: 将 Companion 引入 Room 的操作，Companion 进入待命模式（在场但不发言，不消耗 token），视觉表现为灰色图标
- **Request (请求)**: Room 成员请求某个 Companion 进行回应的操作，系统显示"等待 [主人] 的批准"，Companion 保持静默，不消耗 token
- **Approve (批准)**: Companion_Owner 决定是否允许 Companion 发言的操作，选项包括"批准一次"和"始终允许该成员"（加入白名单）
- **Respond (响应)**: Companion 获得批准后执行实际 API 调用并输出内容的阶段，此时消耗 token，内容进入 Room Timeline
- **Whitelist (白名单)**: 针对特定用户的自动批准名单，名单内用户的请求将自动获批，无需 Companion_Owner 手动审批
- **Room**: 实时讨论空间，用户必须加入才能查看消息
- **Room_List**: 展示所有已建立 Room 的列表页面
- **Room_Owner**: 创建 Room 的用户，拥有管理权限
- **Room_Member**: 已加入 Room 的用户，可以发送和查看消息
- **Join_Strategy**: Room 的加入策略，包括申请审批（默认）、自由加入、密码加入三种互斥模式
- **Join_Request_Queue**: 存储加入申请的队列，支持实时提醒和异步处理
- **Message**: Room 中的一条消息，支持 Markdown、代码块和图片
- **Tombstone**: 消息被删除后留下的占位标记
- **Timeline**: Room 中按时间排列的消息流
- **Segment**: 从 Room 对话中摘取的命名消息片段，类似微信的合并转发
- **Basket**: 临时收集区，用于暂存待整理的摘取内容
- **Browser_Extension**: 基于 Manifest V3 的浏览器扩展，用于从网页捕获内容
- **Supabase_Realtime**: Supabase 提供的实时消息推送服务
- **Invitation**: Room 创建时发出的邀请，被邀请人确认后 Room 才正式建立
- **Passcode**: 密码加入模式下，Room 创建者设置的加入密码

## 需求

### 需求 1：门禁认证（Gate Auth）

**用户故事：** 作为用户，我希望通过多种方式登录 Pocket Room，以便安全地访问所有功能。

#### 验收标准

1. THE Gate_Auth SHALL 提供 Google OAuth 登录方式
2. THE Gate_Auth SHALL 提供 Email OTP（一次性验证码）登录方式
3. THE Gate_Auth SHALL 提供飞书（Feishu）OAuth 登录方式
4. THE Gate_Auth SHALL 提供微信（WeChat）登录方式
5. WHEN 用户成功通过任一登录方式验证时，THE Gate_Auth SHALL 创建用户会话并将用户重定向到 Room_List 页面
6. THE Gate_Auth SHALL 在浏览器关闭后保持用户会话有效（跨设备云端持久化）
7. WHEN 未登录用户尝试访问任何受保护页面时，THE Web_App SHALL 将用户重定向到登录页面
8. IF Gate_Auth 与 Supabase 的连接失败，THEN THE Web_App SHALL 显示明确的错误提示并提供重试选项

### 需求 2：AI 服务商绑定（Provider Binding）

**用户故事：** 作为用户，我希望通过 OAuth 授权绑定外部 AI 服务商账户，以便让我的 Companion 调用对应的 AI 服务。

#### 验收标准

1. THE Provider_Binding SHALL 支持通过浏览器 OAuth 2.0 授权流程绑定外部 AI 服务商账户（如 OpenAI/ChatGPT、Google/Gemini）
2. THE Provider_Binding SHALL 在 OAuth 授权流程中使用 PKCE（S256）和 state 参数校验，防止 CSRF 攻击
3. THE Provider_Binding SHALL 安全存储 access_token、refresh_token（若有）、过期时间、scope 和 account_id（若有），不以明文记录到日志
4. WHEN access_token 即将过期时，THE Provider_Binding SHALL 自动使用 refresh_token 刷新 token
5. IF refresh_token 刷新失败，THEN THE Provider_Binding SHALL 通知用户重新进行 OAuth 授权
6. THE Provider_Binding SHALL 允许用户撤销（revoke）已绑定的服务商连接
7. WHEN Companion 发起 AI API 调用时，THE Provider_Binding SHALL 在 HTTP 请求层自动注入 Authorization Bearer token，业务层无需感知 token 细节
8. THE Provider_Binding SHALL 将服务商差异封装在 Provider 适配层，业务层通过统一接口调用，不感知具体服务商特性
9. THE Provider_Binding SHALL 允许每个用户绑定多个不同的 AI 服务商账户

### 需求 3：Room 创建与邀请确认

**用户故事：** 作为用户，我希望创建 Room 并邀请至少一人，以便开始有意义的讨论。

#### 验收标准

1. WHEN 用户提交 Room 创建表单时，THE Web_App SHALL 要求用户邀请至少一名其他用户
2. WHEN 用户提交 Room 创建表单时，THE Web_App SHALL 要求用户选择一种 Join_Strategy（申请审批（默认）、自由加入或密码加入）
3. WHEN 用户选择密码加入策略时，THE Web_App SHALL 要求用户设置一个 Passcode
4. WHILE 被邀请人尚未确认邀请时，THE Room SHALL 对所有用户（包括创建者）保持不可见状态
5. WHEN 被邀请人确认邀请时，THE Web_App SHALL 将创建者和被邀请人同时设为 Room_Member
6. THE Invitation SHALL 无过期时间限制，被邀请人可在任意时间确认
7. IF 被邀请人拒绝邀请，THEN THE Web_App SHALL 通知创建者并取消该 Room 的创建

### 需求 4：Room 列表展示

**用户故事：** 作为已登录用户，我希望浏览所有已建立的 Room，以便发现感兴趣的讨论并加入。

#### 验收标准

1. THE Room_List SHALL 向所有已登录用户展示所有已建立的 Room
2. WHEN Room 的 Join_Strategy 不是密码加入时，THE Room_List SHALL 显示 Room 名称、描述和当前活跃人数
3. WHEN Room 的 Join_Strategy 是密码加入时，THE Room_List SHALL 仅显示锁图标和 Room 名称，隐藏描述信息
4. THE Room_List SHALL 实时更新各 Room 的活跃人数
5. WHEN 未登录用户尝试访问 Room_List 时，THE Web_App SHALL 将用户重定向到登录页面

### 需求 5：Room 加入策略 — 申请审批

**用户故事：** 作为 Room_Owner，我希望通过审批机制控制谁可以加入我的 Room，以便维护讨论质量。

#### 验收标准

1. WHEN 用户对申请审批模式的 Room 提交加入申请时，THE Web_App SHALL 同时执行两个操作：向 Room_Owner 发送实时审批提醒，并将申请记录到 Join_Request_Queue
2. THE Room_Owner SHALL 能够对加入申请执行以下操作之一：批准、拒绝、封禁、或静默（冷却期）
3. WHEN Room_Owner 批准加入申请时，THE Web_App SHALL 将申请者设为 Room_Member 并通知申请者
4. WHEN Room_Owner 拒绝加入申请时，THE Web_App SHALL 通知申请者申请被拒绝
5. WHEN Room_Owner 封禁申请者时，THE Web_App SHALL 阻止该用户再次向该 Room 提交加入申请
6. WHEN Room_Owner 对申请者执行静默操作时，THE Web_App SHALL 在冷却期内阻止该用户重新申请
7. WHILE Room_Owner 离线时，THE Join_Request_Queue SHALL 保留所有待处理的加入申请，待 Room_Owner 上线后展示
8. WHEN 被邀请人加入 Room 时，THE Web_App SHALL 跳过审批流程，直接将被邀请人设为 Room_Member

### 需求 6：Room 加入策略 — 自由加入

**用户故事：** 作为 Room_Owner，我希望创建任何人都可以直接加入的 Room，以便降低参与门槛。

#### 验收标准

1. WHEN 用户对自由加入模式的 Room 点击加入按钮时，THE Web_App SHALL 立即将该用户设为 Room_Member，无需审批
2. WHEN 用户成为 Room_Member 后，THE Web_App SHALL 立即显示 Room 的实时消息流

### 需求 7：Room 加入策略 — 密码加入

**用户故事：** 作为 Room_Owner，我希望通过密码保护 Room 的访问，以便在公开可见的同时限制加入。

#### 验收标准

1. WHEN 用户对密码加入模式的 Room 提交加入请求时，THE Web_App SHALL 要求用户输入 Passcode
2. WHEN 用户输入正确的 Passcode 时，THE Web_App SHALL 将该用户设为 Room_Member
3. IF 用户输入错误的 Passcode，THEN THE Web_App SHALL 显示错误提示并允许重新输入
4. WHEN 被邀请人加入密码加入模式的 Room 时，THE Web_App SHALL 跳过密码验证，直接将被邀请人设为 Room_Member

### 需求 8：实时消息与消息格式

**用户故事：** 作为 Room_Member，我希望在 Room 中实时收发消息，并支持富文本格式，以便进行高效的技术讨论。

#### 验收标准

1. WHEN Room_Member 发送消息时，THE Web_App SHALL 通过 Supabase_Realtime 将消息实时推送给该 Room 的所有在线 Room_Member
2. THE Message SHALL 支持 Markdown 语法渲染
3. THE Message SHALL 支持代码块语法高亮显示
4. THE Message SHALL 支持图片的上传和内联显示
5. WHEN Room_Member 删除一条消息时，THE Web_App SHALL 将该消息替换为 Tombstone 占位标记，保留在 Timeline 中
6. IF Supabase_Realtime 连接中断，THEN THE Web_App SHALL 显示连接状态提示并在连接恢复后自动重新同步消息

### 需求 9：成员 Timeline 持久化与后加入规则

**用户故事：** 作为 Room_Member，我希望我的消息历史被持久化保存，同时后加入的成员不能看到我加入前的讨论。

#### 验收标准

1. THE Web_App SHALL 为每个 Room_Member 持久化保存从加入时间点开始的所有消息记录（云端跨设备可访问）
2. WHEN 新用户加入 Room 时，THE Web_App SHALL 仅展示该用户加入时间点之后的消息
3. THE Web_App SHALL 阻止后加入的 Room_Member 通过任何方式访问加入时间点之前的原始消息
4. WHEN Room_Member 希望帮助后加入者了解之前的讨论时，THE Room_Member SHALL 通过创建并分享 Segment 的方式提供上下文

### 需求 10：邀请时 Segment 分享

**用户故事：** 作为 Room_Member，我希望在邀请新成员加入时可以立即选择消息创建 Segment 分享给新成员，以便新成员加入后能快速了解之前的讨论上下文（类似微信/飞书拉人入群时的合并转发）。

#### 验收标准

1. WHEN Room_Member 邀请新用户加入 Room 时，THE Web_App SHALL 提供选项让邀请者选择 Room 中的消息并创建 Segment
2. WHEN 邀请者创建了邀请 Segment 时，THE Web_App SHALL 将该 Segment 与邀请关联
3. WHEN 被邀请人确认加入 Room 后，THE Web_App SHALL 向被邀请人展示邀请者创建的 Segment 作为上下文
4. THE 邀请 Segment SHALL 遵循与普通 Segment 相同的元数据规则（创建者、来源 Room、创建时间）

### 需求 11：退出 Room 语义

**用户故事：** 作为 Room_Member，我希望在退出 Room 时可以选择保留或删除个人历史记录，以便控制自己的数据。

#### 验收标准

1. WHEN 用户关闭浏览器时，THE Web_App SHALL 默认保留该用户的 Room 成员身份和消息历史
2. WHEN Room_Member 点击"退出 Room"按钮时，THE Web_App SHALL 显示确认对话框
3. THE 确认对话框 SHALL 提供两个选项：保留个人消息历史副本，或删除个人消息历史副本
4. WHEN Room_Member 确认退出并选择保留历史时，THE Web_App SHALL 移除该用户的 Room_Member 身份，但保留该用户的消息历史副本
5. WHEN Room_Member 确认退出并选择删除历史时，THE Web_App SHALL 移除该用户的 Room_Member 身份并删除该用户的个人消息历史副本

### 需求 12：Segment 摘取与分享

**用户故事：** 作为 Room_Member，我希望从对话中摘取消息片段并分享给他人，以便传递上下文而不暴露完整历史。

#### 验收标准

1. WHEN Room_Member 选择一组连续消息时，THE Web_App SHALL 允许用户将选中消息创建为一个命名的 Segment
2. THE Segment SHALL 仅包含来自同一个 Room 的消息，不支持跨 Room 合并
3. THE Segment SHALL 记录消息的原始顺序
4. WHEN Room_Member 将 Segment 分享到 Room 时，THE Web_App SHALL 以消息形式在 Room 中展示 Segment 的预览和链接
5. WHEN Room_Member 将 Segment 通过私信分享时，THE Web_App SHALL 将 Segment 发送给指定用户
6. THE Segment SHALL 保留创建者、来源 Room 和创建时间等元数据

### 需求 13：Companion 注册与管理

**用户故事：** 作为用户，我希望注册和管理多个 Companion（随从），以便在讨论中获得不同 AI 服务的辅助。

#### 验收标准

1. THE Web_App SHALL 允许用户注册多个 Companion，每个 Companion 包括名称、关联的 Provider_Binding 连接和模型选择，数量不限
2. WHEN 用户注册 Companion 时，THE Web_App SHALL 要求用户选择一个已绑定的 Provider_Binding 连接作为 Companion 的 AI 服务来源
3. WHEN 用户更新 Companion 的配置时，THE Web_App SHALL 立即生效新配置
4. THE Web_App SHALL 允许用户为 Companion 设置系统提示词（System Prompt）以定义 Companion 的人格和语气
5. THE Web_App SHALL 允许用户删除已注册的 Companion

### 需求 14：Companion 治理生命周期

**用户故事：** 作为 Room_Member，我希望通过明确的召唤、请求、批准、响应流程使用 Companion，以便在保护 token 资源的同时实现 AI 协作。

参考文档：pocket-room-specs/docs/PocketRoom_Companion_Governance_Design.md

#### 验收标准

1. WHEN Companion_Owner 在 Room 中召唤（Summon）自己的 Companion 时，THE Web_App SHALL 将该 Companion 设为待命状态（在场但不发言，不消耗 token），并以灰色图标展示
2. WHEN Room_Member 请求（Request）某个已召唤的 Companion 进行回应时，THE Web_App SHALL 向该 Companion 的 Companion_Owner 发送审批请求，并显示"等待 [Companion_Owner] 的批准"
3. WHILE Companion_Owner 未审批请求时，THE Companion SHALL 保持静默，不执行任何 API 调用，不消耗 token
4. WHEN Companion_Owner 批准（Approve）请求时，THE Web_App SHALL 提供两个选项："批准一次"和"始终允许该成员"（将该成员加入 Whitelist）
5. WHEN Companion_Owner 批准后，THE Companion SHALL 执行实际 API 调用并将响应（Respond）内容输出到 Room Timeline，此时消耗 token
6. WHEN Companion_Owner 获得批准后，THE Web_App SHALL 将 Companion 图标从灰色变为明亮状态
7. WHERE Companion_Owner 已将某 Room_Member 加入 Whitelist，THE Web_App SHALL 自动批准该成员对该 Companion 的请求，无需 Companion_Owner 手动审批
8. WHEN Companion_Owner 自己触发自己的 Companion 时，THE Web_App SHALL 跳过审批流程，直接执行 API 调用并输出响应
9. IF Companion 的 API 调用失败，THEN THE Web_App SHALL 向触发者和 Companion_Owner 显示明确的错误信息

### 需求 15：Companion 上下文选择

**用户故事：** 作为 Companion_Owner，我希望显式选择发送给 Companion 的上下文内容，以便精确控制 Companion 接收的信息，避免不必要的 token 消耗。

#### 验收标准

1. WHEN Companion_Owner 触发 Companion 调用时，THE Web_App SHALL 要求 Companion_Owner 显式选择要发送的消息或 Segment 作为上下文
2. THE Web_App SHALL 阻止 Companion 自动访问 Room 的完整 Timeline，仅发送 Companion_Owner 显式选择的内容
3. WHEN Companion 生成回复时，THE Companion_Owner SHALL 能够选择回复的可见范围：公开到 Room 或仅私信给自己

### 需求 16：浏览器扩展内容捕获

**用户故事：** 作为用户，我希望从任意网页选取文本并发送到 Pocket Room，以便将网页内容纳入我的上下文库。

#### 验收标准

1. WHEN 用户在网页上选中文本时，THE Browser_Extension SHALL 显示"发送到 Pocket Room"的操作按钮
2. WHEN 用户点击"发送到 Pocket Room"按钮时，THE Browser_Extension SHALL 在 Web_App 的 Basket 中创建一个草稿 Segment，包含选中文本和来源 URL
3. THE Browser_Extension SHALL 仅处理用户主动选择的内容，不进行后台扫描或自动采集
4. IF 用户未登录 Web_App，THEN THE Browser_Extension SHALL 提示用户先登录后再进行内容捕获
5. WHEN 草稿 Segment 创建成功时，THE Browser_Extension SHALL 向用户显示成功确认提示

### 需求 17：数据安全与行级安全

**用户故事：** 作为用户，我希望我的数据受到严格的访问控制保护，以便确保只有授权用户才能访问相应数据。

#### 验收标准

1. THE Web_App SHALL 通过 Supabase Row Level Security (RLS) 策略确保用户只能访问自己有权限的数据
2. THE Web_App SHALL 确保非 Room_Member 无法读取 Room 中的消息内容
3. THE Web_App SHALL 确保用户只能管理自己的 Companion 配置和 Provider_Binding 连接
4. THE Web_App SHALL 确保 Companion 调用记录仅对相关 Room 的 Room_Member 可见
5. IF 未授权用户尝试访问受保护资源，THEN THE Web_App SHALL 返回权限拒绝错误，不泄露资源是否存在的信息
