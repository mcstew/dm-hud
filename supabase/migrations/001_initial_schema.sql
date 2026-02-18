-- ============================================
-- DM HUD Database Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  key_mode text not null default 'managed' check (key_mode in ('managed', 'byok')),
  anthropic_key_encrypted text,
  deepgram_key_encrypted text,
  is_superuser boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- CAMPAIGNS
-- ============================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  dm_context text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaigns_user_id on public.campaigns(user_id);

-- ============================================
-- SESSIONS
-- ============================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_sessions_campaign_id on public.sessions(campaign_id);

-- ============================================
-- CARDS
-- ============================================
create table public.cards (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  type text not null default 'CHARACTER' check (type in ('CHARACTER', 'LOCATION', 'ITEM', 'PLOT')),
  name text not null,
  notes text not null default '',
  is_canon boolean not null default true,
  is_pc boolean not null default false,
  in_party boolean not null default false,
  is_hostile boolean not null default false,
  in_combat boolean not null default false,
  hp_current integer,
  hp_max integer,
  ac integer,
  level integer,
  class text,
  stats jsonb not null default '{}',
  status text[] not null default '{}',
  riffs jsonb not null default '{}',
  canon_facts text[] not null default '{}',
  genesis text,
  count integer not null default 1,
  image text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_in_session uuid references public.sessions(id) on delete set null
);

create index idx_cards_campaign_id on public.cards(campaign_id);
create index idx_cards_session_id on public.cards(session_id);
create index idx_cards_voided on public.cards(campaign_id) where voided_at is null;

-- ============================================
-- PLAYER ROSTER
-- ============================================
create table public.player_roster (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  player_name text not null,
  character_name text not null,
  character_id uuid references public.cards(id) on delete set null,
  aliases text[] not null default '{}'
);

create index idx_player_roster_campaign_id on public.player_roster(campaign_id);

-- ============================================
-- TRANSCRIPT ENTRIES
-- ============================================
create table public.transcript_entries (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  speaker text not null,
  text text not null,
  timestamp text not null,
  created_at timestamptz not null default now()
);

create index idx_transcript_entries_session_id on public.transcript_entries(session_id);

-- ============================================
-- EVENTS
-- ============================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  character text not null,
  type text not null check (type in ('check', 'save', 'attack', 'discovery', 'levelup', 'story')),
  detail text not null,
  outcome text check (outcome in ('success', 'fail', 'critical', 'fumble', null)),
  created_at timestamptz not null default now()
);

create index idx_events_session_id on public.events(session_id);

-- ============================================
-- AI LOGS (for admin observability)
-- ============================================
create table public.ai_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  function_type text not null check (function_type in ('entity_extraction', 'riff', 'report', 'polish')),
  model text not null,
  system_prompt text,
  user_prompt text not null,
  response_text text,
  parsed_result jsonb,
  tokens_in integer,
  tokens_out integer,
  duration_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index idx_ai_logs_user_id on public.ai_logs(user_id);
create index idx_ai_logs_campaign_id on public.ai_logs(campaign_id);
create index idx_ai_logs_created_at on public.ai_logs(created_at desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.sessions enable row level security;
alter table public.cards enable row level security;
alter table public.player_roster enable row level security;
alter table public.transcript_entries enable row level security;
alter table public.events enable row level security;
alter table public.ai_logs enable row level security;

-- Helper: check if current user is superuser
create or replace function public.is_superuser()
returns boolean as $$
  select coalesce(
    (select is_superuser from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;

-- Helper: get campaign owner
create or replace function public.campaign_owner(campaign_uuid uuid)
returns uuid as $$
  select user_id from public.campaigns where id = campaign_uuid;
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_superuser());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Superusers can update any profile"
  on public.profiles for update
  using (public.is_superuser());

-- CAMPAIGNS policies
create policy "Users can read own campaigns"
  on public.campaigns for select
  using (user_id = auth.uid() or public.is_superuser());

create policy "Users can insert own campaigns"
  on public.campaigns for insert
  with check (user_id = auth.uid());

create policy "Users can update own campaigns"
  on public.campaigns for update
  using (user_id = auth.uid());

create policy "Users can delete own campaigns"
  on public.campaigns for delete
  using (user_id = auth.uid());

-- SESSIONS policies
create policy "Users can read own sessions"
  on public.sessions for select
  using (public.campaign_owner(campaign_id) = auth.uid() or public.is_superuser());

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (public.campaign_owner(campaign_id) = auth.uid());

create policy "Users can update own sessions"
  on public.sessions for update
  using (public.campaign_owner(campaign_id) = auth.uid());

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (public.campaign_owner(campaign_id) = auth.uid());

-- CARDS policies
create policy "Users can read own cards"
  on public.cards for select
  using (public.campaign_owner(campaign_id) = auth.uid() or public.is_superuser());

create policy "Users can insert own cards"
  on public.cards for insert
  with check (public.campaign_owner(campaign_id) = auth.uid());

create policy "Users can update own cards"
  on public.cards for update
  using (public.campaign_owner(campaign_id) = auth.uid());

create policy "Users can delete own cards"
  on public.cards for delete
  using (public.campaign_owner(campaign_id) = auth.uid());

-- PLAYER ROSTER policies
create policy "Users can read own roster"
  on public.player_roster for select
  using (public.campaign_owner(campaign_id) = auth.uid() or public.is_superuser());

create policy "Users can insert own roster"
  on public.player_roster for insert
  with check (public.campaign_owner(campaign_id) = auth.uid());

create policy "Users can update own roster"
  on public.player_roster for update
  using (public.campaign_owner(campaign_id) = auth.uid());

create policy "Users can delete own roster"
  on public.player_roster for delete
  using (public.campaign_owner(campaign_id) = auth.uid());

-- TRANSCRIPT ENTRIES policies
create policy "Users can read own transcripts"
  on public.transcript_entries for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = transcript_entries.session_id
      and (c.user_id = auth.uid() or public.is_superuser())
    )
  );

create policy "Users can insert own transcripts"
  on public.transcript_entries for insert
  with check (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = transcript_entries.session_id
      and c.user_id = auth.uid()
    )
  );

-- EVENTS policies
create policy "Users can read own events"
  on public.events for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = events.session_id
      and (c.user_id = auth.uid() or public.is_superuser())
    )
  );

create policy "Users can insert own events"
  on public.events for insert
  with check (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = events.session_id
      and c.user_id = auth.uid()
    )
  );

-- AI LOGS policies
create policy "Users can read own ai logs"
  on public.ai_logs for select
  using (user_id = auth.uid() or public.is_superuser());

create policy "Service role can insert ai logs"
  on public.ai_logs for insert
  with check (true);  -- Edge Functions use service role

-- ============================================
-- UPDATE LAST ACTIVE TIMESTAMP
-- ============================================
create or replace function public.update_last_active()
returns trigger as $$
begin
  update public.profiles
  set last_active_at = now()
  where id = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on campaign updates (good proxy for activity)
create trigger on_campaign_activity
  after insert or update on public.campaigns
  for each row execute function public.update_last_active();
