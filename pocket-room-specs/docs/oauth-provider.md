你是一个在真实工程里工作的 agentic coding 工具（Claude Code / Codex）。需要为多个外部 AI Provider（例如 “Sign in with ChatGPT / Codex”、以及 “Google / Antigravity / Gemini”）实现可靠的 OAuth 登录、token 存储、刷新、以及对下游 API 请求的鉴权注入。

重要背景（必须遵守）：
- 之前可能有人用“错误方式”实现过 OAuth：例如直接依赖/调用 OpenCode 的某些 OAuth npm 包、或把 OpenCode 的 provider 插件当作库引入、或用抓浏览器 cookie / web session 的方式。这些都不要沿用。
- 正确策略是：把 OAuth 实现为我们工程内的“独立 Provider 模块”（薄而可维护），参考开源实现（如 OpenCode 的实现思路）但不要把 OpenCode 的代码/包当成运行时依赖。也不要硬编码依赖 OpenCode 的内部对象、配置结构、或插件框架。
- 目标是“标准 OAuth 2.0 / OIDC 规范实现 + PKCE/Device Code 等适配”，并提供统一接口供业务层调用。

交付目标（你需要输出并实现）：
1) 设计并实现一个可扩展的 Auth 子系统（Auth Service），支持多 Provider、多用户、多会话：
   - Provider 示例：OpenAI(ChatGPT/Codex 登录)、Google(Antigravity/Gemini 登录)。
   - 多用户：每个用户可以绑定多个 Provider；每个 Provider 可存在多账号连接（可选）。
2) 实现两种登录流（按需）：
   - 浏览器登录：Authorization Code + PKCE + 本地回调（loopback redirect）或等价的可部署回调机制。
   - 无浏览器环境：Device Code Flow（如果 provider 支持），作为可选 fallback。
3) Token 全生命周期管理：
   - 安全存储：access_token、refresh_token（若有）、expiry、scope、account_id（若有）等。
   - 自动刷新：在 token 即将过期前刷新；刷新失败触发重新登录。
   - 撤销/解绑：提供 revoke/disconnect 能力（如果 provider 支持）。
4) 请求注入与路由：
   - 对所有调用外部 AI API 的请求，在 HTTP 层统一注入 `Authorization: Bearer <access_token>`。
   - 若特定 provider 需要额外 header（例如 account/tenant 标识），通过 provider 适配层注入，且不要写死到业务层。
   - 若某 provider 需要请求 URL/endpoint 重写（例如 “responses” 之类的特殊路径），也必须在 provider 适配层完成，业务层只调用统一的客户端接口。
5) 可测试、可观测：
   - 单元测试：PKCE 生成、token refresh、存储读写、鉴权头注入。
   - 集成测试：mock provider endpoints（authorize/token/refresh/device），跑通登录→调用→刷新。
   - 日志：在不泄露 token 的前提下输出关键事件（login start/callback success/refresh ok/refresh fail）。
6) 修复旧实现：
   - 全局搜索并移除任何对 OpenCode OAuth 包/插件的运行时依赖（例如 `opencode-*oauth*`、直接 import OpenCode provider 的做法）。
   - 删除任何 cookie 抓取、session 伪造、或把浏览器会话当 API token 的逻辑。
   - 替换为本 prompt 要求的标准 OAuth Provider 模块。
   - 保持对业务功能的兼容：原先业务调用点不应大改；通过适配层桥接。

工程约束（必须遵守）：
- 不要在实现中依赖 OpenCode 的包、内部配置、插件体系或其运行时；允许参考其公开源码作为“思路”，但最后代码必须是我们工程自己的、接口稳定的模块。
- 遵循 OAuth 安全最佳实践：
  - 必须使用 PKCE（S256）。
  - 必须校验 `state` 防 CSRF。
  - 必须设置合理的回调地址白名单与端口冲突处理。
  - 不能把 refresh_token/secret 明文打到日志。
- 把“Provider 差异”封装在 provider 层，业务层不感知 provider 特性（除非 UI 上展示需要）。
- 不要把 prompt 场景限定在“多人群聊”；该 Auth 子系统应可用于任何需要登录的工具（群聊、写文档助手、IDE 插件、自动化代理等）。

你需要产出的具体内容（按顺序执行）：
A) 现状审计（只读，不要大改）
- 列出当前工程里与 auth/oauth 相关的目录、文件、依赖。
- 指出旧实现的问题点（例如依赖 OpenCode 包、cookie/session 方式、缺少 PKCE/state 校验、token 存储不安全等）。
- 给出改造计划（模块边界、改动点、迁移步骤）。

B) 目标架构与接口定义（写到代码里）
- 定义统一接口，例如：
  - `AuthProvider`：`startLogin() / handleCallback() / refresh() / getAccessToken() / injectAuth(request)` 等
  - `AuthStore`：存储读写（可用文件/DB/加密存储抽象）
  - `AuthService`：面向业务层（connect/disconnect/listConnections/getClient）
- 定义数据结构：
  - `Connection { userId, provider, accountId?, scopes, accessToken, refreshToken?, expiresAt, metadata }`

C) 实现两个 provider（最小可用）
1) OpenAI(ChatGPT/Codex 登录) Provider：
- 实现 Authorization Code + PKCE 的登录流程。
- 支持 refresh_token 刷新（如果该 provider 的 token 端点返回 refresh_token）。
- 若需要 account header 或 endpoint rewrite，封装在 provider 内；业务层只拿到统一 client。
2) Google(Antigravity/Gemini 登录) Provider：
- 实现标准 OAuth 流程（PKCE/Device flow 视支持情况）。
- 管理 scopes（最小权限原则）。
- Token refresh 与注入。

说明：如果你缺少某 provider 的端点/参数，请把端点/参数设计成配置项（env/config），并在实现里留出可配置入口，不要写死。

D) 迁移与回归
- 把业务调用从旧逻辑迁移到 `AuthService`（尽量少改业务层）。
- 添加 tests，保证：
  - 登录回调 state 校验
  - PKCE 校验
  - refresh 触发逻辑（如 expiresAt < now+2min 触发 refresh）
  - 注入 Authorization header
- 提供一个最小 CLI/HTTP endpoint（若工程已有管理界面则对接现有 UI）用于：
  - connect provider
  - disconnect provider
  - list connections

验收标准（必须满足）：
- 工程里不再存在对 OpenCode OAuth 包/插件的运行时依赖。
- OAuth 登录流程具备 PKCE(S256) + state 校验 + token 安全存储 + refresh。
- 业务调用外部 AI API 时不关心 token，Auth 层自动注入并在必要时刷新。
- 至少两个 provider（OpenAI + Google）可以通过 mock 集成测试跑通。

现在开始执行：先做 A) 现状审计，然后按 B→C→D 逐步提交代码变更。每一步都要给出简短的“变更摘要 + 关键文件列表 + 运行/测试命令”。
