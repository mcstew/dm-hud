-- ============================================
-- PROFILE SECURITY + USAGE VISIBILITY
-- ============================================

-- Direct profile updates are too broad because profiles contains privileged
-- fields such as key_mode and is_superuser. Use narrowly-scoped RPCs instead.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Superusers can update any profile" on public.profiles;

revoke update on public.profiles from anon, authenticated;

create or replace function public.update_own_profile_settings(
  p_display_name text default null,
  p_anthropic_key text default null,
  p_deepgram_key text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    display_name = coalesce(p_display_name, display_name),
    anthropic_key_encrypted = coalesce(p_anthropic_key, anthropic_key_encrypted),
    deepgram_key_encrypted = coalesce(p_deepgram_key, deepgram_key_encrypted),
    last_active_at = now()
  where id = v_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_key_mode text default null,
  p_is_superuser boolean default null,
  p_display_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (select public.is_superuser()) then
    raise exception 'Admin access required';
  end if;

  if p_key_mode is not null and p_key_mode not in ('managed', 'byok') then
    raise exception 'Invalid key_mode';
  end if;

  update public.profiles
  set
    key_mode = coalesce(p_key_mode, key_mode),
    is_superuser = coalesce(p_is_superuser, is_superuser),
    display_name = coalesce(p_display_name, display_name)
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.touch_profile_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set last_active_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.update_own_profile_settings(text, text, text) to authenticated;
grant execute on function public.admin_update_profile(uuid, text, boolean, text) to authenticated;
grant execute on function public.touch_profile_activity() to authenticated;

-- ============================================
-- USAGE EVENTS
-- ============================================

create table if not exists public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  event_type text not null check (
    event_type in (
      'app_open',
      'live_transcription_started',
      'live_transcription_seconds',
      'file_transcription_seconds',
      'file_transcription_upload',
      'transcription_error'
    )
  ),
  provider text,
  model text,
  quantity numeric,
  unit text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_id on public.usage_events(user_id);
create index if not exists idx_usage_events_campaign_id on public.usage_events(campaign_id);
create index if not exists idx_usage_events_session_id on public.usage_events(session_id);
create index if not exists idx_usage_events_created_at on public.usage_events(created_at desc);
create index if not exists idx_usage_events_type_created_at on public.usage_events(event_type, created_at desc);

alter table public.usage_events enable row level security;

create policy "Users can read own usage events"
  on public.usage_events for select
  using (user_id = auth.uid() or (select public.is_superuser()));

create policy "Service role can insert usage events"
  on public.usage_events for insert
  with check (true);

create or replace function public.record_usage_event(
  p_event_type text,
  p_campaign_id uuid default null,
  p_session_id uuid default null,
  p_provider text default null,
  p_model text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.usage_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.usage_events;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_campaign_id is not null and public.campaign_owner(p_campaign_id) is distinct from v_user_id then
    raise exception 'Campaign access denied';
  end if;

  if p_session_id is not null and not exists (
    select 1
    from public.sessions s
    join public.campaigns c on c.id = s.campaign_id
    where s.id = p_session_id
      and c.user_id = v_user_id
  ) then
    raise exception 'Session access denied';
  end if;

  insert into public.usage_events (
    user_id,
    campaign_id,
    session_id,
    event_type,
    provider,
    model,
    quantity,
    unit,
    metadata
  )
  values (
    v_user_id,
    p_campaign_id,
    p_session_id,
    p_event_type,
    p_provider,
    p_model,
    p_quantity,
    p_unit,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_event;

  update public.profiles
  set last_active_at = now()
  where id = v_user_id;

  return v_event;
end;
$$;

grant execute on function public.record_usage_event(text, uuid, uuid, text, text, numeric, text, jsonb) to authenticated;
