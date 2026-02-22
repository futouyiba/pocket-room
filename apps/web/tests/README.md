# RLS Property-Based Tests

This directory contains property-based tests for Row Level Security (RLS) policies using Vitest and fast-check.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for test setup)

3. **Ensure RLS policies are enabled:**
   The tests assume that all RLS policies from `docs/db.sql` have been applied to your Supabase database.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Property 43: RLS 强制表级隔离
**Validates: Requirements 17.1, 17.5**

Tests that unauthorized users receive empty result sets (not errors) when querying resources they don't have access to.

### Property 44: 消息 RLS 成员检查
**Validates: Requirements 17.2**

Tests that:
1. Users can only see messages from rooms they are members of
2. Users can only see messages created after they joined the room

### Property 45: 资源所有权 RLS
**Validates: Requirements 17.3**

Tests that users can only access and modify their own:
- Provider connections
- AI companions

### Property 46: Invocation RLS 成员检查
**Validates: Requirements 17.4**

Tests that users can only see AI invocations from rooms they are members of.

## Test Configuration

Each property test runs **100 iterations** with randomly generated test data using fast-check arbitraries.

## Troubleshooting

### Authentication Errors

If you see authentication errors, ensure:
1. Your Supabase service role key is correct
2. Your Supabase project is accessible
3. RLS policies are properly configured

### Test Failures

If tests fail:
1. Check that all RLS policies from `docs/db.sql` are applied
2. Verify your database schema matches the expected structure
3. Check the test output for specific assertion failures

### Cleanup Issues

Tests automatically clean up created resources. If you see orphaned test data:
1. Check for test interruptions (Ctrl+C during test runs)
2. Manually clean up test users with emails matching `test-user-*@example.com`

## Notes

- Tests use the service role key to bypass RLS for test setup
- User clients are created with proper authentication to test RLS enforcement
- All test data is cleaned up after each test run
- Tests are isolated and can run in parallel
