# Gate Auth - Authentication System

Gate Auth is the user authentication system for Pocket Room, built on Supabase Auth.

## Features

- **Multiple Login Methods**:
  - Google OAuth (Requirement 1.1)
  - Email OTP (One-Time Password) (Requirement 1.2)
  - Feishu (Lark) OAuth (Requirement 1.3)
  - WeChat OAuth (Requirement 1.4)

- **Session Management**:
  - Persistent sessions across browser close (Requirement 1.6)
  - Automatic session refresh
  - Session validation and expiration checks

- **Route Protection**:
  - Automatic redirect for unauthenticated users (Requirement 1.7)
  - Middleware-based route protection
  - Protected and public route configuration

## Architecture

```
lib/
├── auth/
│   ├── gate-auth.ts      # Core authentication functions
│   ├── session.ts        # Session management utilities
│   ├── index.ts          # Public API exports
│   └── README.md         # This file
├── supabase/
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server clients
│   ├── types.ts          # Type definitions
│   └── index.ts          # Public API exports
└── hooks/
    └── use-auth.ts       # React hook for auth state
```

## Usage

### Client-Side Authentication

#### Using the useAuth Hook

```typescript
'use client'

import { useAuth } from '@/lib/hooks/use-auth'

export function MyComponent() {
  const { user, session, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated()) {
    return <div>Please log in</div>
  }

  return <div>Welcome, {user?.email}</div>
}
```

#### Sign In with Google

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { signInWithGoogle } from '@/lib/auth'

export function GoogleLoginButton() {
  const handleLogin = async () => {
    const supabase = createClient()
    const { url, error } = await signInWithGoogle(supabase)

    if (error) {
      console.error('Login failed:', error)
      return
    }

    if (url) {
      window.location.href = url
    }
  }

  return <button onClick={handleLogin}>Sign in with Google</button>
}
```

#### Sign In with Email OTP

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendEmailOTP, verifyEmailOTP } from '@/lib/auth'

export function EmailOTPLogin() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'verify'>('email')

  const supabase = createClient()

  const handleSendOTP = async () => {
    const { success, error } = await sendEmailOTP(supabase, { email })

    if (error) {
      console.error('Failed to send OTP:', error)
      return
    }

    setStep('verify')
  }

  const handleVerifyOTP = async () => {
    const { success, error } = await verifyEmailOTP(supabase, {
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      console.error('Verification failed:', error)
      return
    }

    // User is now logged in
    window.location.href = '/rooms'
  }

  if (step === 'email') {
    return (
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <button onClick={handleSendOTP}>Send OTP</button>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
      />
      <button onClick={handleVerifyOTP}>Verify</button>
    </div>
  )
}
```

#### Sign Out

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth'

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient()
    const { success, error } = await signOut(supabase)

    if (error) {
      console.error('Sign out failed:', error)
      return
    }

    window.location.href = '/login'
  }

  return <button onClick={handleSignOut}>Sign Out</button>
}
```

### Server-Side Authentication

#### In Server Components

```typescript
import { createServerComponentClient } from '@/lib/supabase/server'
import { getSession, isSessionValid } from '@/lib/auth'

export default async function MyServerComponent() {
  const supabase = await createServerComponentClient()
  const { session } = await getSession(supabase)

  if (!isSessionValid(session)) {
    return <div>Please log in</div>
  }

  return <div>Welcome, {session.user.email}</div>
}
```

#### In Server Actions

```typescript
'use server'

import { createServerComponentClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function myServerAction() {
  const supabase = await createServerComponentClient()
  
  // Throws error if not authenticated
  await requireAuth(supabase)

  // Your protected logic here
}
```

#### In API Routes

```typescript
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { getSession, isSessionValid } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()
  const { session } = await getSession(supabase)

  if (!isSessionValid(session)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({ user: session.user })
}
```

## Session Management

### Check Session Validity

```typescript
import { isSessionValid } from '@/lib/auth'

const valid = isSessionValid(session)
```

### Check if Session is Expiring Soon

```typescript
import { isSessionExpiringSoon } from '@/lib/auth'

const expiringSoon = isSessionExpiringSoon(session)
```

### Get Session Info

```typescript
import { getSessionInfo } from '@/lib/auth'

const info = getSessionInfo(session)
// { accessToken, refreshToken, expiresAt, user }
```

### Refresh Session

```typescript
import { createClient } from '@/lib/supabase/client'
import { refreshSession } from '@/lib/auth'

const supabase = createClient()
const { session, error } = await refreshSession(supabase)
```

## Route Protection

Routes are protected using Next.js middleware. Configure protected routes in `middleware.ts`:

```typescript
const PROTECTED_ROUTES = [
  '/rooms',
  '/basket',
  '/settings',
]
```

Unauthenticated users accessing protected routes are automatically redirected to `/login`.

## Error Handling

All auth functions return errors in a consistent format:

```typescript
interface AuthError {
  code: string
  message: string
  details?: any
}
```

Common error codes:

- `AUTH_PROVIDER_UNAVAILABLE`: Service is unavailable
- `AUTH_OAUTH_FAILED`: OAuth flow failed
- `AUTH_EMAIL_OTP_FAILED`: Email OTP sending failed
- `AUTH_OTP_INVALID`: OTP verification failed
- `AUTH_SESSION_EXPIRED`: Session has expired
- `AUTH_UNAUTHORIZED`: User is not authenticated
- `AUTH_CALLBACK_INVALID`: OAuth callback is invalid

## Configuration

### Environment Variables

Required environment variables (see `.env.local.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase Dashboard Configuration

1. **Enable Auth Providers**:
   - Go to Authentication > Providers
   - Enable Google, Email, and custom providers (Feishu, WeChat)
   - Configure OAuth client IDs and secrets

2. **Configure Redirect URLs**:
   - Add `http://localhost:3000/auth/callback` (development)
   - Add `https://your-domain.com/auth/callback` (production)

3. **Email Templates** (for Email OTP):
   - Customize email templates in Authentication > Email Templates

## Testing

See `tests/auth.test.ts` for unit tests and property-based tests.

## Requirements Mapping

- **Requirement 1.1**: Google OAuth login - `signInWithGoogle()`
- **Requirement 1.2**: Email OTP login - `sendEmailOTP()`, `verifyEmailOTP()`
- **Requirement 1.3**: Feishu OAuth login - `signInWithFeishu()`
- **Requirement 1.4**: WeChat login - `signInWithWeChat()`
- **Requirement 1.5**: Session creation and redirect - Auth callback handler
- **Requirement 1.6**: Session persistence - Supabase Auth + session utilities
- **Requirement 1.7**: Route protection - Middleware + `requireAuth()`
- **Requirement 1.8**: Error handling - Consistent error format

## Security Considerations

1. **Never expose service role key to client**: Only use in server-side code
2. **Session tokens are httpOnly cookies**: Managed by Supabase
3. **CSRF protection**: Handled by Supabase Auth
4. **Session refresh**: Automatic via Supabase client
5. **Route protection**: Enforced by middleware

## Future Enhancements

- Multi-factor authentication (MFA)
- Social login with more providers
- Custom email templates
- Rate limiting for auth endpoints
- Audit logging for auth events
