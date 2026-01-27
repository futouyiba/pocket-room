-- Updated Schema for Sprint 1 (Milestones 4-7)

-- Rooms, Messages, Members, Requests, Segments (Existing)
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  is_public boolean default true,
  owner_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  is_deleted boolean default false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.room_members (
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (room_id, user_id)
);

create table public.join_requests (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected', 'blocked')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (room_id, user_id)
);

create table public.segments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_by uuid references auth.users(id) not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  is_shared_to_room boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.segment_messages (
  segment_id uuid references public.segments(id) on delete cascade not null,
  message_id uuid references public.messages(id) on delete cascade not null,
  message_order int not null,
  primary key (segment_id, message_id)
);

-- AI Familiars (New: Milestone 7)
create table public.ai_familiars (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- e.g. "Pancake"
  owner_id uuid references auth.users(id) not null,
  provider text not null, -- 'openai', 'anthropic', etc.
  model text not null, -- 'gpt-4', 'claude-3-opus'
  system_prompt text, -- Personality/Tone
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Invocations (New: Milestone 7)
-- Tracks each time an AI is called to speak
create table public.ai_invocations (
  id uuid default gen_random_uuid() primary key,
  familiar_id uuid references public.ai_familiars(id) not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  triggered_by uuid references auth.users(id) not null, -- Who asked (could be owner or someone else)
  approved_by uuid references auth.users(id), -- If owner approval was needed
  context_segment_id uuid references public.segments(id), -- The explicit context provided
  response_message_id uuid references public.messages(id), -- The resulting message
  status text check (status in ('pending_approval', 'processing', 'completed', 'rejected', 'failed')) default 'processing',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.rooms enable row level security;
alter table public.messages enable row level security;
alter table public.room_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.segments enable row level security;
alter table public.segment_messages enable row level security;
alter table public.ai_familiars enable row level security;
alter table public.ai_invocations enable row level security;

-- Policies (Existing omitted for brevity, keeping logic)

-- AI Familiars
create policy "Users manage own familiars" on public.ai_familiars for all using ( owner_id = auth.uid() );
create policy "Everyone can see public familiars in room" on public.ai_familiars for select using ( true ); -- Simplified for Sprint 1 (familiars are visible entities)

-- AI Invocations
create policy "Room members see invocations" on public.ai_invocations for select using (
  exists (select 1 from public.room_members where room_members.room_id = ai_invocations.room_id and room_members.user_id = auth.uid())
);
create policy "Triggerer can insert" on public.ai_invocations for insert with check ( triggered_by = auth.uid() );
