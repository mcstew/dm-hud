-- ============================================
-- REPORTS (persistent session/campaign reports)
-- ============================================
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  scope text not null check (scope in ('session', 'campaign')),
  report_data jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_reports_campaign_id on public.reports(campaign_id);
create index idx_reports_session_id on public.reports(session_id);
create index idx_reports_user_id on public.reports(user_id);

-- Enable RLS
alter table public.reports enable row level security;

-- RLS policies (using campaign_owner helper, matching existing patterns)
create policy "Users can read own reports"
  on public.reports for select
  using ((select public.campaign_owner(campaign_id)) = auth.uid() or (select public.is_superuser()));

create policy "Users can insert own reports"
  on public.reports for insert
  with check ((select public.campaign_owner(campaign_id)) = auth.uid());

create policy "Users can delete own reports"
  on public.reports for delete
  using ((select public.campaign_owner(campaign_id)) = auth.uid());
