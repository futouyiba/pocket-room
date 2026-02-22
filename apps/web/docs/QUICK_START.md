# Quick Start Guide

Get Pocket Room running locally in 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up free](https://supabase.com))
- Git

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd pocket-room

# Install dependencies
cd apps/web
npm install
```

## Step 2: Set Up Supabase

### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project to be ready (~2 minutes)

### Run Database Migrations

```bash
# Initialize Supabase CLI (if not already done)
npx supabase init

# Link to your project
npx supabase link --project-ref your-project-id

# Run migrations
npx supabase db push
```

Alternatively, run the SQL directly:
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `docs/db.sql`
3. Click "Run"

### Get API Keys

1. Go to **Project Settings** > **API**
2. Copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

## Step 3: Configure Environment Variables

```bash
# Copy example file
cp .env.local.example .env.local

# Edit .env.local
nano .env.local  # or use your preferred editor
```

**Minimum required configuration:**

```env
# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Token encryption (generate new key)
TOKEN_ENCRYPTION_KEY=your_generated_key_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 4: Enable Authentication Providers

### Option A: Email OTP (Easiest)

1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Enable "Email" provider
3. Done! No additional configuration needed

### Option B: Google OAuth (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
4. Copy Client ID and Secret
5. Go to Supabase Dashboard > **Authentication** > **Providers**
6. Enable "Google" and paste credentials
7. Save

## Step 5: Run the App

```bash
# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Test Authentication

1. Navigate to `/login`
2. Try logging in with Email OTP or Google (whichever you configured)
3. Check that you're redirected to `/rooms` after login

## Verify Installation

Run the test suite:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:rls
```

## Common Issues

### "Cannot connect to Supabase"

**Solution:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is running (not paused)
- Restart dev server: `npm run dev`

### "Authentication failed"

**Solution:**
- Verify OAuth provider is enabled in Supabase Dashboard
- Check redirect URI matches exactly
- Clear browser cookies and try again

### "Database error"

**Solution:**
- Verify migrations ran successfully
- Check RLS policies are enabled
- Review Supabase logs in Dashboard

## Next Steps

### Configure AI Provider Binding (Optional)

To enable Companion features:

1. Set up OpenAI OAuth (see `ENVIRONMENT_SETUP.md`)
2. Add credentials to `.env.local`:
   ```env
   OPENAI_CLIENT_ID=your_client_id
   OPENAI_CLIENT_SECRET=your_client_secret
   OPENAI_REDIRECT_URI=http://localhost:3000/api/oauth/callback/openai
   ```
3. Restart server

### Explore the App

- **Create a Room:** Click "New Room" on `/rooms`
- **Invite users:** Add email addresses when creating
- **Send messages:** Try Markdown, code blocks, and images
- **Register Companion:** Go to Settings > Companions (requires Provider Binding)

### Read Documentation

- `ENVIRONMENT_SETUP.md` - Detailed environment variable guide
- `design.md` - System architecture and design decisions
- `requirements.md` - Feature requirements and acceptance criteria
- `tasks.md` - Implementation plan and task list

## Development Workflow

### Running Tests

```bash
# Watch mode (recommended during development)
npm run test:watch

# Run once
npm test

# With coverage
npm run test:coverage
```

### Database Changes

```bash
# Create new migration
npx supabase migration new your_migration_name

# Apply migrations
npx supabase db push

# Reset database (WARNING: deletes all data)
npx supabase db reset
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

## Getting Help

- **Documentation:** Check `apps/web/docs/` folder
- **Issues:** Search existing issues or create new one
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

## Production Deployment

See `DEPLOYMENT.md` for production deployment guide (Vercel + Supabase Cloud).

---

**Estimated Setup Time:** 5-10 minutes  
**Difficulty:** Beginner-friendly  
**Last Updated:** 2024-01-XX
