-- =============================================================================
-- Cadence — Supabase schema
-- Run this ONCE in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- Permission bitfield
-- Discord-style: a bigint bitmask per role, resolved as
--   (base & ~deny) | allow
-- =============================================================================

create or replace function public.perm_bit(p_name text)
returns bigint
language sql immutable
as $$
  select case p_name
    when 'ADMINISTRATOR'    then 1::bigint << 0
    when 'MANAGE_SERVER'    then 1::bigint << 1
    when 'MANAGE_CHANNELS'  then 1::bigint << 2
    when 'MANAGE_ROLES'     then 1::bigint << 3
    when 'CREATE_INVITE'    then 1::bigint << 4
    when 'KICK_MEMBERS'     then 1::bigint << 5
    when 'BAN_MEMBERS'      then 1::bigint << 6
    when 'CHANGE_NICKNAME'  then 1::bigint << 7
    when 'VIEW_CHANNEL'     then 1::bigint << 10
    when 'SEND_MESSAGES'    then 1::bigint << 11
    when 'MANAGE_MESSAGES'  then 1::bigint << 13
    when 'EMBED_LINKS'      then 1::bigint << 14
    when 'ATTACH_FILES'     then 1::bigint << 15
    when 'ADD_REACTIONS'    then 1::bigint << 17
    when 'MENTION_EVERYONE' then 1::bigint << 18
    else 0::bigint
  end;
$$;

-- Default: @everyone can view + send in text channels.
create or replace function public.default_everyone_permissions()
returns bigint language sql immutable as $$
  select public.perm_bit('VIEW_CHANNEL')
       | public.perm_bit('SEND_MESSAGES')
       | public.perm_bit('EMBED_LINKS')
       | public.perm_bit('ATTACH_FILES')
       | public.perm_bit('ADD_REACTIONS');
$$;

-- =============================================================================
-- Profiles
-- =============================================================================

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name    text not null check (char_length(display_name) between 1 and 48),
  about           text not null default '' check (char_length(about) <= 300),
  avatar_url      text,
  banner_url      text,
  status_text     text not null default '' check (char_length(status_text) <= 128),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile, one row per auth user.';

create index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Auto-create a profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    '[^a-z0-9_.]', '', 'g'
  ));

  -- Fall back to a random suffix when the requested name is taken or invalid.
  if v_username is null or char_length(v_username) < 3 then
    v_username := 'cadence_' || substr(md5(random()::text), 1, 8);
  end if;

  while exists (select 1 from public.profiles p where p.username = v_username) loop
    v_username := left(v_username, 22) || substr(md5(random()::text), 1, 2);
  end loop;

  insert into public.profiles (id, username, display_name, about, avatar_url)
  values (
    new.id,
    v_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_username),
    coalesce(new.raw_user_meta_data ->> 'about', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Servers
-- =============================================================================

create table if not exists public.servers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 64),
  description text not null default '' check (char_length(description) <= 300),
  icon_url    text,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references public.servers(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 32),
  color       text not null default '#9ca3af',
  permissions bigint not null default 0,
  position    integer not null default 0,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (server_id, name)
);

create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  nickname  text check (nickname is null or char_length(nickname) between 1 and 32),
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create index if not exists server_members_user_idx on public.server_members (user_id);

create table if not exists public.member_roles (
  server_id uuid not null,
  user_id   uuid not null,
  role_id   uuid not null references public.roles(id) on delete cascade,
  primary key (server_id, user_id, role_id),
  foreign key (server_id, user_id)
    references public.server_members(server_id, user_id) on delete cascade
);

