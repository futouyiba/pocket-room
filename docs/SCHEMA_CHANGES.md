# Database Schema Changes - Sprint 1

## Summary

This document outlines all changes made to the database schema for Sprint 1, based on the design document.

## New Tables

### 1. invitations
**Purpose**: Manage Room creation invitation workflow

**Key Fields**:
- `room_id`: Reference to the Room being created
- `inviter_id`: User who sent the invitation
- `invitee_id`: User being invited
- `status`: 'pending', 'accepted', 'rejected'
- `invitation_segment_id`: Optional Segment shared with invitation

**Why Added**: Implements the invitation confirmation mechanism (Requirement 3)

### 2. room_blacklist
**Purpose**: Store users banned from specific Rooms

**Key Fields**:
- `room_id`: The Room from which user is banned
- `user_id`: The banned user
- `blocked_by`: Who performed the ban
- `reason`: Optional reason for ban

**Why Added**: Implements the ban functionality in join request handling (Requirement 5)

### 3. provider_connections
**Purpose**: Manage OAuth connections to AI service providers

**Key Fields**:
- `user_id`: Owner of the connection
- `provider`: 'openai', 'google', 'anthropic'
- `access_token_encrypted`: Encrypted OAuth access token
- `refresh_token_encrypted`: Encrypted OAuth refresh token
- `expires_at`: Token expiration time
- `scopes`: OAuth scopes granted

**Why Added**: Implements Provider Binding system (Requirement 2)

### 4. companion_whitelist
**Purpose**: Store auto-approval rules for Companion requests

**Key Fields**:
- `companion_id`: The Companion
- `user_id`: User who is whitelisted
- `room_id`: Room where whitelist applies

**Why Added**: Implements "always allow this member" feature (Requirement 14.4)

## Modified Tables

### 1. rooms
**New Fields**:
- `join_strategy`: 'approval', 'free', 'passcode' (default: 'approval')
- `passcode_hash`: Bcrypt hash of passcode (for passcode strategy)
- `status`: 'pending', 'active', 'archived' (default: 'pending')
- `updated_at`: Auto-updated timestamp

**Why Modified**: 
- Implements three join strategies (Requirements 5, 6, 7)
- Implements invitation confirmation workflow (Requirement 3)

### 2. room_members
**New Fields**:
- `left_at`: Timestamp when user left (NULL if still member)
- `keep_history`: Whether to keep message history after leaving

**Why Modified**: Implements exit semantics with history preservation options (Requirement 11)

### 3. join_requests
**New Fields**:
- `silenced_until`: Timestamp until which user is silenced
- `handled_at`: When request was processed
- `handled_by`: Who processed the request

**Why Modified**: Implements silence/cooldown period functionality (Requirement 5.6)

### 4. messages
**New Fields**:
- `message_type`: 'text', 'segment_share', 'system'
- `shared_segment_id`: Reference to shared Segment (if type is segment_share)
- `attachments`: JSONB array of attachment URLs
- `updated_at`: Auto-updated timestamp

**Why Modified**: 
- Implements Segment sharing in Room (Requirement 12.4)
- Implements image attachments (Requirement 8.4)

### 5. segments
**New Fields**:
- `is_draft`: Whether Segment is in Basket (draft state)
- `source_url`: URL if captured from browser extension
- `updated_at`: Auto-updated timestamp

**Why Modified**: 
- Implements Basket functionality
- Implements browser extension content capture (Requirement 16)

### 6. ai_companions (renamed from ai_familiars)
**Table Renamed**: `ai_familiars` → `ai_companions`

**New Fields**:
- `provider_connection_id`: Reference to provider_connections table
- `temperature`: Model temperature parameter (default: 0.7)
- `max_tokens`: Maximum tokens per response (default: 2000)
- `updated_at`: Auto-updated timestamp

**Removed Fields**:
- `provider`: Moved to provider_connections table

**Why Modified**: 
- Decouples Companion from Provider (one connection, many Companions)
- Implements Provider Binding integration (Requirement 13.2)
- Adds model parameter configuration

### 7. ai_invocations
**New Fields**:
- `visibility`: 'public', 'private' (default: 'public')
- `tokens_used`: Token consumption tracking
- `error_message`: Error details if failed
- `completed_at`: Completion timestamp

**Extended Status Enum**:
- Added: 'summoned' (待命状态)
- Existing: 'pending_approval', 'processing', 'completed', 'rejected', 'failed'

