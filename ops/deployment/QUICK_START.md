# Pocket Room 快速部署指南

## 🚀 5 分钟快速部署

本指南帮助你快速将 Pocket Room 部署到生产环境。

## 前置要求

- Node.js 18+
- Git
- Vercel 账号
- Supabase 账号

## 步骤 1: 克隆仓库（如果还没有）

```bash
git clone https://github.com/your-org/pocket-room.git
cd pocket-room
npm install
```

## 步骤 2: 设置 Supabase 生产数据库

### 2.1 创建 Supabase 项目

1. 访问 https://supabase.com/dashboard
2. 点击 "New Project"
3. 填写项目信息并创建

### 2.2 执行数据库迁移

```bash
# 运行自动化脚本
bash scripts/setup-production-db.sh

# 或手动执行：
# 1. 在 Supabase Dashboard > SQL Editor 中
# 2. 复制 docs/db.sql 的内容
# 3. 执行 SQL
```

### 2.3 创建 Storage Bucket

1. 在 Supabase Dashboard > Storage
2. 创建新 bucket: `message-attachments`
3. 设置为 public

### 2.4 获取 Supabase 凭证

在 Supabase Dashboard > Settings > API 中获取：
- Project URL
- Anon key
- Service role key

## 步骤 3: 配置 OAuth Providers

### OpenAI（必需）

1. 访问 https://platform.openai.com/account/api-keys
2. 创建新的 API key
3. 记录 Client ID 和 Client Secret

### Google AI（可选）

1. 访问 https://console.cloud.google.com/
2. 创建新项目或选择现有项目
3. 启用 Google AI API
4. 创建 OAuth 2.0 客户端
5. 记录 Client ID 和 Client Secret

## 步骤 4: 部署到 Vercel

### 方式 A: 通过 Vercel Dashboard（推荐新手）

1. **连接 GitHub**
   - 访问 https://vercel.com/new
   - 选择你的 GitHub 仓库
   - 点击 "Import"

2. **配置项目**
   ```
   Framework Preset: Next.js
   Root Directory: apps/web
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **添加环境变量**
   
   点击 "Environment Variables"，添加以下变量：

   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Token Encryption (生成新密钥)
   TOKEN_ENCRYPTION_KEY=your_base64_encryption_key

   # OpenAI
   OPENAI_CLIENT_ID=your_openai_client_id
   OPENAI_CLIENT_SECRET=your_openai_client_secret
   OPENAI_REDIRECT_URI=https://your-app.vercel.app/api/oauth/callback/openai

   # Google AI (可选)
   GOOGLE_AI_CLIENT_ID=your_google_client_id
   GOOGLE_AI_CLIENT_SECRET=your_google_client_secret
   GOOGLE_AI_REDIRECT_URI=https://your-app.vercel.app/api/oauth/callback/google

   # App URL
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **部署**
   - 点击 "Deploy"
   - 等待 3-5 分钟
   - 部署完成！

### 方式 B: 通过 CLI（推荐开发者）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 运行部署脚本
bash scripts/deploy-to-vercel.sh

# 或手动部署
cd apps/web
vercel --prod
```

## 步骤 5: 验证部署

访问你的 Vercel URL 并测试：

- [ ] 页面可以打开
- [ ] 可以注册/登录
- [ ] 可以创建 Room
- [ ] 可以发送消息

## 步骤 6: 部署浏览器扩展（可选）

### 6.1 构建扩展

```bash
cd apps/extension

# 创建生产配置
cp .env.example .env.production
# 编辑 .env.production，设置 VITE_APP_URL 为你的 Vercel URL

# 构建
bash scripts/build-production.sh
```

### 6.2 本地测试

1. 打开 Chrome
2. 访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 加载 `apps/extension/dist/` 目录
5. 测试功能

### 6.3 发布到 Chrome Web Store

1. 访问 https://chrome.google.com/webstore/devconsole
2. 上传生成的 ZIP 文件
3. 填写商店信息
4. 提交审核

## 常见问题

### Q: 部署失败怎么办？

**A:** 检查以下几点：
1. 环境变量是否正确配置
2. Supabase 数据库是否正确设置
3. 查看 Vercel 部署日志
4. 运行 `bash scripts/pre-deploy-check.sh` 检查本地构建

### Q: 如何生成 Token 加密密钥？

**A:** 运行以下命令：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Q: OAuth 回调失败怎么办？

**A:** 确保：
1. 回调 URL 与 Provider 配置一致
2. 使用 HTTPS（生产环境）
3. 域名已正确配置

### Q: 数据库连接失败怎么办？

**A:** 检查：
1. Supabase URL 和 Key 是否正确
2. RLS 策略是否正确配置
3. 网络连接是否正常

## 下一步

部署完成后，你可以：

1. **配置自定义域名**
   - 在 Vercel Dashboard > Settings > Domains
   - 添加你的域名
   - 配置 DNS

2. **设置监控**
   - 启用 Vercel Analytics
   - 集成 Sentry（可选）
   - 设置告警

3. **邀请用户测试**
   - 分享应用 URL
   - 收集反馈
   - 迭代改进

## 获取帮助

- 📖 [完整部署指南](../../apps/web/docs/DEPLOYMENT_GUIDE.md)
- 📋 [部署清单](DEPLOYMENT_CHECKLIST.md)
- 🐛 [故障排查](../../apps/web/docs/DEPLOYMENT_GUIDE.md#故障排查)
- 💬 联系支持: support@your-domain.com

---

**恭喜！你已成功部署 Pocket Room！** 🎉
