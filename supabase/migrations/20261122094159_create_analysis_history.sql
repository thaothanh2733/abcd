create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  sanitized_preview text not null default '',
  alert_level text not null,
  scenario text,
  detected_signs jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analysis_history_session_created_idx
  on public.analysis_history (session_id, created_at desc);

alter table public.analysis_history enable row level security;

revoke all on table public.analysis_history from anon, authenticated;
grant all on table public.analysis_history to service_role;
