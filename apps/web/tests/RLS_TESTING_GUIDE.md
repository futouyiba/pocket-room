# RLS Property-Based Testing Guide

## Overview

This guide explains the property-based tests for Row Level Security (RLS) policies in Pocket Room Sprint 1.

## What are Property-Based Tests?

Property-based tests verify that certain properties (invariants) hold true across a wide range of inputs. Unlike example-based tests that check specific cases, property-based tests:

1. Generate random test data using arbitraries
2. Run the same test with many different inputs (100 iterations)
3. Automatically find edge cases that break the properties
4. Shrink failing cases to minimal examples

## Test Properties

### Property 43: RLS 强制表级隔离

**Property Statement:**
> 对于任意启用 RLS 的表，未授权用户的查询应该返回空结果集，不应该返回权限错误或泄露资源存在性。

**Why This Matters:**
- Prevents information leakage (attackers can't tell if a resource exists)
- Provides consistent behavior across all tables
- Follows security best practices (fail closed, not open)

**Test Strategy:**
1. Create a resource owned by User1
2. User2 (unauthorized) attempts to query the resource
3. Verify: No error returned, empty result set

**Tables Tested:**
- rooms
- messages
- room_members
- segments
- ai_companions
- provider_connections
- ai_invocations

### Property 44: 消息 RLS 成员检查

**Property Statement:**
> 对于任意 messages 表的 SELECT 查询，RLS 策略应该确保：(1) 用户是 Room Member，(2) message.created_at >= room_member.joined_at

**Why This Matters:**
- Protects conversation privacy
- Implements "后加入成员消息可见性" requirement
- Prevents historical message access by new members

**Test Strategy:**
1. Create messages before User2 joins
2. User2 joins the room
3. Create messages after User2 joins
4. Verify: User2 only sees messages created after joining

**Edge Cases Tested:**
- Various numbers of messages before/after join
- Non-members attempting to access messages
- Exact timestamp boundaries

### Property 45: 资源所有权 RLS

**Property Statement:**
> 对于任意 ai_companions 或 provider_connections 表的查询或修改操作，RLS 策略应该确保 owner_id = auth.uid()

**Why This Matters:**
- Prevents unauthorized access to sensitive credentials
- Protects user privacy (AI provider tokens)
- Prevents companion hijacking

**Test Strategy:**
1. User1 creates a resource (companion or connection)
2. User2 attempts to read/update/delete the resource
3. Verify: User2 cannot modify the resource

**Special Cases:**
- AI companions are visible for display (SELECT allowed)
- But only owners can UPDATE or DELETE
- Provider connections are completely private

### Property 46: Invocation RLS 成员检查

**Property Statement:**
> 对于任意 ai_invocations 表的 SELECT 查询，RLS 策略应该确保用户是对应 Room 的 Member

**Why This Matters:**
- Protects conversation context
- Prevents leaking who requested AI assistance
- Maintains room privacy

**Test Strategy:**
1. Create invocations in a room
2. Member queries invocations (should see them)
3. Non-member queries invocations (should see nothing)
4. Verify: Only members see invocations

**Note:**
Unlike messages, invocations don't filter by joined_at timestamp. Members see all invocations in the room.

## Running the Tests

### Prerequisites

1. **Supabase Project:**
   - Create a Supabase project
   - Apply the schema from `docs/db.sql`
   - Enable RLS on all tables

2. **Environment Variables:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

### Run Tests

```bash
# Run all RLS tests
npm test

# Run with detailed output
npm test -- --reporter=verbose

# Run specific test file
npm test rls-policies.test.ts

# Run in watch mode (re-run on file changes)
npm run test:watch

# Run with UI (interactive test explorer)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Understanding Test Output

### Successful Test Run

```
✓ Property 43: RLS 强制表级隔离 (100 iterations)
✓ Property 44: 消息 RLS 成员检查 (100 iterations)
✓ Property 45: 资源所有权 RLS (100 iterations)
✓ Property 46: Invocation RLS 成员检查 (100 iterations)

Test Files  1 passed (1)
     Tests  4 passed (4)
```

### Failed Test Example

```
❌ Property 44: 消息 RLS 成员检查
   Expected: []
   Received: [{ id: '...', content: '...' }]
   
   Counterexample found after 23 iterations:
   - messagesBefore: 3
   - messagesAfter: 2
```

When a test fails, fast-check will:
1. Show the failing assertion
2. Provide the input that caused the failure
3. Attempt to shrink the input to a minimal failing case

## Debugging Failed Tests

### Step 1: Identify the Property

Look at which property failed. Each property tests a specific RLS rule.

### Step 2: Check the Counterexample

The counterexample shows the specific input that caused the failure:
```typescript
// Example counterexample
{
  tableName: 'messages',
  messagesBefore: 5,
  messagesAfter: 3
}
```

### Step 3: Verify RLS Policies

Check that the corresponding RLS policy is correctly applied:

```sql
-- For Property 44 (messages RLS)
SELECT * FROM pg_policies 
WHERE tablename = 'messages' 
AND policyname = 'Members see messages after join';
```

### Step 4: Manual Verification

Reproduce the failure manually in Supabase SQL Editor:

```sql
-- Create test scenario
INSERT INTO rooms (id, name, owner_id, status) 
VALUES ('test-room-id', 'Test', 'user1-id', 'active');

INSERT INTO room_members (room_id, user_id, joined_at)
VALUES ('test-room-id', 'user2-id', NOW());

-- Try to query as user2
SET request.jwt.claims.sub = 'user2-id';
SELECT * FROM messages WHERE room_id = 'test-room-id';
```

## Common Issues

### Issue: "Failed to create test users"

**Cause:** Service role key is invalid or Supabase project is inaccessible

**Solution:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
2. Check Supabase project status
3. Ensure network connectivity

### Issue: "RLS policy violation"

**Cause:** RLS policies are not correctly configured

**Solution:**
1. Re-apply `docs/db.sql` to your database
2. Verify all policies are enabled:
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

### Issue: Tests timeout

**Cause:** Database is slow or network latency is high

**Solution:**
1. Use a local Supabase instance for testing
2. Increase test timeout in `vitest.config.ts`:
   ```typescript
   test: {
     testTimeout: 30000, // 30 seconds
   }
   ```

### Issue: Orphaned test data

**Cause:** Tests were interrupted (Ctrl+C)

**Solution:**
Clean up manually:
```sql
DELETE FROM auth.users 
WHERE email LIKE 'test-user-%@example.com';
```

## Best Practices

### 1. Use Test Database

Create a separate Supabase project for testing:
- Prevents pollution of production data
- Allows destructive testing
- Faster test execution

### 2. Run Tests in CI/CD

Add to your GitHub Actions workflow:
```yaml
- name: Run RLS Tests
  run: npm test
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
```

### 3. Monitor Test Performance

Track test execution time:
```bash
npm test -- --reporter=verbose --reporter=json --outputFile=test-results.json
```

### 4. Keep Tests Fast

- Use transactions for test isolation (if possible)
- Clean up resources immediately after each test
- Consider using Supabase local development

## Advanced Topics

### Custom Arbitraries

Create custom data generators for complex scenarios:

```typescript
import { fc } from 'fast-check';

// Generate realistic room names
const roomNameArb = fc.string({ 
  minLength: 3, 
  maxLength: 100 
}).filter(s => s.trim().length > 0);

// Generate valid timestamps
const timestampArb = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2025-12-31')
});
```

### Shrinking

fast-check automatically shrinks failing inputs to minimal examples:

```typescript
// Original failing input
{ messagesBefore: 47, messagesAfter: 23 }

// Shrunk to minimal failing case
{ messagesBefore: 1, messagesAfter: 1 }
```

### Replay Failed Tests

Save the seed to replay a specific test run:

```bash
# Run with specific seed
npm test -- --seed=12345
```

## References

- [fast-check Documentation](https://fast-check.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Property-Based Testing Introduction](https://hypothesis.works/articles/what-is-property-based-testing/)

## Support

If you encounter issues:
1. Check this guide first
2. Review test output and error messages
3. Verify RLS policies in Supabase dashboard
4. Ask for help with specific error messages and counterexamples
