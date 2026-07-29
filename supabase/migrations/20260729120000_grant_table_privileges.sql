-- Not part of the Clerk migration itself — a pre-existing gap surfaced while
-- building the first local Supabase CLI test harness for this project
-- (needed to run supabase/tests/database/rls_clerk_jwt.test.sql locally).
--
-- Every app table in this schema relies on RLS policies scoped `to
-- authenticated` (or `anon, authenticated` for _health_check), but none of
-- the migrations that created these tables ever issued an explicit GRANT to
-- those roles. `information_schema.role_table_grants` confirms `authenticated`
-- currently has only TRUNCATE/REFERENCES/TRIGGER on every one of them (default
-- privileges Postgres grants automatically) — no SELECT/INSERT/UPDATE/DELETE
-- at all. RLS policies are evaluated *after* the base table-privilege check;
-- without the grant, every query fails with "permission denied for table X"
-- before RLS is even consulted, regardless of how correct the policy is.
--
-- This has been silently masked so far because the linked remote dev project
-- (aocmjvqsdrdftubpxrnk) still exposes public-schema tables via Supabase's
-- legacy `auto_expose_new_tables` behavior (see the commented-out setting and
-- its own removal note in supabase/config.toml's [api] section) — which
-- Supabase is retiring entirely on 2026-10-30. After that date, every table
-- below would stop being reachable via the API at all unless grants are
-- explicit, Clerk or no Clerk. Flagging this prominently rather than fixing
-- it quietly: it's a real, time-boxed risk independent of this migration,
-- and worth the project owner's attention regardless of Clerk.
--
-- Grants below match exactly the operations each table already has a policy
-- for (see the RLS migrations) — no table gets a broader grant than its
-- existing policies exercise. RLS remains the actual authorization layer;
-- these grants only clear the table-privilege check that sits in front of it.
grant select, insert, update on public.aircraft to authenticated;
grant select, insert on public.aircraft_memberships to authenticated;
grant select on public.communities to authenticated;
grant select, insert, update, delete on public.timeline_entries to authenticated;
grant select, insert, update, delete on public.timeline_photos to authenticated;
grant select, insert, update on public.users to authenticated;
grant select on public._health_check to anon, authenticated;
