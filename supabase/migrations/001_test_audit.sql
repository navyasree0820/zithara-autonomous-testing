-- Zithara Playwright audit schema (Supabase)
-- Apply in Supabase SQL editor or via CLI.

create extension if not exists "pgcrypto";

create table if not exists public.test_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  env text not null check (env in ('beta', 'app', 'unknown')),
  git_sha text,
  trigger text not null default 'local'
    check (trigger in ('local', 'ci', 'agent', 'nightly')),
  status text not null default 'running'
    check (status in ('running', 'passed', 'failed', 'aborted')),
  passed int not null default 0,
  failed int not null default 0,
  flaky int not null default 0,
  duration_ms int,
  playwright_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.test_runs (id) on delete cascade,
  title text not null,
  file text,
  tags text[] not null default '{}',
  status text not null,
  retries int not null default 0,
  duration_ms int,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.test_failures (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.test_results (id) on delete cascade,
  dossier_path text,
  trace_url text,
  screenshot_url text,
  video_url text,
  stdout text,
  suggested_owner text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.test_runs (id) on delete set null,
  prompt_summary text,
  files_touched text[],
  verify_command text,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists test_results_run_id_idx on public.test_results (run_id);
create index if not exists test_failures_result_id_idx on public.test_failures (result_id);
create index if not exists test_runs_started_at_idx on public.test_runs (started_at desc);

alter table public.test_runs enable row level security;
alter table public.test_results enable row level security;
alter table public.test_failures enable row level security;
alter table public.agent_actions enable row level security;

-- Service role bypasses RLS. Add read policies for a dashboard role as needed.

insert into storage.buckets (id, name, public)
values ('playwright-dossiers', 'playwright-dossiers', false)
on conflict (id) do nothing;
