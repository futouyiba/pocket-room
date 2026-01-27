-- Minimal Schema for Sprint 1 (Spectator Mode)

-- Rooms Table
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  is_public boolean default true,
  owner_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.messages enable row level security;

-- Policies (Simplified for Sprint 1)
-- Public access for public rooms (Spectator)
create policy "Public rooms are viewable by everyone"
  on public.rooms for select
  using ( is_public = true );

create policy "Messages in public rooms are viewable by everyone"
  on public.messages for select
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = messages.room_id
      and rooms.is_public = true
    )
  );

-- Only members can insert (TODO: Membership table in future steps)
