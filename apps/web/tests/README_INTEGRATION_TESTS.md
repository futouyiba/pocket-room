# Integration Tests Setup

This document explains how to run integration tests that require a real Supabase database connection.

## Prerequisites

1. **Supabase Project**: You need a Supabase project (local or cloud)
2. **Environment Variables**: Configure the following in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Running Integration Tests

### Option 1: Local Supabase (Recommended for Development)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local Supabase:
```bash
supabase start
```

3. Apply migrations:
```bash
supabase db reset
```

4. Run integration tests:
```bash
npm run test -- companion-visibility.test.ts --run
```

### Option 2: Cloud Supabase (For CI/CD)

1. Create a test project on Supabase Cloud
2. Configure environment variables
3. Run migrations:
```bash
psql -h <host> -U <user> -d <database> -f docs/migrations/003_add_companion_visibility_rls.sql
```

4. Run integration tests:
```bash
npm run test -- companion-visibility.test.ts --run
```

## Test Files

### Unit Tests (No Database Required)

- `companion-visibility-unit.test.ts` - Tests visibility logic without database
- Run with: `npm run test -- companion-visibility-unit.test.ts --run`

### Integration Tests (Database Required)

- `companion-visibility.test.ts` - Tests RLS policies with real database
- Run with: `npm run test -- companion-visibility.test.ts --run`

## Troubleshooting

### Connection Errors

If you see `fetch failed` or `ECONNRESET` errors:

1. Check that Supabase is running (local) or accessible (cloud)
2. Verify environment variables are correct
3. Check network connectivity

### RLS Policy Errors

If tests fail due to RLS policy issues:

1. Ensure migrations are applied: `supabase db reset`
2. Check that RLS is enabled: `SELECT * FROM pg_policies WHERE tablename = 'messages';`
3. Verify the policy logic matches the expected behavior

### Test Data Cleanup

Integration tests create and cleanup test data automatically. If tests are interrupted:

```sql
-- Manually cleanup test data
DELETE FROM rooms WHERE name LIKE 'Test%';
DELETE FROM auth.users WHERE email LIKE '%@test.com';
```

## CI/CD Integration

For GitHub Actions or other CI/CD pipelines:

```yaml
- name: Setup Supabase
  run: |
    npm install -g supabase
    supabase start

- name: Run Integration Tests
  run: npm run test -- companion-visibility.test.ts --run
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## Best Practices

1. **Isolation**: Each test should create and cleanup its own data
2. **Idempotency**: Tests should be runnable multiple times
3. **Speed**: Use unit tests for logic, integration tests for RLS/database behavior
4. **Cleanup**: Always cleanup test data in `afterAll` hooks
