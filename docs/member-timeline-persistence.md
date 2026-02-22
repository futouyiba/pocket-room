# Member Timeline Persistence

## Overview

This document explains how Pocket Room implements persistent message history for each Room Member, ensuring that messages are stored in the cloud and accessible across devices while respecting the privacy rule that members can only see messages from their join time onwards.

**Requirement**: 需求 9.1 - THE Web_App SHALL 为每个 Room_Member 持久化保存从加入时间点开始的所有消息记录（云端跨设备可访问）

**Design Property**: 属性 25 - 消息持久化

## Architecture

### Cloud-Based Storage

Pocket Room uses **Supabase PostgreSQL** as the cloud database backend. This provides:

1. **Automatic Persistence**: All messages are stored in the `messages` table in PostgreSQL
2. **Cloud Synchronization**: Supabase handles cross-device synchronization automatically
3. **High Availability**: Supabase Cloud provides 99.9% uptime SLA
4. **Automatic Backups**: Daily backups with point-in-time recovery

### Database Schema

The persistence mechanism relies on two key tables:

#### messages Table

```sql
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'segment_share', 'system')) DEFAULT 'text',
  shared_segment_id UUID REFERENCES public.segments(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Key Fields for Persistence**:
- `created_at`: Timestamp when the message was created (used for timeline ordering)
- `room_id`: Links message to a specific room
- `is_deleted`: Soft delete flag (preserves message history even after deletion)

#### room_members Table

```sql
CREATE TABLE public.room_members (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at TIMESTAMPTZ,
  keep_history BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (room_id, user_id)
);
```

**Key Fields for Timeline Control**:
- `joined_at`: Timestamp when the member joined the room (determines message visibility start point)
- `left_at`: Timestamp when the member left (NULL if still active)
- `keep_history`: Whether to preserve message history after leaving

## Access Control via RLS

### Row Level Security Policy

The core of the persistence mechanism is the RLS policy that enforces per-member timeline visibility:

```sql
-- Room Member 可以查看自己加入后的消息
CREATE POLICY "Members see messages after join"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
        AND messages.created_at >= room_members.joined_at
    )
  );
```

**How It Works**:
1. When a user queries messages, PostgreSQL checks if they are a room member
2. The policy filters messages to only include those where `created_at >= joined_at`
3. This happens at the database level, ensuring security even if application code is compromised

### Example Scenario

```
Timeline:
  10:00 - Message A created
  10:05 - Message B created
  10:10 - User joins room (joined_at = 10:10)
  10:15 - Message C created
  10:20 - Message D created

User's visible messages: C, D (only messages after 10:10)
```

## Cross-Device Synchronization

### How It Works

1. **Single Source of Truth**: All messages are stored in Supabase PostgreSQL cloud database
2. **Device-Agnostic Access**: Any device with valid authentication can query the same data
3. **Automatic Sync**: No manual sync required - queries always fetch from the cloud
4. **Real-time Updates**: Supabase Realtime pushes new messages to all connected devices

### User Experience

When a user:
1. Sends a message on Device A → Stored in cloud database
2. Opens the app on Device B → Queries fetch all messages from cloud (respecting `joined_at`)
3. Receives a new message → Supabase Realtime pushes to all connected devices

## Implementation Details

### Message Sending (Persistence)

When a message is sent via `/api/messages/send`:

```typescript
// Insert message record (automatically persisted to cloud)
const { data: message, error: messageError } = await supabase
  .from('messages')
  .insert({
    room_id: roomId,
    user_id: user.id,
    content: content.trim(),
    message_type: 'text',
    attachments: attachments || [],
    is_deleted: false,
  })
  .select('id')
  .single();
```

**What Happens**:
1. Message is inserted into PostgreSQL database
2. Database automatically sets `created_at` timestamp
3. RLS policies ensure only authorized members can insert
4. Supabase Realtime broadcasts the new message to subscribers

### Message Retrieval (Cross-Device)

When a user opens a room on any device:

```typescript
// Query messages (RLS automatically filters by joined_at)
const { data: messages, error } = await supabase
  .from('messages')
  .select('*')
  .eq('room_id', roomId)
  .order('created_at', { ascending: true });
