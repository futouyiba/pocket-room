-- Updated Schema for Sprint 1 (Milestones 4 & 5)

-- Rooms Table (Existing)
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  is_public boolean default true,
  owner_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table (Updated for Tombstones)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  is_deleted boolean default false, -- Tombstone flag
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Room Members Table
create table public.room_members (
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (room_id, user_id)
);

-- Join Requests Table
create table public.join_requests (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected', 'blocked')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (room_id, user_id)
);

-- Enable RLS
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.room_members enable row level security;
alter table public.join_requests enable row level security;

-- Policies

-- Rooms
create policy "Public rooms are viewable by everyone"
  on public.rooms for select using ( is_public = true );

-- Messages
-- 1. Spectators can see messages in public rooms (typically this would be limited to 'recent' in a real query, but Policy allows access)
-- 2. Members can see messages created AFTER they joined
-- 3. Owners can see everything
create policy "View messages"
  on public.messages for select
  using (
    -- Public room spectator
    (exists (select 1 from public.rooms where rooms.id = messages.room_id and rooms.is_public = true))
    OR
    -- Member (Late Joiner Rule: created_at >= joined_at)
    (exists (
      select 1 from public.room_members
      where room_members.room_id = messages.room_id
      and room_members.user_id = auth.uid()
      and messages.created_at >= room_members.joined_at
    ))
  );

create policy "Members can insert messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.room_members
      where room_members.room_id = messages.room_id
      and room_members.user_id = auth.uid()
    )
  );

-- Join Requests
create policy "Users can create join requests" on public.join_requests for insert with check ( auth.uid() = user_id );
create policy "Users can view own join requests" on public.join_requests for select using ( auth.uid() = user_id );
create policy "Owners can view room requests" on public.join_requests for select using ( exists ( select 1 from public.rooms where rooms.id = join_requests.room_id and rooms.owner_id = auth.uid() ) );
create policy "Owners can update requests" on public.join_requests for update using ( exists ( select 1 from public.rooms where rooms.id = join_requests.room_id and rooms.owner_id = auth.uid() ) );
