# OAuth Provider Setup Guide

Complete guide for configuring all OAuth providers in Pocket Room.

## Overview

Pocket Room uses two types of OAuth:

1. **Gate Auth** - User authentication (login to Pocket Room)
   - Configured in Supabase Dashboard
   - Providers: Google, Email OTP, Feishu, WeChat

2. **Provider Binding** - AI service authorization (access to AI APIs)
   - Configured in `.env.local`
   - Providers: OpenAI, Google AI, Anthropic

## Gate Auth Setup (User Login)

### Email OTP (Easiest - No OAuth Required)

**Setup Time:** 2 minutes

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find "Email" and toggle it **ON**
5. (Optional) Customize email templates in **Authentication** > **Email Templates**

**No environment variables needed!**

**Test:**
- Go to `/login`
- Enter email address
- Check email for OTP code
- Enter code to log in

---

### Google OAuth

**Setup Time:** 10 minutes

#### Step 1: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. Create OAuth credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Name: "Pocket Room - Gate Auth"

5. Configure authorized redirect URIs:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
   
   For development, also add:
   ```
   http://localhost:54321/auth/v1/callback
   ```

6. Click **Create**
7. Copy **Client ID** and **Client Secret**

#### Step 2: Configure in Supabase

1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Find "Google" and toggle it **ON**
3. Paste **Client ID** and **Client Secret**
4. Click **Save**

#### Step 3: (Optional) Add to .env.local

```env
NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

**Test:**
- Go to `/login`
- Click "Sign in with Google"
- Authorize Pocket Room
- Should redirect to `/rooms`

---

### Feishu (Lark) OAuth

**Setup Time:** 15 minutes

#### Step 1: Create Feishu App

1. Go to [Feishu Open Platform](https://open.feishu.cn/)
2. Log in with Feishu account
3. Click **Create App** (创建应用)
4. Choose **Custom App** (自建应用)
5. Fill in app details:
   - App name: "Pocket Room"
   - Description: "Collaborative discussion platform"
   - Icon: Upload app icon

#### Step 2: Enable Login with Feishu

1. In your app dashboard, go to **Add Capabilities** (添加能力)
2. Enable **Login with Feishu** (飞书登录)
3. Configure redirect URI:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```

4. Request permissions:
   - `contact:user.base:readonly` (Read user basic info)
   - `contact:user.email:readonly` (Read user email)

5. Submit for review (if required)

#### Step 3: Get Credentials

1. Go to **Credentials & Basic Info** (凭证与基础信息)
2. Copy:
   - **App ID** (应用 ID)
   - **App Secret** (应用密钥)

#### Step 4: Configure in Supabase

1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Find "Feishu" (or add custom provider)
3. Paste **App ID** and **App Secret**
4. Click **Save**

**Note:** Supabase may not have built-in Feishu support. You may need to implement custom OAuth flow.

#### Step 5: Add to .env.local

```env
NEXT_PUBLIC_FEISHU_AUTH_APP_ID=cli_your_app_id
```

---

### WeChat OAuth

**Setup Time:** 20 minutes (requires business verification)

#### Step 1: Register WeChat Open Platform Account

