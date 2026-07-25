-- Issue #2: Wire Supabase project: env config + typed client.
--
-- This is a throwaway smoke-test table, NOT the start of the domain schema.
-- The real domain schema (users, aircraft, aircraft_memberships, timeline_entries,
-- squawks, reminders, communities, flights, ...) is specced in
-- docs/IMPLEMENTATION_SPEC.md §1 and lands via separate issues (#5 users/aircraft,
-- #6 timeline/care, #18 communities, etc). Do not add domain columns here.
--
-- Purpose: let a fresh developer confirm end-to-end connectivity (migration
-- applied, RLS working, typed client + anon key able to query) before any real
-- schema exists. See scripts/smoke-test-supabase.js and the README "Local
-- Supabase setup" section.

create table public._health_check (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  checked_at timestamptz not null default now()
);

alter table public._health_check enable row level security;

-- No auth required to read this table — it holds no sensitive data and exists
-- solely to prove the anon key can reach Postgres through RLS. Every other
-- table in the real schema gets purpose-built RLS per IMPLEMENTATION_SPEC.md §1;
-- this permissive policy is specific to this smoke-test table only.
create policy "health_check_select_anyone"
  on public._health_check
  for select
  to anon, authenticated
  using (true);

insert into public._health_check (label) values ('digital-hangar smoke test seed row');
