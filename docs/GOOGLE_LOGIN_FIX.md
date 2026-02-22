# Google 登录问题修复指南

## 问题诊断

通过 Playwright 自动化测试，我们发现了 Google 登录按钮点击无反应的根本原因：

### 错误信息
```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

### 问题分析

1. **主要问题**: Google OAuth 提供商未在 Supabase 中启用
   - 按钮点击事件正常触发
   - Supabase API 调用成功发送
   - 但 Supabase 返回 400 错误，提示提供商未启用

2. **次要问题**: 环境变量端口配置不匹配
   - `.env.local` 中配置: `http://localhost:3000`
   - 实际服务器运行在: `http://localhost:3001`

## 修复步骤

### 步骤 1: 在 Supabase 中启用 Google OAuth

1. 访问 Supabase Dashboard: https://app.supabase.com

2. 选择你的项目: `bmfkefbqxciqibpenuid`

3. 导航到 **Authentication** > **Providers**

4. 找到 **Google** 提供商，点击启用

5. 配置 Google OAuth:
   - 你需要先在 Google Cloud Console 创建 OAuth 2.0 客户端
   - 获取 Client ID 和 Client Secret

### 步骤 2: 在 Google Cloud Console 配置 OAuth

1. 访问 Google Cloud Console: https://console.cloud.google.com

2. 创建或选择一个项目

3. 启用 Google+ API (如果还没启用)

4. 创建 OAuth 2.0 客户端 ID:
   - 转到 **APIs & Services** > **Credentials**
   - 点击 **Create Credentials** > **OAuth client ID**
   - 应用类型选择: **Web application**
   - 名称: `Pocket Room`

5. 配置授权重定向 URI:
   ```
   https://bmfkefbqxciqibpenuid.supabase.co/auth/v1/callback
   ```

6. 保存后获取:
   - Client ID
   - Client Secret

### 步骤 3: 在 Supabase 中配置 Google OAuth 凭据

1. 回到 Supabase Dashboard > Authentication > Providers > Google

2. 输入从 Google Cloud Console 获取的:
   - **Client ID**: 你的 Google OAuth Client ID
   - **Client Secret**: 你的 Google OAuth Client Secret

3. 确保 **Enabled** 开关已打开

4. 点击 **Save**

### 步骤 4: 修复环境变量端口配置

编辑 `apps/web/.env.local`:

```bash
# 如果你的服务器运行在 3001 端口
NEXT_PUBLIC_APP_URL=http://localhost:3001

# 或者，确保服务器运行在 3000 端口
# 停止当前服务器，然后运行:
# npm run dev:web -- -p 3000
```

### 步骤 5: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev:web
```

### 步骤 6: 测试 Google 登录

1. 访问 http://localhost:3000/login (或 3001)

2. 点击 "Continue with Google" 按钮

3. 应该会跳转到 Google 登录页面

4. 登录后会重定向回你的应用

## 验证修复

运行 Playwright 测试来验证修复:

```bash
# 运行诊断测试
npm run test:e2e -- google-login-simple.spec.ts

# 如果看到 "✅ 成功！已跳转到 Google 登录页面"，说明配置正确
```

## 常见问题

### Q: 仍然看到 400 错误？

A: 检查以下几点:
- Google OAuth 提供商在 Supabase 中是否真的启用了（开关是绿色的）
- Client ID 和 Secret 是否正确复制（没有多余的空格）
- 等待几分钟让 Supabase 配置生效

### Q: 跳转到 Google 后显示 "redirect_uri_mismatch"？

A: 在 Google Cloud Console 中添加正确的 Redirect URI:
```
https://bmfkefbqxciqibpenuid.supabase.co/auth/v1/callback
```

### Q: 登录成功但回调失败？

A: 检查 `apps/web/app/auth/callback/route.ts` 是否正确实现

## 测试文件

我们创建了两个 Playwright 测试文件来帮助诊断问题:

1. `tests/e2e/google-login-debug.spec.ts` - 详细的调试测试
2. `tests/e2e/google-login-simple.spec.ts` - 简化的诊断测试

运行测试:
```bash
# 运行简化诊断测试
npm run test:e2e -- google-login-simple.spec.ts

# 运行详细调试测试
npm run test:e2e -- google-login-debug.spec.ts --headed
```

## 相关文档

- [Supabase Google OAuth 文档](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [项目环境变量配置](./ENVIRONMENT_SETUP.md)

## 总结

问题的根本原因是 **Google OAuth 提供商未在 Supabase 中启用**。按钮本身工作正常，代码也没有问题，只是缺少了 Supabase 端的配置。

按照上述步骤配置后，Google 登录功能应该可以正常工作。