```

**What Happens**:
1. Query is sent to Supabase cloud database
2. RLS policy automatically filters: `created_at >= joined_at`
3. Only visible messages are returned
4. Same result on any device the user logs in from

## Verification

### Testing Persistence

To verify that messages are persisted correctly:

1. **Send a message** on Device A
2. **Close the app** completely
3. **Open the app** on Device B (or same device)
4. **Verify** the message appears in the timeline

### Testing joined_at Filtering

To verify that members only see messages after joining:

1. **Create messages** in a room (as User A)
2. **Add User B** to the room (note the `joined_at` timestamp)
3. **Create more messages** after User B joins
4. **Query as User B** and verify only post-join messages are visible

### Testing Cross-Device Sync

To verify cross-device synchronization:

1. **Log in** on Device A and Device B with the same account
2. **Send a message** from Device A
3. **Verify** the message appears on Device B (via Realtime or refresh)
4. **Query messages** on Device B and verify persistence

## Performance Considerations

### Indexing

The database includes optimized indexes for message queries:

```sql
CREATE INDEX idx_messages_room_time ON public.messages(room_id, created_at DESC);
```

This ensures fast queries even with millions of messages.

### Query Optimization

The RLS policy uses an `EXISTS` subquery which is optimized by PostgreSQL's query planner. For rooms with many members, this is more efficient than a JOIN.

### Scalability

- **Current capacity**: Supabase PostgreSQL can handle millions of messages per room
- **Future optimization**: If a single room exceeds 1M messages, consider time-based partitioning
- **Realtime limits**: Supabase Realtime supports up to 100 concurrent connections per room

## Monitoring and Maintenance

### Health Checks

Monitor these metrics to ensure persistence is working:

1. **Message insert success rate**: Should be > 99.9%
2. **Query latency**: Should be < 100ms for typical rooms
3. **RLS policy performance**: Monitor slow query logs

### Backup and Recovery

Supabase provides:
- **Daily automated backups**: Retained for 7 days (Pro plan)
- **Point-in-time recovery**: Restore to any point in the last 7 days
- **Manual backups**: Can be triggered via Supabase Dashboard

## Troubleshooting

### Messages Not Appearing

**Symptom**: User sends a message but it doesn't appear on other devices

**Possible Causes**:
1. RLS policy blocking the query (check if user is a room member)
2. Realtime subscription not active (check WebSocket connection)
3. Network connectivity issues

**Debug Steps**:
1. Check if message was inserted: Query `messages` table with service role
2. Verify user is a room member: Query `room_members` table
3. Check Realtime connection status in browser console

### Messages from Before Join Time Visible

**Symptom**: User can see messages created before their `joined_at` time

**Possible Causes**:
1. RLS policy not enabled on `messages` table
2. Incorrect `joined_at` timestamp in `room_members`
3. Using service role key (bypasses RLS)

**Debug Steps**:
1. Verify RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'messages'`
2. Check `joined_at` value: Query `room_members` table
3. Ensure using anon/authenticated key, not service role key

## Future Enhancements

### Planned Improvements

1. **Message History Export**: Allow users to export their message history
2. **Selective History Deletion**: Allow users to delete specific messages from their history
3. **Archive Old Messages**: Move messages older than 1 year to cold storage
4. **Full-Text Search**: Add PostgreSQL full-text search for message content

### Scalability Roadmap

1. **Partitioning**: Implement time-based partitioning for rooms with > 1M messages
2. **Read Replicas**: Add read replicas for high-traffic rooms
3. **Caching**: Implement Redis cache for frequently accessed messages
4. **CDN**: Use CDN for message attachments (images)

## Conclusion

Pocket Room's member timeline persistence is built on Supabase's cloud PostgreSQL infrastructure, providing:

✅ **Automatic cloud persistence** - No manual sync required  
✅ **Cross-device access** - Same data on all devices  
✅ **Privacy-preserving** - RLS enforces `joined_at` filtering  
✅ **High availability** - 99.9% uptime SLA  
✅ **Automatic backups** - Daily backups with point-in-time recovery  

The system is production-ready and requires no additional implementation for basic persistence functionality.

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-XX  
**Related Requirements**: 9.1  
**Related Properties**: 25, 26  
**Related Tasks**: 6.6
