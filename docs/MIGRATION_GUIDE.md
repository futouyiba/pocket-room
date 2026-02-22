# Database Migration Guide - Sprint 1

## Overview

This guide explains how to apply the Sprint 1 database schema to your Supabase project.

## Prerequisites

1. A Supabase project (create one at https://supabase.com if you don't have one)
2. Supabase CLI installed (optional, for local development)
3. Access to your Supabase project dashboard

## Method 1: Using Supabase Dashboard (Recommended for Quick Setup)

### Step 1: Access SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Execute Schema

1. Copy the entire contents of `docs/db.sql`
2. Paste into the SQL Editor
3. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Step 3: Verify Tables

1. Navigate to **Table Editor** in the left sidebar
2. Verify that all tables have been created:
   - rooms
   - invitations
   - room_members
   - join_requests
   - room_blacklist
   - messages
   - segments
   - segment_messages
   - provider_connections
   - ai_companions
   - companion_whitelist
   - ai_invocations

### Step 4: Enable Realtime (Important!)

1. Navigate to **Database** → **Replication** in the left sidebar
2. Enable replication for the following tables:
   - `messages`
   - `room_members`
   - `join_requests`
   - `ai_invocations`

## Method 2: Using Supabase CLI (Recommended for Development)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Initialize Supabase (if not already done)

```bash
# In your project root
supabase init
```

### Step 3: Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in the Supabase dashboard URL:
`https://app.supabase.com/project/[your-project-ref]`

### Step 4: Create Migration File

```bash
# Create a new migration
supabase migration new sprint1_schema
```

This will create a file in `supabase/migrations/` directory.

### Step 5: Copy Schema to Migration

Copy the contents of `docs/db.sql` into the newly created migration file.

### Step 6: Apply Migration

```bash
# Apply to local database (for development)
supabase db reset

# Or push to remote database
supabase db push
```

### Step 7: Enable Realtime

Add the following to your migration file or run separately:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_invocations;
```

## Method 3: Local Development with Docker

### Step 1: Start Local Supabase

```bash
supabase start
```

This will start a local Supabase instance with Docker.

### Step 2: Apply Schema

```bash
supabase db reset
```

This will apply all migrations in the `supabase/migrations/` directory.

### Step 3: Access Local Dashboard

The local Supabase dashboard will be available at:
- API URL: http://localhost:54321
- Dashboard: http://localhost:54323

## Environment Variables

After setting up the database, update your `.env.local` file (create from `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in:
**Supabase Dashboard** → **Settings** → **API**

## Verification

### Check Tables

Run this query in the SQL Editor to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- ai_companions
- ai_invocations
- companion_whitelist
- invitations
- join_requests
- messages
- provider_connections
- room_blacklist
- room_members
- rooms
- segment_messages
- segments

### Check RLS Policies

Run this query to verify RLS is enabled:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### Check Indexes

Run this query to verify indexes:

```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## Troubleshooting

### Error: "relation already exists"

If you see this error, it means some tables already exist. You have two options:

1. **Drop existing tables** (⚠️ This will delete all data):
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
   Then re-run the schema.

2. **Modify the schema** to only create missing tables.

### Error: "permission denied"

Make sure you're using the correct credentials and have admin access to the database.

### Realtime Not Working

1. Check that tables are added to the `supabase_realtime` publication
2. Verify that RLS policies allow the user to read the data
3. Check browser console for WebSocket connection errors

## Next Steps

After successfully applying the migration:

1. ✅ Verify all tables are created
2. ✅ Verify RLS policies are enabled
3. ✅ Enable Realtime for required tables
4. ✅ Update environment variables
5. ✅ Test database connection from the web app
6. ✅ Run any seed data scripts (if available)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Schema Version

- **Version**: 1.0
- **Sprint**: Sprint 1
- **Date**: 2024-01-XX
- **Design Document**: `.kiro/specs/sprint1-pocket-room/design.md`
