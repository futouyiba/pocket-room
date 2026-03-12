# Pocket Room 部署指南

## 概述

本指南介绍如何将 Pocket Room Web App 部署到生产环境（Vercel）以及如何配置 Supabase 生产数据库。

## 前置要求

- Node.js 18+ 
- npm 或 yarn
- Vercel 账号
- Supabase 项目（生产环境）
- OAuth Provider 应用（OpenAI、Google、Feishu、WeChat）

## 1. 配置生产环境

### 1.1 Supabase 生产数据库

1. **创建 Supabase 项目**
   ```bash
   # 访问 https://supabase.com/dashboard
   # 创建新项目，选择合适的区域
   ```

2. **执行数据库迁移**
   ```bash
   # 连接到 Supabase 项目
   npx supabase link --project-ref <your-project-ref>
   
   # 执行迁移脚本
   npx supabase db push
   
   # 或手动执行 SQL
   # 在 Supabase Dashboard > SQL Editor 中执行 docs/db.sql
   ```

3. **配置 RLS 策略**
   ```sql
   -- 确保所有表都启用了 RLS
   -- 执行 docs/rls-policies.sql 中的策略
   ```

4. **配置 Storage Buckets**
   ```bash
   # 创建图片存储 bucket
   # Supabase Dashboard > Storage > Create bucket
   # Bucket name: message-attachments
   # Public: true
   ```

### 1.2 配置 OAuth Providers

#### OpenAI
1. 访问 https://platform.openai.com/account/api-keys
2. 创建新的 OAuth 应用
3. 设置回调 URL: `https://your-domain.com/api/provider-binding/callback/openai`
4. 记录 Client ID 和 Client Secret

#### Google
1. 访问 https://console.cloud.google.com/apis/credentials
2. 创建 OAuth 2.0 客户端 ID
3. 设置授权重定向 URI: `https://your-domain.com/api/provider-binding/callback/google`
4. 记录 Client ID 和 Client Secret

#### Feishu（飞书）
1. 访问 https://open.feishu.cn/app
2. 创建企业自建应用
3. 配置回调地址: `https://your-domain.com/api/provider-binding/callback/feishu`
4. 记录 App ID 和 App Secret

#### WeChat（微信）
1. 访问 https://open.weixin.qq.com/
2. 创建网站应用
3. 配置授权回调域: `your-domain.com`
4. 记录 AppID 和 AppSecret

### 1.3 配置环境变量

创建 `.env.production` 文件：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Providers - OpenAI
OPENAI_CLIENT_ID=your-openai-client-id
OPENAI_CLIENT_SECRET=your-openai-client-secret
OPENAI_REDIRECT_URI=https://your-domain.com/api/provider-binding/callback/openai

# OAuth Providers - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/provider-binding/callback/google

# OAuth Providers - Feishu
FEISHU_APP_ID=your-feishu-app-id
FEISHU_APP_SECRET=your-feishu-app-secret
FEISHU_REDIRECT_URI=https://your-domain.com/api/provider-binding/callback/feishu

# OAuth Providers - WeChat
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
WECHAT_REDIRECT_URI=https://your-domain.com/api/provider-binding/callback/wechat

# Encryption Key for Token Storage
TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 2. 部署到 Vercel

### 2.1 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署到生产环境
vercel --prod

# 或使用项目配置
vercel deploy --prod
```

### 2.2 通过 Vercel Dashboard

1. **连接 Git 仓库**
   - 访问 https://vercel.com/new
   - 选择 GitHub/GitLab/Bitbucket 仓库
   - 选择 `apps/web` 作为根目录

2. **配置构建设置**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Root Directory: apps/web
   ```

3. **配置环境变量**
   - 在 Vercel Dashboard > Settings > Environment Variables
   - 添加所有 `.env.production` 中的变量
   - 确保选择 "Production" 环境

4. **部署**
   - 点击 "Deploy"
   - 等待构建完成

### 2.3 配置自定义域名

1. 在 Vercel Dashboard > Settings > Domains
2. 添加自定义域名
3. 配置 DNS 记录（A 记录或 CNAME）
4. 等待 SSL 证书自动配置

## 3. 验证部署

### 3.1 健康检查

访问以下端点验证部署：

```bash
# 检查应用是否运行
curl https://your-domain.com

# 检查 API 端点
curl https://your-domain.com/api/health

# 检查 Supabase 连接
curl https://your-domain.com/api/health/supabase
```

### 3.2 功能测试

1. **用户登录**
   - 测试 Google OAuth 登录
   - 测试 Email OTP 登录
   - 测试飞书登录
   - 测试微信登录

2. **Provider Binding**
   - 测试 OpenAI 绑定
   - 测试 Google 绑定
   - 验证 Token 刷新

3. **Room 功能**
   - 创建 Room
   - 加入 Room
   - 发送消息
   - 实时消息接收

4. **Companion 功能**
   - 注册 Companion
   - 召唤 Companion
   - 请求和批准
   - 执行响应

## 4. 监控和日志

### 4.1 Vercel Analytics

```bash
# 启用 Vercel Analytics
# 在 vercel.json 中添加：
{
  "analytics": {
    "enable": true
  }
}
```

### 4.2 错误监控

推荐集成 Sentry：

```bash
npm install @sentry/nextjs

# 配置 sentry.client.config.js 和 sentry.server.config.js
```

### 4.3 日志查看

```bash
# 查看 Vercel 部署日志
vercel logs <deployment-url>

# 实时日志
vercel logs --follow
```

## 5. 性能优化

### 5.1 启用缓存

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 5.2 图片优化

```javascript
// 使用 Next.js Image 组件
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  width={500}
  height={300}
  alt="Description"
/>
```

### 5.3 代码分割

```javascript
// 动态导入大型组件
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});
```

## 6. 安全配置

### 6.1 Content Security Policy

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://*.supabase.co;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 6.2 环境变量安全

- 永远不要在客户端代码中暴露 Service Role Key
- 使用 `NEXT_PUBLIC_` 前缀仅用于公开变量
- 定期轮换 API 密钥和 Token

## 7. 回滚策略

### 7.1 快速回滚

```bash
# 查看部署历史
vercel ls

# 回滚到上一个部署
vercel rollback <deployment-url>
```

### 7.2 数据库回滚

```bash
# 使用 Supabase 备份
# Dashboard > Database > Backups
# 选择备份点进行恢复
```

## 8. 故障排查

### 8.1 常见问题

**问题：环境变量未生效**
- 解决：确保在 Vercel Dashboard 中正确配置
- 重新部署以应用新的环境变量

**问题：Supabase 连接失败**
- 检查 SUPABASE_URL 和 ANON_KEY 是否正确
- 验证 RLS 策略是否正确配置

**问题：OAuth 回调失败**
- 确保回调 URL 与 Provider 配置一致
- 检查 HTTPS 是否启用

### 8.2 调试工具

```bash
# 本地测试生产构建
npm run build
npm run start

# 检查构建输出
vercel build
```

## 9. 维护计划

### 9.1 定期任务

- 每周检查 Vercel 和 Supabase 日志
- 每月审查安全更新
- 每季度进行性能审计

### 9.2 备份策略

- Supabase 自动每日备份
- 定期导出关键数据
- 测试恢复流程

## 总结

按照本指南，您应该能够成功将 Pocket Room 部署到生产环境。如有问题，请参考：

- Vercel 文档: https://vercel.com/docs
- Supabase 文档: https://supabase.com/docs
- Next.js 文档: https://nextjs.org/docs
