# Pocket Room 部署清单

## 📋 部署前准备

### 1. 账号和服务准备

- [ ] Vercel 账号已创建
- [ ] Supabase 生产项目已创建
- [ ] GitHub 仓库已准备（用于 Vercel 自动部署）
- [ ] Chrome Web Store 开发者账号已注册（$5 费用）
- [ ] 域名已准备（可选）

### 2. OAuth Provider 配置

#### OpenAI
- [ ] 创建 OpenAI OAuth 应用
- [ ] 获取 Client ID 和 Client Secret
- [ ] 配置回调 URL: `https://your-domain.com/api/oauth/callback/openai`

#### Google AI
- [ ] 创建 Google Cloud 项目
- [ ] 启用 Google AI API
- [ ] 创建 OAuth 2.0 客户端
- [ ] 配置回调 URL: `https://your-domain.com/api/oauth/callback/google`

#### Feishu（可选）
- [ ] 创建飞书企业自建应用
- [ ] 获取 App ID 和 App Secret
- [ ] 配置回调地址

#### WeChat（可选）
- [ ] 创建微信网站应用
- [ ] 获取 AppID 和 AppSecret
- [ ] 配置授权回调域

### 3. 环境变量准备

- [ ] 生成 Token 加密密钥：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- [ ] 准备所有环境变量（参考 `.env.production.example`）

## 🗄️ 数据库部署

### 步骤 1: 设置 Supabase 生产数据库

```bash
# 运行数据库设置脚本
bash scripts/setup-production-db.sh
```

**手动步骤：**

1. **创建数据库表**
   - [ ] 在 Supabase Dashboard > SQL Editor 中执行 `docs/db.sql`
   - [ ] 验证所有表已创建

2. **配置 RLS 策略**
   - [ ] 确保所有表启用 RLS
   - [ ] 验证策略已正确配置
   - [ ] 测试策略（使用测试用户）

3. **创建 Storage Bucket**
   - [ ] 在 Supabase Dashboard > Storage 中创建 `message-attachments` bucket
   - [ ] 设置为 public bucket
   - [ ] 配置 CORS（如需要）

4. **配置 Supabase Auth**
   - [ ] 在 Authentication > Providers 中启用 Google OAuth
   - [ ] 配置 Email OTP
   - [ ] 配置飞书和微信（如需要）
   - [ ] 设置回调 URL

### 步骤 2: 验证数据库

- [ ] 检查所有表是否存在
- [ ] 检查 RLS 策略是否生效
- [ ] 测试数据库连接
- [ ] 运行测试查询

## 🚀 Web App 部署

### 方式 1: 通过 Vercel Dashboard（推荐）

1. **连接 GitHub 仓库**
   - [ ] 访问 https://vercel.com/new
   - [ ] 选择 GitHub 仓库
   - [ ] 选择 `apps/web` 作为根目录

2. **配置构建设置**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Root Directory: apps/web
   ```

3. **配置环境变量**
   - [ ] 在 Vercel Dashboard > Settings > Environment Variables 中添加所有变量
   - [ ] 确保选择 "Production" 环境
   - [ ] 参考 `apps/web/.env.production.example`

4. **部署**
   - [ ] 点击 "Deploy"
   - [ ] 等待构建完成（约 3-5 分钟）
   - [ ] 验证部署成功

### 方式 2: 通过 Vercel CLI

```bash
# 运行部署脚本
bash scripts/deploy-to-vercel.sh
```

**或手动执行：**

```bash
# 1. 运行预部署检查
bash scripts/pre-deploy-check.sh

# 2. 安装 Vercel CLI（如未安装）
npm install -g vercel

# 3. 登录 Vercel
vercel login

# 4. 部署到预览环境（测试）
cd apps/web
vercel

# 5. 部署到生产环境
vercel --prod
```

### 步骤 3: 配置自定义域名（可选）

- [ ] 在 Vercel Dashboard > Settings > Domains 添加域名
- [ ] 配置 DNS 记录（A 记录或 CNAME）
- [ ] 等待 SSL 证书自动配置
- [ ] 验证域名可访问

### 步骤 4: 验证部署

- [ ] 访问部署的 URL
- [ ] 测试用户登录
- [ ] 测试 Room 创建
- [ ] 测试消息发送
- [ ] 测试 Companion 功能
- [ ] 检查浏览器控制台无错误
- [ ] 检查 Vercel 日志无错误

## 🧩 浏览器扩展发布

### 步骤 1: 准备发布材料

1. **图标资源**
   - [ ] 准备 16x16, 32x32, 48x48, 128x128, 512x512 图标
   - [ ] 确保图标清晰、品牌一致
   - [ ] 使用透明背景

2. **截图**
   - [ ] 准备 3-5 张功能截图（1280x800 或 640x400）
   - [ ] 内容选择截图
   - [ ] Basket 截图
   - [ ] Room 分享截图

3. **文案**
   - [ ] 准备简短描述（132 字符以内）
   - [ ] 准备详细描述
   - [ ] 准备隐私政策 URL

### 步骤 2: 构建生产版本

```bash
# 进入扩展目录
cd apps/extension

