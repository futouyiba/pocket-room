# Authentication Context

This directory contains React Context providers for managing global application state.

## AuthContext

The `AuthContext` provides authentication state and methods throughout the application.

### Features

- **Global Authentication State**: Access user and session information from any component
- **Session Persistence**: Automatically persists sessions across browser restarts (handled by Supabase)
- **Route Protection**: Works with Next.js middleware to protect routes (see `middleware.ts`)
- **Type Safety**: Full TypeScript support with proper type definitions

### Usage

#### 1. Wrap your application with AuthProvider

The `AuthProvider` is already configured in the root layout (`app/layout.tsx`):

```tsx
import { AuthProvider } from '@/lib/contexts/auth-context'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

#### 2. Use the authentication context in components

```tsx
'use client'

import { useAuthContext } from '@/lib/contexts/auth-context'

export function MyComponent() {
  const { user, isAuthenticated, getUserId, getUserEmail } = useAuthContext()

  if (!isAuthenticated()) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <p>User ID: {getUserId()}</p>
    </div>
  )
}
```

### API Reference

#### AuthProvider

Props:
- `children: ReactNode` - Child components to wrap

#### useAuthContext()

Returns an object with:

- `user: AuthUser | null` - Current authenticated user
- `session: AuthSession | null` - Current session
- `isLoading: boolean` - Loading state
- `error: AuthError | null` - Authentication error
- `isAuthenticated: () => boolean` - Check if user is authenticated
- `getUserId: () => string | null` - Get current user ID
- `getUserEmail: () => string | null` - Get current user email

### Requirements Satisfied

This implementation satisfies the following requirements:

- **1.5**: Successful authentication creates session and redirects to Room List
  - Session creation is handled by Supabase Auth
  - Redirect is handled by `middleware.ts` and `app/auth/callback/route.ts`

- **1.6**: Session persists after browser close (cloud-based cross-device)
  - Supabase Auth automatically handles session persistence via cookies
  - Sessions are stored server-side and synced across devices

- **1.7**: Unauthenticated users redirected to login page
  - Route protection is implemented in `middleware.ts`
  - Protected routes: `/rooms`, `/basket`, `/settings`

### Architecture

```
┌─────────────────────────────────────────┐
│         Root Layout (app/layout.tsx)    │
│  ┌───────────────────────────────────┐  │
│  │        AuthProvider               │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │      useAuth Hook           │  │  │
│  │  │  - Manages auth state       │  │  │
│  │  │  - Listens to auth changes  │  │  │
│  │  │  - Auto-refreshes session   │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  Provides to all child components │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    ├─ Page Components
                    ├─ Layout Components
                    └─ Feature Components
                       (use useAuthContext)
```

### Related Files

- `lib/hooks/use-auth.ts` - Core authentication hook
- `lib/auth/gate-auth.ts` - Authentication functions
- `lib/auth/session.ts` - Session management utilities
- `middleware.ts` - Route protection middleware
- `app/auth/callback/route.ts` - OAuth callback handler
- `app/login/page.tsx` - Login page

### Testing

Tests are located in `tests/auth-context.test.tsx`:

- ✅ Provides authentication state to child components
- ✅ Throws error when used outside AuthProvider
- ✅ Provides authenticated user state when logged in

Run tests:
```bash
npm run test -- tests/auth-context.test.tsx
```

### Notes

- The `AuthProvider` must be used in a Client Component (marked with `'use client'`)
- The `useAuthContext` hook can only be used within components wrapped by `AuthProvider`
- Session persistence is handled automatically by Supabase - no additional configuration needed
- Route protection is handled by Next.js middleware - no need to check auth in every page
