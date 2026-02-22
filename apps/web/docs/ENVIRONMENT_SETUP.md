# Environment Variables Setup Guide

This guide explains how to configure all environment variables required for Pocket Room Sprint 1.

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your actual values in `.env.local`

3. **Never commit `.env.local` to version control** (it's already in `.gitignore`)

## Required Variables

### 1. Supabase Configuration

**Where to get these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Project Settings** > **API**

**Variables:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- `NEXT_PUBLIC_*` variables are exposed to the browser (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` is **server-side only** - never expose to client
- The service role key bypasses Row Level Security - use with caution

### 2. Token Encryption Key

**Purpose:** Encrypts OAuth tokens before storing in database

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Variable:**
```env
TOKEN_ENCRYPTION_KEY=your_32_byte_base64_encoded_key_here
```

**Important:**
- Must be exactly 32 bytes (256 bits)
- Keep this secret safe - if lost, all stored tokens become unrecoverable
- Use different keys for development and production

### 3. Next.js Configuration

**Variables:**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**For production:**
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## OAuth Provider Setup

Pocket Room uses two types of OAuth:
1. **Gate Auth** - User authentication (login)
2. **Provider Binding** - AI service authorization (API access)

### Gate Auth Providers (User Login)

These are configured in **Supabase Dashboard** > **Authentication** > **Providers**

#### Google OAuth

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret
5. Add to Supabase Dashboard (not .env.local)

**Variable (optional for client-side):**
```env
NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID=your_google_client_id
```

#### Feishu (Lark) OAuth

**Setup:**
1. Go to [Feishu Open Platform](https://open.feishu.cn/app)
2. Create a new app
3. Enable "Login with Feishu"
4. Set redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy App ID and Secret
6. Add to Supabase Dashboard

**Variable (optional):**
```env
NEXT_PUBLIC_FEISHU_AUTH_APP_ID=your_feishu_app_id
```

#### WeChat OAuth

**Setup:**
1. Go to [WeChat Open Platform](https://open.weixin.qq.com/)
2. Register as a developer
3. Create a web application
4. Set redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy App ID and Secret
6. Add to Supabase Dashboard

**Variable (optional):**
```env
NEXT_PUBLIC_WECHAT_AUTH_APP_ID=your_wechat_app_id
```

#### Email OTP

**Setup:**
1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Enable "Email" provider
3. Configure email templates (optional)
4. No additional environment variables needed

### Provider Binding (AI Service Authorization)

These are configured in your `.env.local` file for OAuth 2.0 + PKCE flow.

#### OpenAI OAuth

**Setup:**
1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Create OAuth application (if available)
3. Set redirect URI: `http://localhost:3000/api/oauth/callback/openai`
4. Copy Client ID and Secret

**Variables:**
```env
OPENAI_CLIENT_ID=your_openai_client_id
OPENAI_CLIENT_SECRET=your_openai_client_secret
OPENAI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/openai
```

**Note:** As of 2024, OpenAI may not have public OAuth. You may need to use API keys instead. Check OpenAI documentation for latest auth methods.

#### Google AI (Gemini) OAuth

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (separate from Gate Auth)
3. Enable Google AI API
4. Set redirect URI: `http://localhost:3000/api/oauth/callback/google`
5. Copy Client ID and Secret

**Variables:**
```env
GOOGLE_AI_CLIENT_ID=your_google_ai_client_id
GOOGLE_AI_CLIENT_SECRET=your_google_ai_client_secret
GOOGLE_AI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/google
```

#### Anthropic OAuth

**Setup:**
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create OAuth application (if available)
3. Set redirect URI: `http://localhost:3000/api/oauth/callback/anthropic`
4. Copy Client ID and Secret

**Variables:**
```env
ANTHROPIC_CLIENT_ID=your_anthropic_client_id
ANTHROPIC_CLIENT_SECRET=your_anthropic_client_secret
ANTHROPIC_REDIRECT_URI=http://localhost:3000/api/oauth/callback/anthropic
```

**Note:** Check Anthropic documentation for latest OAuth support.

## Optional Variables

### Feature Flags

Control which features are enabled:

```env
NEXT_PUBLIC_ENABLE_BROWSER_EXTENSION=true
NEXT_PUBLIC_ENABLE_COMPANION=true
NEXT_PUBLIC_ENABLE_SEGMENT_SHARING=true
```

### Logging

```env
LOG_LEVEL=info  # debug, info, warn, error
```

### Rate Limiting

```env
RATE_LIMIT_API=60              # API requests per minute
RATE_LIMIT_AUTH=10             # Auth requests per minute
RATE_LIMIT_AI_INVOCATION=20    # AI invocations per minute
```

### Error Tracking (Production)

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Environment-Specific Configuration

### Development (.env.local)

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug

# Use localhost redirect URIs
OPENAI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/openai
GOOGLE_AI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/google
```

### Production (.env.production)

```env
NEXT_PUBLIC_APP_URL=https://pocketroom.app
NODE_ENV=production
LOG_LEVEL=info

# Use production redirect URIs
OPENAI_REDIRECT_URI=https://pocketroom.app/api/oauth/callback/openai
GOOGLE_AI_REDIRECT_URI=https://pocketroom.app/api/oauth/callback/google

# Enable error tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Testing (.env.test)

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key
NODE_ENV=test
LOG_LEVEL=error
```

## Security Best Practices

### 1. Never Commit Secrets

- `.env.local` is in `.gitignore` - keep it that way
- Never commit API keys, secrets, or tokens to version control
- Use environment variables in CI/CD (GitHub Secrets, Vercel Environment Variables)

### 2. Separate Keys for Each Environment

- Use different Supabase projects for dev/staging/production
- Use different OAuth apps for each environment
- Use different encryption keys for each environment

### 3. Rotate Keys Regularly

- Rotate `TOKEN_ENCRYPTION_KEY` periodically (requires re-authorization)
- Rotate OAuth secrets if compromised
- Rotate Supabase service role key if exposed

### 4. Principle of Least Privilege

- Only use `SUPABASE_SERVICE_ROLE_KEY` when absolutely necessary
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations
- Rely on Row Level Security (RLS) policies for access control

### 5. Monitor for Leaks

- Use tools like `git-secrets` to prevent accidental commits
- Scan dependencies for vulnerabilities
- Monitor logs for exposed secrets

## Troubleshooting

### "Invalid Supabase URL"

**Problem:** `NEXT_PUBLIC_SUPABASE_URL` is incorrect or missing

**Solution:**
1. Check Supabase Dashboard > Project Settings > API
2. Ensure URL format: `https://your-project-id.supabase.co`
3. Restart Next.js dev server after changing `.env.local`

### "Authentication failed"

**Problem:** OAuth provider not configured correctly

**Solution:**
1. Verify redirect URIs match exactly (including http/https)
2. Check OAuth credentials are correct
3. Ensure provider is enabled in Supabase Dashboard (for Gate Auth)
4. Check browser console for detailed error messages

### "Token encryption failed"

**Problem:** `TOKEN_ENCRYPTION_KEY` is invalid or missing

**Solution:**
1. Generate a new key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Ensure key is exactly 32 bytes (base64 encoded)
3. Restart server after updating

### "CORS error"

**Problem:** `NEXT_PUBLIC_APP_URL` doesn't match actual URL

**Solution:**
1. Update `NEXT_PUBLIC_APP_URL` to match your actual URL
2. Update OAuth redirect URIs in provider dashboards
3. Restart server

## Verification Checklist

Before running the app, verify:

- [ ] `.env.local` file exists and is not committed
- [ ] All required Supabase variables are set
- [ ] `TOKEN_ENCRYPTION_KEY` is generated and set
- [ ] `NEXT_PUBLIC_APP_URL` matches your actual URL
- [ ] At least one Gate Auth provider is configured (Google, Email, Feishu, or WeChat)
- [ ] OAuth redirect URIs match in both `.env.local` and provider dashboards
- [ ] Server restarted after changing environment variables

## Next Steps

After configuring environment variables:

1. **Test Supabase connection:**
   ```bash
   npm run test:db
   ```

2. **Test authentication:**
   - Start dev server: `npm run dev`
   - Navigate to `/login`
   - Try logging in with configured providers

3. **Test Provider Binding:**
   - Log in to the app
   - Navigate to Settings > Provider Binding
   - Try connecting an AI provider

## Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [OAuth 2.0 Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE Flow Explained](https://oauth.net/2/pkce/)

---

**Last Updated:** 2024-01-XX  
**Version:** 1.0  
**Related Documents:**
- `.env.local.example` - Template file
- `design.md` - System architecture
- `requirements.md` - Feature requirements
