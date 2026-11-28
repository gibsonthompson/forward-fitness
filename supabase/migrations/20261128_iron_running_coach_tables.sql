-- Applied to the production Supabase project on 2026-11-28 via migration "iron_running_coach_tables".
-- Running coach tables (docs/running-coach.md section 7). user_id is text, compared as auth.uid()::text.

create table public.iron_run_goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid())::text,
  distance_m numeric not null check (distance_m > 0),
  target_time_s integer not null check (target_time_s > 0),
  goal_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned', 'replaced')),
  setup jsonb not null default '{}'::jsonb, -- days per week, long run day, experience, units, safety screen answers
  created_at timestamptz not null default now()
);
create unique index iron_run_goals_one_active on public.iron_run_goals (user_id) where status = 'active';

create table public.iron_run_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid())::text,
  goal_id uuid not null references public.iron_run_goals(id) on delete cascade,
  active boolean not null default true,
  phases jsonb not null default '[]'::jsonb,
  current_vdot numeric not null check (current_vdot > 0),
  paces jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create unique index iron_run_plans_one_active on public.iron_run_plans (goal_id) where active;
create index iron_run_plans_user on public.iron_run_plans (user_id);

create table public.iron_run_plan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid())::text,
  plan_id uuid not null references public.iron_run_plans(id) on delete cascade,
  date date not null,
  type text not null check (type in ('easy','long','threshold','interval','repetition','race-pace','strides','rest','strength','race','time-trial')),
  structure jsonb not null default '{}'::jsonb, -- warmup, reps, recovery, cooldown, work
  target_pace jsonb, -- { fast, slow } seconds per km
  distance_m numeric check (distance_m is null or distance_m >= 0),
  duration_s integer check (duration_s is null or duration_s >= 0),
  purpose text,
  status text not null default 'planned' check (status in ('planned','done','skipped','moved','swapped')),
  created_at timestamptz not null default now()
);
create index iron_run_plan_sessions_plan_date on public.iron_run_plan_sessions (plan_id, date);
create index iron_run_plan_sessions_user_date on public.iron_run_plan_sessions (user_id, date);

create table public.iron_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid())::text,
  date date not null default current_date,
  distance_m numeric not null check (distance_m > 0),
  duration_s integer not null check (duration_s > 0),
  moving_s integer check (moving_s is null or moving_s > 0),
  rpe numeric check (rpe is null or (rpe >= 0 and rpe <= 10)),
  pain text not null default 'none' check (pain in ('none','mild','affected')),
  notes text,
  source text not null default 'manual' check (source in ('manual','gps','healthkit')),
  route text, -- encoded polyline
  splits jsonb,
  work_pace_s_per_km numeric check (work_pace_s_per_km is null or work_pace_s_per_km > 0),
  implied_vdot numeric, -- set when a quality session counts as a fitness signal
  plan_session_id uuid references public.iron_run_plan_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index iron_runs_user_date on public.iron_runs (user_id, date desc);
create index iron_runs_plan_session on public.iron_runs (plan_session_id);

create table public.iron_fitness_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid())::text,
  date date not null default current_date,
  vdot numeric check (vdot is null or vdot > 0),
  critical_speed_mps numeric check (critical_speed_mps is null or critical_speed_mps > 0),
  d_prime_m numeric,
  source text not null check (source in ('race','time-trial','inferred','setup')),
  run_id uuid references public.iron_runs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index iron_fitness_estimates_user_date on public.iron_fitness_estimates (user_id, date desc);

create table public.iron_plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.uid())::text,
  plan_id uuid not null references public.iron_run_plans(id) on delete cascade,
  run_id uuid references public.iron_runs(id) on delete set null,
  kind text not null,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index iron_plan_changes_plan on public.iron_plan_changes (plan_id, created_at desc);
create index iron_plan_changes_user on public.iron_plan_changes (user_id);
create index iron_plan_changes_run on public.iron_plan_changes (run_id);
create index iron_run_plans_goal on public.iron_run_plans (goal_id);
create index iron_fitness_estimates_run on public.iron_fitness_estimates (run_id);

-- Row level security: every table is private to its owner.
do $$
declare t text;
begin
  foreach t in array array['iron_run_goals','iron_run_plans','iron_run_plan_sessions','iron_runs','iron_fitness_estimates','iron_plan_changes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (((select auth.uid()))::text = user_id) with check (((select auth.uid()))::text = user_id)', t);
  end loop;
end $$;
