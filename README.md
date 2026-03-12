# Pocket Room
A shared space to think, remember, and build — with people and AI.

Pocket Room 是一个帮助你**保存、整理、传递上下文**的轻量协作工具。

它不是为了让 AI 更聪明，
而是为了让已经发生过的思考不再消失。

## 为什么需要 Pocket Room？

今天，越来越多重要的思考发生在：

- ChatGPT / Gemini / Claude 等对话窗口
- 多人即时讨论
- 结对或结队编程的过程中

但这些思考往往：

- **碎片化**：夹杂着试错、闲聊、重复
- **易失性**：散落在不同平台，很难再找回
- **不可继承**：难以交给另一个人，或未来的自己

我们不断复制、粘贴、重新解释，从头开始。

Pocket Room 的目标，是把对话变成可以被继承的上下文。

## Pocket Room 是什么？

Pocket Room 由两个紧密结合的部分组成：

### Room

讨论发生的地方。

- 多人 + 多 AI
- 实时
- 不强迫结构
- 保留完整时间线

### Pocket

记忆沉淀的地方。

- 只保存你选择的内容
- 可整理、可压缩
- 可再次取用、分享、继承

它们构成一个循环：

讨论 → 摘取 → 整理 → 再使用 → 再讨论

## 像"抽记忆"一样使用上下文

在 Pocket Room 里，你不需要一次性给出全部背景。

你可以：

- 先取一小段
- 再决定要不要继续
- 逐步补充
- 随时停下

上下文的边界，始终由你决定。

## 这不是一个 AI 工具

AI 是参与者之一，但不是中心。

Pocket Room 关心的是：

- 思考如何被保存
- 上下文如何被传递
- 讨论如何不被浪费

---

## 📚 文档

### 用户文档
- [用户使用指南](apps/web/docs/USER_GUIDE.md) - 如何使用 Pocket Room

### 开发文档
- [开发者指南](apps/web/docs/DEVELOPER_GUIDE.md) - 开发环境设置和 API 文档
- [测试文档](apps/web/docs/TESTING_SUMMARY.md) - 测试策略和覆盖率

### 部署文档
- [快速部署指南](ops/deployment/QUICK_START.md) - 15-30 分钟快速上线
- [完整部署清单](ops/deployment/DEPLOYMENT_CHECKLIST.md) - 生产环境部署
- [部署状态报告](ops/deployment/DEPLOYMENT_STATUS.md) - 当前部署准备状态
- [运维文档索引](ops/README.md) - 所有运维相关文档

### 技术文档
- [数据库 Schema](docs/db.sql) - 数据库结构
- [数据库迁移](docs/migrations/) - 数据库版本管理

### 项目管理
- [项目组织策略](PROJECT_ORGANIZATION.md) - 文档和任务管理策略
- [Git 提交总结](GIT_COMMIT_SUMMARY.md) - 最新提交记录

---

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
cd apps/web
npm run dev
```

### 部署

```bash
# 查看快速部署指南
cat ops/deployment/QUICK_START.md

# 或运行自动化部署
bash scripts/deploy-to-vercel.sh
```

---

## 🏗️ 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **部署**: Vercel
- **浏览器扩展**: Chrome Extension (Manifest V3)

---

## 📄 许可证

[待定]

---

**Pocket Room** - A shared space to think, remember, and build.