# 创建生产环境配置
cp .env.example .env.production
# 编辑 .env.production，填入生产环境值

# 运行构建脚本
bash scripts/build-production.sh
```

**或手动执行：**

```bash
cd apps/extension

# 清理旧构建
rm -rf dist/

# 构建
npm run build

# 创建 ZIP 包
cd dist
zip -r ../pocket-room-extension-v1.0.0.zip .
cd ..
```

### 步骤 3: 本地测试

- [ ] 打开 Chrome
- [ ] 访问 `chrome://extensions/`
- [ ] 启用"开发者模式"
- [ ] 点击"加载已解压的扩展程序"
- [ ] 选择 `dist/` 目录
- [ ] 测试所有功能：
  - [ ] 内容选择和捕获
  - [ ] 发送到 Basket
  - [ ] 与 Web App 同步
  - [ ] 错误处理

### 步骤 4: 提交到 Chrome Web Store

1. **访问开发者控制台**
   - [ ] 访问 https://chrome.google.com/webstore/devconsole
   - [ ] 登录 Google 账号
   - [ ] 支付 $5 注册费（如首次）

2. **创建新项目**
   - [ ] 点击"新增项"
   - [ ] 上传 ZIP 包
   - [ ] 等待上传完成

3. **填写商店信息**
   - [ ] 扩展名称：Pocket Room
   - [ ] 简短描述
   - [ ] 详细描述
   - [ ] 类别：生产力工具
   - [ ] 语言：中文（简体）

4. **上传图形资源**
   - [ ] 小图标：128x128
   - [ ] 大图标：512x512
   - [ ] 截图：3-5 张
   - [ ] 宣传图片（可选）：1400x560

5. **隐私信息**
   - [ ] 隐私政策 URL
   - [ ] 权限说明

6. **分发设置**
   - [ ] 可见性：公开
   - [ ] 地区：所有地区
   - [ ] 定价：免费

7. **提交审核**
   - [ ] 检查所有信息
   - [ ] 点击"提交审核"
   - [ ] 等待审核（1-3 个工作日）

## 📊 监控和验证

### 部署后验证

- [ ] **健康检查**
  - [ ] Web App 可访问
  - [ ] API 端点正常
  - [ ] 数据库连接正常
  - [ ] Realtime 连接正常

- [ ] **功能测试**
  - [ ] 用户注册和登录
  - [ ] Provider Binding
  - [ ] Room 创建和加入
  - [ ] 消息发送和接收
  - [ ] Companion 调用
  - [ ] Segment 创建和分享
  - [ ] 浏览器扩展集成

- [ ] **性能测试**
  - [ ] 页面加载速度 < 3 秒
  - [ ] API 响应时间 < 500ms
  - [ ] Realtime 延迟 < 1 秒

### 设置监控

- [ ] **Vercel Analytics**
  - [ ] 启用 Vercel Analytics
  - [ ] 查看访问统计

- [ ] **错误监控（可选）**
  - [ ] 集成 Sentry
  - [ ] 配置错误告警

- [ ] **日志监控**
  - [ ] 查看 Vercel 部署日志
  - [ ] 查看 Supabase 日志
  - [ ] 设置日志告警

### 用户反馈渠道

- [ ] 设置支持邮箱
- [ ] 监控 Chrome Web Store 评论
- [ ] 准备 FAQ 文档
- [ ] 设置用户反馈表单

## 🔄 持续维护

### 定期任务

- [ ] 每周检查日志和错误
- [ ] 每月审查安全更新
- [ ] 每季度性能审计
- [ ] 定期备份数据库

### 更新流程

1. **Web App 更新**
   - [ ] 在 Git 中创建新分支
   - [ ] 开发和测试新功能
   - [ ] 合并到主分支
   - [ ] Vercel 自动部署

2. **浏览器扩展更新**
   - [ ] 更新版本号
   - [ ] 构建新版本
   - [ ] 本地测试
   - [ ] 上传到 Chrome Web Store
   - [ ] 提交审核

## 📝 部署记录

### 部署信息

- **部署日期**: _______________
- **部署人员**: _______________
- **Web App URL**: _______________
- **Supabase Project**: _______________
- **Extension Version**: _______________

### 问题记录

| 日期 | 问题描述 | 解决方案 | 状态 |
|------|---------|---------|------|
|      |         |         |      |

## ✅ 完成确认

- [ ] 所有部署步骤已完成
- [ ] 所有验证测试已通过
- [ ] 监控已设置
- [ ] 文档已更新
- [ ] 团队已通知

---

**部署完成！** 🎉

如有问题，请参考：
- [部署指南](apps/web/docs/DEPLOYMENT_GUIDE.md)
- [扩展发布指南](apps/extension/docs/EXTENSION_PUBLISHING_GUIDE.md)
- [故障排查](apps/web/docs/DEPLOYMENT_GUIDE.md#故障排查)
