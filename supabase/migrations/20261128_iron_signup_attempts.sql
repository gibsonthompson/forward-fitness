-- Applied to the production Supabase project on 2026-11-28 via migration "iron_signup_attempts".
-- Per-IP signup rate limiting for the ff-signup edge function. Only a salted hash of the IP is stored.
-- RLS on with no policies: only the service role (the edge function) can read or write.
create table public.iron_signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index iron_signup_attempts_ip_time on public.iron_signup_attempts (ip_hash, created_at desc);
alter table public.iron_signup_attempts enable row level security;
