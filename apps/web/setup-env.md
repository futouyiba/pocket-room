# 🚀 快速环境配置指南

## ✅ 已完成的配置

- ✅ Project URL: `https://bmfkefbqxciqibpenuid.supabase.co`
- ✅ Publishable Key: `sb_publishable_hDyw9_R4TQQZRVJCSbwgRA_pW538vsI`
- ✅ Token Encryption Key: 已自动生成

## ⚠️ 还需要配置：Secret Key

### 什么是 Secret Key？

Supabase 新的密钥系统：
- **Publishable Key** (已配置) - 用于客户端，安全暴露在前端代码中
- **Secret Key** (需要配置) - 用于服务器端，拥有完全权限，替代旧的 service_role key

### 获取 Secret Key 的步骤

1. 访问：https://supabase.com/dashboard/project/bmfkefbqxciqibpenuid/settings/api

2. 点击 **API Keys** 标签页（不是 Legacy API Keys）

3. 如果没有 Secret Key，点击 **"Create new API Keys"** 按钮

4. 复制 **Secret key** 的值（格式：`sb_secret_...`）

5. 打开 `apps/web/.env.local` 文件

6. 替换这一行：
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_secret_key_here
   ```
   改为：
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_你的密钥
   ```

### 关于新旧密钥系统

**新系统（推荐）：**
- ✅ Publishable Key (`sb_publishable_...`) - 已配置
- ⚠️ Secret Key (`sb_secret_...`) - 需要你添加

**旧系统（Legacy，仍可用）：**
- Legacy anon key - 已在 `.env.local` 中注释备用
- Legacy service_role key - 如果没有 secret key，可以用这个

如果你在 API Keys 页面找不到 Secret Key 选项，可以使用 Legacy API Keys 标签页中的 `service_role` key。

## 🚀 启动应用

配置完成后，重启开发服务器：

```bash
# 方式 1: 使用 VS Code 调试
按 F5，选择 "Next.js: 全栈调试"

# 方式 2: 使用命令行
cd apps/web
npm run dev
```

访问 http://localhost:3000，应该不再看到 Supabase 错误了！

## 📚 参考资料

- [Supabase API Keys 文档](https://supabase.com/docs/guides/api/api-keys) - 新旧密钥系统对比
- Publishable Key 是 Supabase 2024 年推出的新系统，更安全且易于管理
