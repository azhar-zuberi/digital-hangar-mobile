-- Phase 4 of docs/clerk-migration-plan.md: repoint public.users.id from a
-- Supabase auth.users(id) UUID foreign key to a plain text column holding
-- the Clerk user id (e.g. "user_2abc123..."). Clerk is now the identity
-- provider — Supabase's own auth.users table is no longer populated by
-- sign-in at all (Supabase's Third-Party Auth validates Clerk's session
-- token directly via JWKS, see supabase/config.toml), so the FK to it and
-- the trigger that populated public.users from its inserts are both retired
-- here.
--
-- Data handling: the only rows in these tables are pre-launch QA sign-in
-- test accounts (see 20260727210000_backfill_missing_public_users.sql's own
-- comment for the history) — confirmed with the project owner, who chose to
-- wipe rather than attempt a manual UUID -> Clerk-id remap (there is no
-- Clerk id to remap *to* for an account that only ever existed in Supabase
-- Auth). Wiping cascades to every row that transitively depends on a
-- users.id — aircraft_memberships, timeline_entries/timeline_photos, and the
-- aircraft rows those test accounts created — rather than leaving orphaned
-- rows behind that can never match a future Clerk id. This is a judgment
-- call beyond the literal "wipe the users rows" instruction, flagged
-- explicitly rather than decided silently: aircraft/timeline rows solely
-- reachable through those test users would otherwise dangle post-migration.
--
-- This does NOT reach Storage (images already uploaded by test accounts) —
-- Storage objects aren't touched by a SQL migration; any orphaned test
-- images under the aircraft-images/timeline-images buckets need manual
-- cleanup via the Supabase dashboard or Storage API, called out separately
-- in this migration's PR/report, not attempted here.
truncate table
  public.timeline_photos,
  public.timeline_entries,
  public.aircraft_memberships,
  public.aircraft,
  public.users
cascade;

delete from auth.users;

-- =============================================================================
-- Retire the auth.users-driven profile-creation trigger. Clerk sign-ins
-- never create an auth.users row, so this trigger can never fire again.
-- Profile-row creation moves to an explicit client upsert after first
-- sign-in (src/features/auth/ensureUserProfile.ts), gated by the new
-- users_insert_own RLS policy added in
-- 20260729100001_rewrite_rls_for_clerk_jwt.sql, rather than a
-- SECURITY DEFINER trigger on an event that no longer happens.
-- =============================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- =============================================================================
-- public.users: id becomes a plain Clerk user id string, not a Supabase
-- auth.users UUID foreign key. Drop the old PK (which drops its implicit FK
-- to auth.users along with it, since that FK was declared inline on the same
-- column) before changing the column's type, then re-add the PK.
-- Postgres won't ALTER COLUMN TYPE on a column any policy's USING/WITH CHECK
-- expression references directly (independent of the FK/PK dependency this
-- migration already cascades) — drop those specific policies first. Phase 5
-- (20260729100001_rewrite_rls_for_clerk_jwt.sql) recreates all three against
-- the Clerk JWT claim; there is no gap in practice since both migrations
-- always apply together in one push/reset.
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_update_own" on public.users;

-- public_profiles (20260726182211) also depends on users.id directly (its
-- `_RETURN` rule selects the column), so it has to go the same way as the
-- policies above — dropped before the ALTER, recreated identically after
-- (its own definition doesn't change; only the underlying column's type
-- does).
drop view if exists public.public_profiles;

-- =============================================================================
-- users_pkey (primary key) and users_id_fkey (the `references auth.users(id)
-- on delete cascade` clause) are two distinct constraint objects even though
-- both were declared inline on the same `id` column definition — dropping
-- one doesn't cascade to the other, both have to go explicitly.
alter table public.users
  drop constraint users_pkey cascade;

alter table public.users
  drop constraint users_id_fkey;

alter table public.users
  alter column id type text using id::text;

alter table public.users
  add constraint users_pkey primary key (id);

create view public.public_profiles
  with (security_invoker = false)
  as
    select
      id,
      display_name,
      profile_photo_url
    from public.users;

revoke all on public.public_profiles from public;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- =============================================================================
-- Every table with a user_id/created_by reference to public.users(id) needs
-- the matching column type change — schema/FK only, no change to
-- Aircraft/Timeline business logic (CLAUDE.md). Their FK constraints
-- (aircraft_memberships_user_id_fkey, timeline_entries_created_by_fkey) are
-- already gone at this point — `drop constraint users_pkey cascade` above
-- took them with it, since both required the now-dropped users_pkey unique
-- constraint on the table they reference. Only the explicit re-add below is
-- needed, not a drop first.
-- =============================================================================
drop policy if exists "aircraft_memberships_select" on public.aircraft_memberships;
drop policy if exists "aircraft_memberships_insert" on public.aircraft_memberships;

alter table public.aircraft_memberships
  alter column user_id type text using user_id::text;

alter table public.aircraft_memberships
  add constraint aircraft_memberships_user_id_fkey
    foreign key (user_id) references public.users(id) on delete cascade;

drop policy if exists "timeline_entries_insert_member" on public.timeline_entries;

alter table public.timeline_entries
  alter column created_by type text using created_by::text;

alter table public.timeline_entries
  add constraint timeline_entries_created_by_fkey
    foreign key (created_by) references public.users(id);
