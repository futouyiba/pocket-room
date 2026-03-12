# Pocket Room 用户使用指南

## 欢迎使用 Pocket Room

Pocket Room 是一个共享思考、记忆与协作的空间，融合了实时讨论（Room）和上下文沉淀（Pocket）两大核心功能。本指南将帮助你快速上手。

## 目录

1. [快速开始](#快速开始)
2. [登录与认证](#登录与认证)
3. [Room 功能](#room-功能)
4. [消息与讨论](#消息与讨论)
5. [Segment 摘取](#segment-摘取)
6. [AI Companion](#ai-companion)
7. [浏览器扩展](#浏览器扩展)
8. [常见问题](#常见问题)

## 快速开始

### 第一步：注册登录

1. 访问 Pocket Room 网站
2. 选择登录方式：
   - Google 账号
   - 邮箱验证码
   - 飞书账号
   - 微信账号
3. 完成认证后自动进入 Room 列表

### 第二步：创建或加入 Room

- **创建 Room**：点击"创建 Room"按钮，填写名称和描述
- **加入 Room**：浏览 Room 列表，点击感兴趣的 Room 加入

### 第三步：开始讨论

- 在 Room 中发送消息
- 使用 Markdown 格式化文本
- 上传图片
- @提及其他成员

## 登录与认证

### 支持的登录方式

#### Google OAuth
- 使用 Google 账号快速登录
- 无需记住额外密码
- 支持多账号切换

#### 邮箱验证码（OTP）
- 输入邮箱地址
- 接收验证码
- 输入验证码完成登录

#### 飞书登录
- 适合企业用户
- 与飞书账号关联
- 支持企业 SSO

#### 微信登录
- 扫码登录
- 快速便捷
- 支持移动端

### 会话管理

- 登录后会话自动保存
- 跨设备同步
- 关闭浏览器后无需重新登录
- 可手动退出登录

## Room 功能

### 创建 Room

1. 点击"创建 Room"按钮
2. 填写 Room 信息：
   - **名称**：Room 的标题
   - **描述**：简要说明 Room 的主题
   - **加入策略**：选择以下之一
     - 申请审批（默认）
     - 自由加入
     - 密码加入
3. 邀请至少一名成员
4. （可选）选择消息创建邀请 Segment
5. 提交创建

### 加入策略

#### 申请审批模式
- 用户提交加入申请
- Room Owner 审批申请
- Owner 可以：批准、拒绝、封禁、静默

#### 自由加入模式
- 任何人都可以直接加入
- 无需审批
- 适合公开讨论

#### 密码加入模式
- 需要输入密码才能加入
- 密码由 Room Owner 设置
- 适合半公开 Room

### 邀请确认

- 被邀请人收到邀请通知
- 可以选择接受或拒绝
- 接受后 Room 正式建立
- 拒绝后通知创建者

### 退出 Room

1. 点击"退出 Room"按钮
2. 选择是否保留消息历史：
   - **保留历史**：可以继续查看之前的消息
   - **删除历史**：清除个人消息历史副本
3. 确认退出

## 消息与讨论

### 发送消息

#### 文本消息
- 在输入框中输入文本
- 按 Enter 发送（Shift+Enter 换行）
- 支持 Markdown 语法

#### Markdown 支持

```markdown
# 标题
## 二级标题

**粗体** *斜体*

- 列表项 1
- 列表项 2

1. 有序列表
2. 第二项

[链接文本](https://example.com)

> 引用文本

`行内代码`

​```javascript
// 代码块
function hello() {
  console.log('Hello, Pocket Room!');
}
​```
```

#### 代码高亮

支持多种编程语言的语法高亮：
- JavaScript / TypeScript
- Python
- SQL
- Bash
- JSON
- 更多...

#### 图片上传

1. 点击图片上传按钮
2. 选择图片文件
3. 图片自动上传并内联显示

### 消息管理

#### 删除消息
- 点击消息右上角的删除按钮
- 仅消息发送者或 Room Owner 可以删除
- 删除后显示 Tombstone 占位符

#### 消息可见性
- 只能看到加入 Room 后的消息
- 无法访问加入前的历史消息
- 通过 Segment 分享了解历史上下文

### 实时同步

- 消息实时推送给所有在线成员
- 连接状态指示器显示连接状态
- 连接断开时自动重连
- 降级为轮询模式（如果 Realtime 不可用）

## Segment 摘取

### 什么是 Segment？

Segment 是从 Room 对话中摘取的命名消息片段，类似微信的"合并转发"功能。

### 创建 Segment

1. 在 Room 中点击"创建 Segment"
2. 选择要包含的消息（可多选）
3. 填写 Segment 信息：
   - **名称**：Segment 的标题
   - **描述**：简要说明内容
4. 保存到 Basket 或直接分享

### Basket（收集篮）

- 临时存储待整理的 Segment
- 查看和编辑草稿 Segment
- 整理后分享到 Room 或私信

### 分享 Segment

#### 分享到 Room
1. 在 Basket 中选择 Segment
2. 点击"分享到 Room"
3. 选择目标 Room
4. Segment 以消息形式展示在 Room 中

#### 私信分享
1. 选择 Segment
2. 点击"私信分享"
3. 选择接收者
4. 发送

### 邀请时分享 Segment

- 创建 Room 时可以选择消息创建 Segment
- 被邀请人确认后看到邀请 Segment
- 快速了解讨论上下文

## AI Companion

### 什么是 Companion？

Companion 是你的个人 AI 助手，可以在 Room 中协助讨论。每个用户可以注册多个 Companion，数量不限。

### 绑定 AI 服务商

在使用 Companion 前，需要先绑定 AI 服务商账户：

1. 进入 Settings > Provider Binding
2. 点击"绑定新 Provider"
3. 选择 Provider（OpenAI、Google 等）
4. 完成 OAuth 授权
5. Token 自动管理和刷新

### 注册 Companion

1. 进入 Settings > Companions
2. 点击"注册新 Companion"
3. 填写信息：
   - **名称**：Companion 的名字
   - **Provider 连接**：选择已绑定的 Provider
   - **模型**：选择 AI 模型（如 GPT-4、Gemini Pro）
   - **System Prompt**：定义 Companion 的人格和语气
   - **参数**：temperature、max_tokens 等
4. 保存

### 使用 Companion

#### 召唤（Summon）
- 在 Room 中点击"召唤 Companion"
- Companion 进入待命状态（灰色图标）
- 在场但不发言，不消耗 token

#### 请求（Request）
- 其他成员点击"请求 Companion 回应"
- 系统显示"等待 [Owner] 的批准"
- Companion 保持静默

#### 批准（Approve）
- Companion Owner 收到审批请求
- 选择：
  - **批准一次**：仅本次允许
  - **始终允许该成员**：加入白名单
- 批准后选择上下文

#### 上下文选择
- Owner 显式选择发送给 Companion 的内容
- 可以选择消息或 Segment
- 防止 Companion 自动访问完整 Timeline

#### 响应（Respond）
- Companion 执行 API 调用
- 生成回应并输出到 Room
- 消耗 token
- 图标变为明亮状态

### Companion 审批豁免

- **Owner 自己触发**：跳过审批，直接执行
- **白名单成员**：自动批准，无需手动审批

### 响应可见性

- **公开到 Room**：所有成员可见
- **仅私信给自己**：仅 Owner 可见

## 浏览器扩展

### 安装扩展

1. 访问 Chrome Web Store
2. 搜索"Pocket Room"
3. 点击"添加到 Chrome"
4. 确认安装

### 使用扩展

#### 捕获网页内容
1. 在任意网页上选择文本
2. 点击"发送到 Pocket Room"按钮
3. 内容保存到 Basket

#### 查看 Basket
1. 点击扩展图标
2. 查看草稿 Segment 列表
3. 点击打开 Web App

#### 分享到 Room
1. 在 Basket 中选择 Segment
2. 点击"分享"
3. 选择目标 Room

### 扩展设置

- 登录状态同步
- 自动记录来源 URL
- 快捷键配置（可选）

## 常见问题

### 登录相关

**Q: 忘记密码怎么办？**
A: Pocket Room 使用 OAuth 和邮箱验证码登录，无需记住密码。如果使用邮箱登录，每次都会发送新的验证码。

**Q: 可以使用多个账号吗？**
A: 可以。每个登录方式（Google、邮箱等）都是独立的账号。

**Q: 会话会过期吗？**
A: 会话长期有效，除非手动退出登录。

### Room 相关

**Q: 如何修改 Room 设置？**
A: 目前仅 Room Owner 可以修改设置。进入 Room 设置页面进行修改。

**Q: 可以转让 Room 所有权吗？**
A: Sprint 1 暂不支持，后续版本会添加此功能。

**Q: 被封禁后还能加入吗？**
A: 被封禁后无法再次申请加入该 Room。

### 消息相关

**Q: 可以编辑已发送的消息吗？**
A: Sprint 1 暂不支持消息编辑，只能删除。

**Q: 删除的消息可以恢复吗？**
A: 不可以。删除后消息内容永久删除，仅保留 Tombstone 占位符。

**Q: 为什么看不到加入前的消息？**
A: 这是隐私保护设计。后加入成员只能看到加入后的消息。如需了解历史，可以请求成员分享 Segment。

### Companion 相关

**Q: Companion 会自动回复吗？**
A: 不会。Companion 需要经过召唤、请求、批准、响应四个步骤，完全由用户控制。

**Q: Companion 消耗谁的 token？**
A: 消耗 Companion Owner 绑定的 AI 服务商账户的 token。

**Q: 可以删除 Companion 吗？**
A: 可以。在 Settings > Companions 中删除。

**Q: Companion 可以访问所有消息吗？**
A: 不可以。Companion 只能访问 Owner 显式选择的上下文内容。

### 扩展相关

**Q: 扩展支持哪些浏览器？**
A: 目前仅支持 Chrome 和基于 Chromium 的浏览器（如 Edge、Brave）。

**Q: 扩展会收集我的浏览数据吗？**
A: 不会。扩展仅处理用户主动选择的内容，不进行后台扫描或自动采集。

**Q: 捕获的内容保存在哪里？**
A: 保存在 Pocket Room 的 Basket 中，与 Web App 实时同步。

## 获取帮助

如果你遇到问题或有建议，可以通过以下方式联系我们：

- **邮箱**：support@your-domain.com
- **文档**：https://your-domain.com/docs
- **GitHub**：https://github.com/your-org/pocket-room

感谢使用 Pocket Room！
