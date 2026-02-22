# Task 4.2: Room Creation Edge Function Implementation Summary

## Overview

Implemented the server-side Room creation API endpoint (`/api/rooms/create`) that handles:
- Room record creation with pending status
- Invitation record creation
- Server-side validation
- Password hashing for passcode strategy
- Error handling and rollback

## Implementation Details

### API Endpoint

**Location**: `apps/web/app/api/rooms/create/route.ts`

**Method**: POST

**Request Body**:
```typescript
{
  name: string;              // Room name (required)
  description?: string;      // Room description (optional)
  joinStrategy: 'approval' | 'free' | 'passcode';  // Join strategy (required)
  passcode?: string;         // Password for passcode strategy (required if joinStrategy is 'passcode')
  inviteeEmails: string[];   // Array of invitee email addresses (required, at least one)
}
```

**Response**:
```typescript
{
  roomId: string;
  invitations: Array<{
    id: string;
    inviteeId: string;
    inviteeEmail: string;
    status: string;
  }>;
  warning?: string;  // Present if some invitees were not found
}
```

### Requirements Validation

#### 需求 3.1: Room must have at least one invitee
- Validates that `inviteeEmails` array is not empty
- Returns 400 error if no invitees provided
- Error message: "必须邀请至少一名用户"

#### 需求 3.2: Room must have a join strategy
- Validates that `joinStrategy` is one of: 'approval', 'free', 'passcode'
- Returns 400 error if invalid or missing
- Error message: "必须选择一种加入策略"

#### 需求 3.3: If passcode strategy, passcode_hash must be provided
- Validates that `passcode` is provided when `joinStrategy` is 'passcode'
- Hashes password using bcrypt (10 salt rounds) before storing
- Returns 400 error if passcode missing
- Error message: "密码加入策略需要设置密码"

### Server-Side Logic

1. **Input Validation**
   - Validates all required fields
   - Validates email format using regex
   - Validates join strategy enum
   - Validates passcode for passcode strategy

2. **Authentication Check**
   - Verifies user is authenticated via Supabase Auth
   - Returns 401 if not authenticated

3. **Password Hashing**
   - Uses bcrypt with 10 salt rounds
   - Only hashes if joinStrategy is 'passcode'
   - Stores hash in `passcode_hash` field

4. **Room Creation**
   - Creates room with `status: 'pending'` (需求 3.4)
   - Sets owner_id to authenticated user
   - Stores join_strategy and passcode_hash

5. **Invitee Lookup**
   - Queries Supabase Auth admin API to find users by email
   - Filters matched users from the list
   - Tracks not-found emails for warning message

6. **Invitation Creation**
   - Creates invitation records for all found invitees
   - Sets status to 'pending'
   - Links to room and inviter

7. **Error Handling & Rollback**
   - If no invitees found: deletes room and returns 404
   - If invitation creation fails: deletes room and returns 500
   - If database error: returns 500 with error details

8. **Response**
   - Returns room ID and invitation details
   - Includes warning if some invitees not found
   - Logs all operations for debugging

### Client-Side Changes

**Location**: `apps/web/components/rooms/create-room-dialog.tsx`

**Changes**:
- Removed direct database access
- Removed bcrypt import (password hashing now server-side)
- Calls `/api/rooms/create` API endpoint
- Converts single email to array format
- Handles API response and errors

### Security Improvements

1. **Server-Side Validation**: All validation now happens on the server, preventing client-side bypass
2. **Password Hashing**: Passwords are hashed server-side, never sent in plain text to database
3. **Authentication**: User authentication verified server-side
4. **RLS Policies**: Database operations respect Row Level Security policies
5. **Error Messages**: Generic error messages prevent information leakage

### Testing

**Test File**: `apps/web/tests/create-room-api.test.ts`

**Test Coverage**:
- Input validation (6 tests)
  - Missing room name
  - Missing join strategy
  - Invalid join strategy
  - Missing invitees (需求 3.1)
  - Missing passcode for passcode strategy (需求 3.3)
  - Invalid email format
- Authentication (1 test)
  - Unauthenticated requests
- Room creation (2 tests)
  - Room created with pending status
  - Password hashing for passcode strategy
- Invitation creation (3 tests)
  - Multiple invitations created
  - Warning for not-found invitees
  - Rollback on no invitees found
- Error handling (2 tests)
  - Database errors
  - Unexpected errors

**Integration Tests**: `apps/web/tests/create-room-integration.test.tsx` (20 tests pass)

### Future Improvements (Not in MVP)

1. **Notification System**
   - Send email notifications to invitees
   - Send in-app notifications via Supabase Realtime
   - Create notification records in database

2. **Batch Invitations**
   - Support inviting multiple users at once
   - Better handling of partial failures

3. **Email Invitations**
   - Allow inviting users who haven't registered yet
   - Send email with registration link

4. **Rate Limiting**
   - Prevent abuse of room creation
   - Limit number of rooms per user

5. **Invitation Expiry**
   - Optional expiry time for invitations
   - Auto-cleanup of expired invitations

## Files Created/Modified

### Created
- `apps/web/app/api/rooms/create/route.ts` - API endpoint implementation
- `apps/web/tests/create-room-api.test.ts` - Unit tests for API
- `apps/web/docs/TASK_4.2_SUMMARY.md` - This documentation

### Modified
- `apps/web/components/rooms/create-room-dialog.tsx` - Updated to use API endpoint

## Requirements Validated

- ✅ 需求 3.1: Room must have at least one invitee
- ✅ 需求 3.2: Room must have a join strategy
- ✅ 需求 3.3: If passcode strategy, passcode_hash must be provided
- ✅ 需求 3.4: Room starts with pending status until invitee confirms

## Next Steps

Task 4.3 will implement the invitation confirmation flow:
- Create invitation confirmation page UI
- Implement `confirm-invitation` Edge Function
- Handle accept/reject actions
- Update room status to active on acceptance
- Notify room creator on rejection