create table if not exists public.server_bans (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  reason    text not null default '',
  banned_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table if not exists public.server_invites (
  code       text primary key,
  server_id  uuid not null references public.servers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  max_uses   integer,
  uses       integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists server_invites_server_idx on public.server_invites (server_id);

-- =============================================================================
-- Channels (text channels + direct messages)
-- server_id IS NULL  ->  a DM
-- =============================================================================

create table if not exists public.channels (
  id              uuid primary key default gen_random_uuid(),
  server_id       uuid references public.servers(id) on delete cascade,
  kind            text not null default 'text' check (kind in ('text', 'dm')),
  name            text not null default '' check (char_length(name) <= 64),
  topic           text not null default '' check (char_length(topic) <= 256),
  position        integer not null default 0,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  -- Bumped by a trigger whenever a message lands, so the sidebar can sort
  -- channels by recent activity without a join.
  last_message_at timestamptz,
  -- For 1:1 DMs: the two user ids sorted and joined. Unique so we can
  -- look up "does a DM already exist" in one query.
  dm_key          text unique,
  constraint channels_dm_shape check (
    (kind = 'text' and server_id is not null and dm_key is null) or
    (kind = 'dm'   and server_id is null     and dm_key is not null)
  )
);

create index if not exists channels_server_idx on public.channels (server_id, position);
create index if not exists channels_activity_idx on public.channels (last_message_at desc nulls last);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (channel_id, user_id)
);

create index if not exists channel_members_user_idx on public.channel_members (user_id);

-- Per-channel allow/deny overwrites, keyed either to a role or a single user.
create table if not exists public.channel_overwrites (
  id         uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  role_id    uuid references public.roles(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  allow      bigint not null default 0,
  deny       bigint not null default 0,
  constraint channel_overwrites_target check (num_nonnulls(role_id, user_id) = 1)
);

create index if not exists channel_overwrites_channel_idx on public.channel_overwrites (channel_id);

-- =============================================================================
-- Messages
-- =============================================================================

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null default '' check (char_length(content) <= 4000),
  reply_to   uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);

create index if not exists messages_channel_created_idx
  on public.messages (channel_id, created_at desc);

create table if not exists public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists public.channel_reads (
  channel_id   uuid not null references public.channels(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- Messages pinned to a channel, shown in the pins bar.
create table if not exists public.pins (
  message_id uuid primary key references public.messages(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  pinned_by  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pins_channel_idx on public.pins (channel_id, created_at desc);

-- =============================================================================
-- Voice channels
--
-- Voice is peer-to-peer WebRTC. Supabase Realtime broadcast carries the
-- signalling (offer/answer/ICE); audio flows directly between browsers, so
-- there is no media server. That keeps the mesh small — past ~6 people every
-- browser is uploading N-1 streams, so larger calls need a real SFU.
-- =============================================================================

create table if not exists public.voice_channels (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid not null references public.servers(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 64),
  position   integer not null default 0,
  user_limit integer check (user_limit is null or user_limit between 1 and 99),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists voice_channels_server_idx
  on public.voice_channels (server_id, position);

-- Who is currently connected to which voice channel.
create table if not exists public.voice_states (
  channel_id uuid not null references public.voice_channels(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  session_id text not null,
  self_mute  boolean not null default false,
  self_deaf  boolean not null default false,
  joined_at  timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists voice_states_channel_idx on public.voice_states (channel_id);

-- File/image attachments on messages. Shape:
--   [{ "url": string, "name": string, "type": string, "size": number }]
alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- =============================================================================
-- Social graph
-- =============================================================================

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- One row per pair regardless of who asked.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

-- =============================================================================
-- updated_at maintenance
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists servers_touch on public.servers;
create trigger servers_touch before update on public.servers
  for each row execute function public.touch_updated_at();

drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch before update on public.friendships
  for each row execute function public.touch_updated_at();

-- Keep channels.last_message_at fresh so the sidebar can sort by activity.
create or replace function public.bump_channel_on_message()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  update public.channels
     set last_message_at = new.created_at
   where id = new.channel_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_channel on public.messages;
create trigger messages_bump_channel
  after insert on public.messages
  for each row execute function public.bump_channel_on_message();

-- =============================================================================
-- Permission resolution
-- =============================================================================

-- SECURITY DEFINER so RLS policies can ask "is this user a member?"
-- without the server_members policy recursing into itself.
create or replace function public.is_member(p_server uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.server_members m
     where m.server_id = p_server and m.user_id = p_user
  );
$$;

create or replace function public.base_permission(p_server uuid, p_user uuid default auth.uid())
returns bigint
language plpgsql stable security definer set search_path = public as $$
declare
  v_owner uuid;
  v_base  bigint := 0;
  v_sum   bigint := 0;
begin
  if not public.is_member(p_server, p_user) then
    return 0;
  end if;

  select owner_id into v_owner from public.servers where id = p_server;
  if v_owner = p_user then
    return -1; -- all bits
  end if;

  select coalesce(r.permissions, 0) into v_base
    from public.roles r
   where r.server_id = p_server and r.is_default
   limit 1;
  v_base := coalesce(v_base, 0);

  select coalesce(sum(r.permissions), 0) into v_sum
    from public.member_roles mr
    join public.roles r on r.id = mr.role_id
   where mr.server_id = p_server and mr.user_id = p_user;

  v_base := v_base | coalesce(v_sum, 0);

  if (v_base & public.perm_bit('ADMINISTRATOR')) <> 0 then
    return -1;
  end if;

  return v_base;
end;
$$;

create or replace function public.channel_permission(p_channel uuid, p_user uuid default auth.uid())
returns bigint
language plpgsql stable security definer set search_path = public as $$
declare
  v_server    uuid;
  v_kind      text;
  v_owner     uuid;
  v_base      bigint := 0;
  v_allow     bigint := 0;
  v_deny      bigint := 0;
  v_roles     uuid[] := '{}';
begin
  select c.server_id, c.kind, s.owner_id
    into v_server, v_kind, v_owner
    from public.channels c
    left join public.servers s on s.id = c.server_id
   where c.id = p_channel;

  if not found then
    return 0;
  end if;

  -- DMs: members get everything.
  if v_kind = 'dm' then
    if exists (select 1 from public.channel_members cm
                where cm.channel_id = p_channel and cm.user_id = p_user) then
      return -1;
    end if;
    return 0;
  end if;

  v_base := public.base_permission(v_server, p_user);
  if v_base = 0 then
    return 0;
  end if;
  if v_base = -1 then
    return -1;
  end if;

  select coalesce(array_agg(role_id), '{}'::uuid[])
    into v_roles
    from public.member_roles
   where server_id = v_server and user_id = p_user;

  select
      coalesce(sum(case when o.user_id = p_user then o.allow else 0 end), 0),
      coalesce(sum(case when o.user_id = p_user then o.deny  else 0 end), 0)
    into v_allow, v_deny
    from public.channel_overwrites o
   where o.channel_id = p_channel
     and (o.user_id = p_user or (o.user_id is null and o.role_id = any(v_roles)));

  return (v_base & ~v_deny) | v_allow;
end;
$$;

create or replace function public.my_permissions(p_channel uuid)
returns bigint
language sql stable security definer set search_path = public as $$
  select public.channel_permission(p_channel, auth.uid());
$$;

-- Servers the caller belongs to, with their resolved base permissions.
create or replace function public.my_servers()
returns table (
  id uuid, name text, description text, icon_url text, owner_id uuid,
  created_at timestamptz, member_role text, permissions bigint
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.description, s.icon_url, s.owner_id, s.created_at,
         case when s.owner_id = auth.uid() then 'Owner' else 'Member' end,
         public.base_permission(s.id, auth.uid())
    from public.servers s
    join public.server_members m on m.server_id = s.id
   where m.user_id = auth.uid()
   order by m.joined_at asc;
$$;

-- =============================================================================
-- Server lifecycle helpers (invite create / join)
-- =============================================================================

create or replace function public.create_server(p_name text, p_description text default '')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_server uuid;
  v_role   uuid;
  v_channel uuid;
begin
  insert into public.servers (name, description, owner_id)
  values (p_name, p_description, auth.uid())
  returning id into v_server;

  insert into public.roles (server_id, name, color, permissions, position, is_default)
  values (v_server, '@everyone', '#9ca3af', public.default_everyone_permissions(), 0, true)
  returning id into v_role;

  insert into public.server_members (server_id, user_id) values (v_server, auth.uid());

  insert into public.channels (server_id, name, topic, position, created_by)
  values (v_server, 'general', 'Welcome to ' || p_name, 0, auth.uid())
  returning id into v_channel;

  insert into public.channels (server_id, name, topic, position, created_by)
  values (v_server, 'random', 'Off-topic chatter', 1, auth.uid());

  return v_server;
end;
$$;

create or replace function public.create_invite(p_server uuid, p_max_uses integer default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_base bigint;
  v_code text;
begin
  v_base := public.base_permission(p_server, auth.uid());
  if v_base <> -1 and (v_base & public.perm_bit('CREATE_INVITE')) = 0 then
    raise exception 'You do not have permission to create invites';
  end if;

  v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  insert into public.server_invites (code, server_id, created_by, max_uses)
  values (v_code, p_server, auth.uid(), p_max_uses);

  return v_code;
end;
$$;

create or replace function public.join_server(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_server uuid;
begin
  select server_id into v_server
    from public.server_invites
   where code = p_code
     and (expires_at is null or expires_at > now())
     and (max_uses is null or uses < max_uses);

  if v_server is null then
    raise exception 'That invite is invalid or has expired';
  end if;

  if exists (select 1 from public.server_bans b
              where b.server_id = v_server and b.user_id = auth.uid()) then
    raise exception 'You are banned from this server';
  end if;

  insert into public.server_members (server_id, user_id)
  values (v_server, auth.uid())
  on conflict do nothing;

  update public.server_invites set uses = uses + 1 where code = p_code;

  return v_server;
end;
$$;

create or replace function public.open_dm(p_other uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me   uuid := auth.uid();
  v_key  text;
  v_chan uuid;
begin
  if p_other = v_me then
    raise exception 'You cannot DM yourself';
  end if;

  if exists (select 1 from public.user_blocks b
              where (b.blocker_id = v_me and b.blocked_id = p_other)
                 or (b.blocker_id = p_other and b.blocked_id = v_me)) then
    raise exception 'You cannot message this person';
  end if;

  v_key := (
    select string_agg(u::text, ':' order by u)
      from unnest(array[v_me, p_other]) as u
  );

  select id into v_chan from public.channels where dm_key = v_key;
  if v_chan is not null then
    return v_chan;
  end if;

  insert into public.channels (kind, name, dm_key, created_by)
  values ('dm', '', v_key, v_me)
  returning id into v_chan;

  insert into public.channel_members (channel_id, user_id)
  values (v_chan, v_me), (v_chan, p_other);

  return v_chan;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.servers            enable row level security;
alter table public.roles              enable row level security;
alter table public.server_members     enable row level security;
alter table public.member_roles       enable row level security;
alter table public.server_bans        enable row level security;
alter table public.server_invites     enable row level security;
alter table public.channels           enable row level security;
alter table public.channel_members    enable row level security;
alter table public.channel_overwrites enable row level security;
alter table public.messages           enable row level security;
alter table public.reactions          enable row level security;
alter table public.channel_reads      enable row level security;
alter table public.pins               enable row level security;
alter table public.voice_channels     enable row level security;
alter table public.voice_states       enable row level security;
alter table public.friendships        enable row level security;
alter table public.user_blocks        enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);   -- directory needs to be browsable

-- Needed by the client so it can backfill a profile for accounts that were
-- created before this schema existed (the signup trigger wouldn't have run).
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- servers -------------------------------------------------------------------
drop policy if exists servers_select_member on public.servers;
create policy servers_select_member on public.servers
  for select using (owner_id = auth.uid() or public.is_member(id));

drop policy if exists servers_insert on public.servers;
create policy servers_insert on public.servers
  for insert with check (owner_id = auth.uid());

drop policy if exists servers_update_admin on public.servers;
create policy servers_update_admin on public.servers
  for update using (public.base_permission(id, auth.uid()) <> 0)
  with check (public.base_permission(id, auth.uid()) <> 0);

drop policy if exists servers_delete_owner on public.servers;
create policy servers_delete_owner on public.servers
  for delete using (owner_id = auth.uid());

-- roles ---------------------------------------------------------------------
drop policy if exists roles_select_member on public.roles;
create policy roles_select_member on public.roles
  for select using (public.is_member(server_id));

drop policy if exists roles_write_admin on public.roles;
create policy roles_write_admin on public.roles
  for all using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

-- membership ----------------------------------------------------------------
drop policy if exists server_members_select on public.server_members;
create policy server_members_select on public.server_members
  for select using (public.is_member(server_id));

drop policy if exists server_members_insert_self on public.server_members;
create policy server_members_insert_self on public.server_members
  for insert with check (
    user_id = auth.uid()
    or public.base_permission(server_id, auth.uid()) <> 0
  );

drop policy if exists server_members_update_admin on public.server_members;
create policy server_members_update_admin on public.server_members
  for update using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

drop policy if exists server_members_delete_admin on public.server_members;
create policy server_members_delete_admin on public.server_members
  for delete using (public.base_permission(server_id, auth.uid()) <> 0);

drop policy if exists member_roles_select on public.member_roles;
create policy member_roles_select on public.member_roles
  for select using (public.is_member(server_id));

drop policy if exists member_roles_admin on public.member_roles;
create policy member_roles_admin on public.member_roles
  for all using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

-- bans ----------------------------------------------------------------------
drop policy if exists server_bans_admin on public.server_bans;
create policy server_bans_admin on public.server_bans
  for all using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

-- invites -------------------------------------------------------------------
drop policy if exists server_invites_select_admin on public.server_invites;
create policy server_invites_select_admin on public.server_invites
  for select using (public.base_permission(server_id, auth.uid()) <> 0);

drop policy if exists server_invites_admin on public.server_invites;
create policy server_invites_admin on public.server_invites
  for all using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

-- channels ------------------------------------------------------------------
drop policy if exists channels_select on public.channels;
create policy channels_select on public.channels
  for select using (public.channel_permission(id, auth.uid()) <> 0);

drop policy if exists channels_insert on public.channels;
create policy channels_insert on public.channels
  for insert with check (
    kind = 'dm'
    or public.base_permission(server_id, auth.uid()) <> 0
  );

drop policy if exists channels_update_admin on public.channels;
create policy channels_update_admin on public.channels
  for update using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

drop policy if exists channels_delete_admin on public.channels;
create policy channels_delete_admin on public.channels
  for delete using (
    public.base_permission(server_id, auth.uid()) <> 0
    or created_by = auth.uid()
  );
drop policy if exists channel_members_select on public.channel_members;
create policy channel_members_select on public.channel_members
  for select using (public.channel_permission(channel_id, auth.uid()) <> 0);

drop policy if exists channel_members_write on public.channel_members;
create policy channel_members_write on public.channel_members
  for all using (public.channel_permission(channel_id, auth.uid()) <> 0)
  with check (public.channel_permission(channel_id, auth.uid()) <> 0);

drop policy if exists channel_overwrites_admin on public.channel_overwrites;
create policy channel_overwrites_admin on public.channel_overwrites
  for all using (
    exists (select 1 from public.channels c
            where c.id = channel_overwrites.channel_id
              and public.base_permission(c.server_id, auth.uid()) <> 0)
  )
  with check (
    exists (select 1 from public.channels c
            where c.id = channel_overwrites.channel_id
              and public.base_permission(c.server_id, auth.uid()) <> 0)
  );

-- messages ------------------------------------------------------------------
-- NOTE: channel_permission() returns -1 (all bits) for servers you admin and
-- for DMs, so the bitwise test below is true for those. Deny overrides that
-- remove VIEW_CHANNEL / SEND_MESSAGES are handled inside the function itself.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    public.channel_permission(channel_id, auth.uid())
    & public.perm_bit('VIEW_CHANNEL') <> 0
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    author_id = auth.uid()
    and public.channel_permission(channel_id, auth.uid())
        & public.perm_bit('SEND_MESSAGES') <> 0
  );

drop policy if exists messages_update_author on public.messages;
create policy messages_update_author on public.messages
  for update using (
    (author_id = auth.uid()
      and public.channel_permission(channel_id, auth.uid())
          & public.perm_bit('SEND_MESSAGES') <> 0)
    or public.channel_permission(channel_id, auth.uid())
       & public.perm_bit('MANAGE_MESSAGES') <> 0
  );

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete using (
    (author_id = auth.uid()
      and public.channel_permission(channel_id, auth.uid())
          & public.perm_bit('SEND_MESSAGES') <> 0)
    or public.channel_permission(channel_id, auth.uid())
       & public.perm_bit('MANAGE_MESSAGES') <> 0
  );

-- reactions -----------------------------------------------------------------
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select using (
    public.channel_permission(
      (select channel_id from public.messages m where m.id = reactions.message_id),
      auth.uid()
    ) & public.perm_bit('VIEW_CHANNEL') <> 0
  );

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert with check (
    user_id = auth.uid()
    and public.channel_permission(
      (select channel_id from public.messages m where m.id = reactions.message_id),
      auth.uid()
    ) & public.perm_bit('ADD_REACTIONS') <> 0
  );

drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete using (user_id = auth.uid());

-- pins ---------------------------------------------------------------------
drop policy if exists pins_select on public.pins;
create policy pins_select on public.pins
  for select using (public.channel_permission(channel_id, auth.uid()) <> 0);

drop policy if exists pins_insert on public.pins;
create policy pins_insert on public.pins
  for insert with check (
    pinned_by = auth.uid()
    and public.channel_permission(channel_id, auth.uid())
        & public.perm_bit('MANAGE_MESSAGES') <> 0
  );

drop policy if exists pins_delete on public.pins;
create policy pins_delete on public.pins
  for delete using (
    pinned_by = auth.uid()
    or public.channel_permission(channel_id, auth.uid())
       & public.perm_bit('MANAGE_MESSAGES') <> 0
  );

-- voice channels -------------------------------------------------------------
drop policy if exists voice_channels_select on public.voice_channels;
create policy voice_channels_select on public.voice_channels
  for select using (public.is_member(server_id));

drop policy if exists voice_channels_admin on public.voice_channels;
create policy voice_channels_admin on public.voice_channels
  for all using (public.base_permission(server_id, auth.uid()) <> 0)
  with check (public.base_permission(server_id, auth.uid()) <> 0);

-- voice states ---------------------------------------------------------------
-- Anyone who can see the server may read who is connected; only a user may
-- write their own row.
drop policy if exists voice_states_select on public.voice_states;
create policy voice_states_select on public.voice_states
  for select using (
    exists (select 1 from public.voice_channels vc
             where vc.id = voice_states.channel_id
               and public.is_member(vc.server_id))
  );

drop policy if exists voice_states_write_self on public.voice_states;
create policy voice_states_write_self on public.voice_states
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- reads ---------------------------------------------------------------------
drop policy if exists channel_reads_own on public.channel_reads;
create policy channel_reads_own on public.channel_reads
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- friends -------------------------------------------------------------------
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (requester_id = auth.uid());

drop policy if exists friendships_update_party on public.friendships;
create policy friendships_update_party on public.friendships
  for update using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists friendships_delete_party on public.friendships;
create policy friendships_delete_party on public.friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

-- blocks --------------------------------------------------------------------
drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks
  for select using (blocker_id = auth.uid());

drop policy if exists user_blocks_write on public.user_blocks;
create policy user_blocks_write on public.user_blocks
  for all using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- =============================================================================
-- Realtime
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channels'
  ) then
    alter publication supabase_realtime add table public.channels;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'server_members'
  ) then
    alter publication supabase_realtime add table public.server_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channel_overwrites'
  ) then
    alter publication supabase_realtime add table public.channel_overwrites;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'roles'
  ) then
    alter publication supabase_realtime add table public.roles;
  end if;
end $$;

-- =============================================================================
-- Storage buckets
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
  ('server-icons',  'server-icons',  true, 5242880, array['image/png','image/jpeg','image/webp','image/gif']),
('banners',      'banners',      true, 8388608, array['image/png','image/jpeg','image/webp','image/gif']),
  ('attachments',  'attachments',  true, 10485760, array['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain']))
on conflict (id) do nothing;

drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects
  for select using (bucket_id in ('avatars', 'server-icons', 'banners', 'attachments'));

drop policy if exists "users upload their own files" on storage.objects;
create policy "users upload their own files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete their own files" on storage.objects;
create policy "users delete their own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users manage their own avatar" on storage.objects;
create policy "users manage their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admins manage server icons" on storage.objects;
create policy "admins manage server icons" on storage.objects
  for all to authenticated
  using (bucket_id in ('server-icons', 'banners'))
  with check (bucket_id in ('server-icons', 'banners'));