**Why Modified**: 
- Implements complete Companion governance lifecycle (Requirement 14)
- Implements response visibility control (Requirement 15.3)
- Adds token usage tracking

## New Indexes

### Performance Optimization
- `idx_rooms_status`: Fast filtering by Room status
- `idx_rooms_owner`: Fast owner lookup
- `idx_invitations_invitee`: Fast invitation lookup for users
- `idx_room_members_room_active`: Fast active member queries
- `idx_join_requests_room_pending`: Fast pending request queries
- `idx_segments_draft`: Fast Basket queries
- `idx_provider_connections_user`: Fast user connection lookup
- `idx_ai_invocations_status`: Fast pending approval queries

## New RLS Policies

### invitations
- Invitees can view their own invitations
- Inviters can view sent invitations
- Room owners can create invitations
- Invitees can respond (accept/reject)

### room_blacklist
- Room owners can manage blacklist

### provider_connections
- Users can only manage their own connections

### companion_whitelist
- Companion owners can manage whitelist

### Updated Policies
- **messages**: Now checks `joined_at` to enforce post-join visibility
- **segments**: Added support for draft Segments in Basket
- **ai_invocations**: Added approval workflow policies

## New Functions and Triggers

### update_updated_at_column()
**Purpose**: Automatically update `updated_at` timestamp on row updates

**Applied To**:
- rooms
- messages
- segments
- provider_connections
- ai_companions

## Realtime Configuration

### Tables Requiring Realtime
The following tables should be added to the `supabase_realtime` publication:
- `messages`: Real-time message delivery
- `room_members`: Real-time member list updates
- `join_requests`: Real-time approval notifications
- `ai_invocations`: Real-time Companion status updates

## Breaking Changes

### ⚠️ Table Rename
- `ai_familiars` → `ai_companions`
  - **Impact**: Any existing code referencing `ai_familiars` must be updated
  - **Migration**: Rename table or create new table and migrate data

### ⚠️ Schema Changes
- `ai_companions.provider` field removed
  - **Impact**: Must use `provider_connection_id` instead
  - **Migration**: Create provider_connections records and update references

## Data Migration Notes

### If Upgrading from Previous Schema

1. **Backup existing data** before applying changes
2. **Create provider_connections** for existing ai_familiars
3. **Update ai_companions** to reference provider_connections
4. **Set default values** for new required fields:
   - `rooms.join_strategy` = 'approval'
   - `rooms.status` = 'active' (for existing rooms)
   - `messages.message_type` = 'text'
   - `segments.is_draft` = false

### Fresh Installation

No migration needed - just apply `docs/db.sql` directly.

## Validation Checklist

After applying schema changes:

- [ ] All 12 tables created successfully
- [ ] All indexes created
- [ ] RLS enabled on all tables
- [ ] All RLS policies created
- [ ] Triggers created for updated_at columns
- [ ] Realtime enabled for required tables
- [ ] Foreign key constraints working
- [ ] Check constraints working (enums)
- [ ] Unique constraints working

## Testing Recommendations

### Unit Tests
- Test RLS policies with different user roles
- Test foreign key cascades (ON DELETE CASCADE)
- Test check constraints (enum values)
- Test unique constraints

### Integration Tests
- Test invitation workflow end-to-end
- Test join strategies (approval, free, passcode)
- Test Companion governance lifecycle
- Test message visibility based on joined_at
- Test Realtime subscriptions

## Performance Considerations

### Query Optimization
- Use indexes for frequently filtered columns
- RLS policies use EXISTS subqueries (efficient with proper indexes)
- Composite indexes for multi-column filters

### Potential Bottlenecks
- `messages` table will grow large over time
  - Consider partitioning by created_at in future
- RLS policy on messages checks joined_at
  - Ensure room_members index is used

### Monitoring
- Monitor query performance on messages table
- Monitor RLS policy execution time
- Monitor Realtime subscription count

## Future Considerations

### Sprint 2 Potential Changes
- Message editing (add `edited_at` field)
- Message reactions (new table)
- Message search (full-text search indexes)
- Token quota management (new table)
- Practice Room (new room_type field)

### Scalability
- Consider read replicas for heavy read workloads
- Consider message archiving strategy
- Consider CDN for attachments

## References

- Design Document: `.kiro/specs/sprint1-pocket-room/design.md`
- Requirements Document: `.kiro/specs/sprint1-pocket-room/requirements.md`
- Migration Guide: `docs/MIGRATION_GUIDE.md`

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-XX  
**Author**: Kiro AI Assistant