1. Go to [WeChat Open Platform](https://open.weixin.qq.com/)
2. Register account (requires Chinese phone number)
3. Complete business verification (may take 1-3 days)

#### Step 2: Create Web Application

1. Log in to WeChat Open Platform
2. Go to **Management Center** (管理中心)
3. Click **Create Web Application** (创建网站应用)
4. Fill in application details:
   - Application name: "Pocket Room"
   - Application domain: `your-domain.com`
   - Description: Brief description

5. Submit for review (usually 1-2 days)

#### Step 3: Configure OAuth

1. After approval, go to application details
2. Configure authorization callback domain:
   ```
   your-project-id.supabase.co
   ```

3. Copy:
   - **AppID** (应用 ID)
   - **AppSecret** (应用密钥)

#### Step 4: Configure in Supabase

1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Add custom provider for WeChat
3. Configure OAuth endpoints:
   - Authorization URL: `https://open.weixin.qq.com/connect/qrconnect`
   - Token URL: `https://api.weixin.qq.com/sns/oauth2/access_token`
   - User Info URL: `https://api.weixin.qq.com/sns/userinfo`

4. Paste **AppID** and **AppSecret**
5. Click **Save**

#### Step 5: Add to .env.local

```env
NEXT_PUBLIC_WECHAT_AUTH_APP_ID=wx_your_app_id
```

**Note:** WeChat OAuth requires QR code scanning on mobile. Implement custom UI for best UX.

---

## Provider Binding Setup (AI Service Authorization)

### OpenAI OAuth

**Setup Time:** 10 minutes

**Important:** As of January 2024, OpenAI does not have public OAuth. You may need to use API keys instead or wait for OAuth support.

#### Alternative: API Key Method

1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Create new API key
3. Store securely in database (encrypted)
4. Skip OAuth flow, use API key directly

#### If OAuth becomes available:

1. Register OAuth application at OpenAI
2. Configure redirect URI:
   ```
   http://localhost:3000/api/oauth/callback/openai
   https://your-domain.com/api/oauth/callback/openai
   ```

3. Add to `.env.local`:
   ```env
   OPENAI_CLIENT_ID=your_openai_client_id
   OPENAI_CLIENT_SECRET=your_openai_client_secret
   OPENAI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/openai
   ```

---

### Google AI (Gemini) OAuth

**Setup Time:** 15 minutes

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Pocket Room - AI Binding"
3. Enable **Generative Language API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Generative Language API"
   - Click **Enable**

#### Step 2: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: "Pocket Room - Google AI Binding"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/oauth/callback/google
   https://your-domain.com/api/oauth/callback/google
   ```

6. Click **Create**
7. Copy **Client ID** and **Client Secret**

#### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. User type: **External**
3. Fill in app information:
   - App name: "Pocket Room"
   - User support email: your email
   - Developer contact: your email

4. Add scopes:
   - `https://www.googleapis.com/auth/generative-language`
   - `openid`
   - `email`
   - `profile`

5. Add test users (for development)
6. Submit for verification (for production)

#### Step 4: Add to .env.local

```env
GOOGLE_AI_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_AI_CLIENT_SECRET=your_client_secret
GOOGLE_AI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/google
```

**Test:**
- Log in to Pocket Room
- Go to Settings > Provider Binding
- Click "Connect Google AI"
- Authorize access
- Should see "Connected" status

---

### Anthropic OAuth

**Setup Time:** 10 minutes

**Important:** As of January 2024, Anthropic may not have public OAuth. Check [Anthropic Console](https://console.anthropic.com/) for latest auth methods.

#### If OAuth is available:

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create OAuth application
3. Configure redirect URI:
   ```
   http://localhost:3000/api/oauth/callback/anthropic
   https://your-domain.com/api/oauth/callback/anthropic
   ```

4. Copy **Client ID** and **Client Secret**

5. Add to `.env.local`:
   ```env
   ANTHROPIC_CLIENT_ID=your_anthropic_client_id
   ANTHROPIC_CLIENT_SECRET=your_anthropic_client_secret
   ANTHROPIC_REDIRECT_URI=http://localhost:3000/api/oauth/callback/anthropic
   ```

#### Alternative: API Key Method

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Generate API key
3. Store securely in database (encrypted)
4. Use API key directly (no OAuth)

---

## OAuth Security Best Practices

### 1. Use PKCE for Provider Binding

All Provider Binding OAuth flows MUST use PKCE (Proof Key for Code Exchange):

```typescript
// Generate code verifier
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Generate code challenge
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Include in authorization request
const authUrl = `${provider.authUrl}?` +
  `client_id=${clientId}&` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256&` +
  `state=${state}`;
```

### 2. Validate State Parameter

Always validate the `state` parameter to prevent CSRF attacks:

```typescript
// Generate state
const state = crypto.randomBytes(16).toString('hex');
// Store in session

// Validate on callback
if (callbackState !== storedState) {
  throw new Error('Invalid state parameter');
}
```

### 3. Secure Token Storage

Encrypt tokens before storing in database:

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'base64');

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

### 4. Rotate Secrets Regularly

- Rotate OAuth secrets every 90 days
- Rotate encryption keys every 180 days
- Notify users to re-authorize after rotation

### 5. Limit OAuth Scopes

Only request minimum required scopes:

**Good:**
```
scopes: ['openid', 'email', 'profile']
```

**Bad:**
```
scopes: ['openid', 'email', 'profile', 'drive', 'calendar', ...]
```

---

## Troubleshooting

### "Redirect URI mismatch"

**Problem:** OAuth provider rejects redirect URI

**Solution:**
1. Verify URI matches exactly (including http/https, port, path)
2. Check for trailing slashes
3. Ensure URI is registered in provider dashboard
4. For localhost, use `http://` not `https://`

### "Invalid client"

**Problem:** Client ID or Secret is incorrect

**Solution:**
1. Double-check credentials in provider dashboard
2. Ensure no extra spaces or newlines
3. Regenerate credentials if corrupted
4. Restart server after updating `.env.local`

### "Access denied"

**Problem:** User denied authorization or app not approved

**Solution:**
1. Check OAuth consent screen is configured
2. Verify app is not in "Testing" mode (or add test users)
3. Submit app for verification if required
4. Check user has necessary permissions

### "Token expired"

**Problem:** Access token expired and refresh failed

**Solution:**
1. Implement automatic token refresh
2. Check refresh token is stored correctly
3. Verify refresh token hasn't expired
4. Prompt user to re-authorize if refresh fails

### "CORS error"

**Problem:** Browser blocks OAuth callback

**Solution:**
1. Ensure `NEXT_PUBLIC_APP_URL` matches actual URL
2. Check OAuth provider allows your domain
3. Verify redirect URI uses same protocol (http/https)
4. Check browser doesn't block third-party cookies

---

## Testing OAuth Flows

### Manual Testing

1. **Gate Auth:**
   ```bash
   # Start dev server
   npm run dev
   
   # Navigate to login page
   open http://localhost:3000/login
   
   # Try each provider
   ```

2. **Provider Binding:**
   ```bash
   # Log in first
   # Navigate to settings
   open http://localhost:3000/settings
   
   # Click "Connect Provider"
   # Complete OAuth flow
   ```

### Automated Testing

```typescript
// Mock OAuth provider for testing
import { mockOAuthProvider } from '@/tests/mocks/oauth';

describe('OAuth Flow', () => {
  it('should complete OAuth flow', async () => {
    const provider = mockOAuthProvider('google');
    
    // Start OAuth flow
    const authUrl = await provider.startLogin();
    
    // Simulate callback
    const tokens = await provider.handleCallback(code, state);
    
    expect(tokens.accessToken).toBeDefined();
  });
});
```

---

## Production Checklist

Before deploying to production:

- [ ] All OAuth apps submitted for verification
- [ ] Production redirect URIs configured
- [ ] Secrets stored in deployment platform (Vercel, etc.)
- [ ] Different credentials for dev/staging/production
- [ ] OAuth consent screens configured with privacy policy
- [ ] Token encryption key is secure and backed up
- [ ] Rate limiting configured for OAuth endpoints
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] OAuth flows tested end-to-end
- [ ] Token refresh logic tested
- [ ] Revocation endpoints implemented

---

## Additional Resources

- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)

---

**Last Updated:** 2024-01-XX  
**Version:** 1.0
