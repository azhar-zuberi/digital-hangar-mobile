-- Phase 5 of docs/clerk-migration-plan.md: every policy/helper/RPC that
-- checked identity via Supabase Auth's auth.uid() now checks the Clerk
-- subject claim instead: (select auth.jwt()->>'sub'). The `select` wrapper
-- matches Supabase's documented pattern for third-party auth policies (and
-- their general auth.jwt()/auth.uid() RLS performance guidance) so it's
-- evaluated once per statement (an initplan) rather than once per row.
--
-- Scope note: docs/clerk-migration-plan.md Phase 5 lists `squawks` and
-- `reminders` alongside the tables below, but neither exists yet as a
-- migration in this repo (confirmed against every file in
-- supabase/migrations/ before writing this) — there is no RLS to rewrite for
-- them. Whichever issue creates those tables should write their RLS with
-- `(select auth.jwt()->>'sub')` directly; nothing to do here.
--
-- What does NOT need a rewrite in this migration, and why: any policy that
-- only calls is_aircraft_member()/is_verified_owner()/can_view_aircraft()
-- (aircraft_select_can_view, aircraft_update_verified_owner,
-- timeline_entries_select/update/delete_member, every timeline_photos_*
-- policy, aircraft_images_*/timeline_images_*/flight_images_* storage
-- policies) picks up the Clerk-aware identity check for free once those
-- three helper functions are replaced below — their own policy SQL never
-- referenced auth.uid() directly. aircraft_insert_authenticated
-- (`with check (true)`), aircraft_has_no_members() (structural only), and
-- communities_select_authenticated (`using (true)`) never referenced
-- auth.uid() either, so they're untouched.

-- =============================================================================
-- Helper functions: is_aircraft_member, is_verified_owner, can_view_aircraft
-- (20260726190000_create_aircraft_and_communities.sql) — same bodies, only
-- the identity check changes. Still SECURITY DEFINER for the same
-- RLS-self-recursion reason documented in that migration.
-- =============================================================================

create or replace function public.is_aircraft_member(target_aircraft_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.aircraft_memberships m
    where m.aircraft_id = target_aircraft_id
      and m.user_id = (select auth.jwt()->>'sub')
  );
$$;

create or replace function public.is_verified_owner(target_aircraft_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.aircraft_memberships m
    where m.aircraft_id = target_aircraft_id
      and m.user_id = (select auth.jwt()->>'sub')
      and m.relationship = 'owner'
      and m.verified = true
  );
$$;

create or replace function public.can_view_aircraft(target_aircraft_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case a.visibility
    when 'public' then true
    when 'community' then (
      public.is_aircraft_member(a.id)
      or exists (
        select 1
        from public.aircraft_memberships m
        join public.aircraft owned on owned.id = m.aircraft_id
        where m.user_id = (select auth.jwt()->>'sub')
          and m.relationship = 'owner'
          and owned.manufacturer = a.manufacturer
          and owned.model = a.model
      )
    )
    when 'private' then public.is_aircraft_member(a.id)
    else false
  end
  from public.aircraft a
  where a.id = target_aircraft_id;
$$;

-- =============================================================================
-- public.users (20260726182211_create_users_and_profile_trigger.sql)
--
-- users_insert_own is new: the SECURITY DEFINER on_auth_user_created trigger
-- that used to be the *only* way to create a users row is retired (previous
-- migration) since it fired on auth.users inserts that Clerk sign-ins never
-- produce. Row creation is now an explicit client upsert after first sign-in
-- (src/features/auth/ensureUserProfile.ts) — safe to allow directly because
-- `(select auth.jwt()->>'sub')` is verified by Supabase against Clerk's JWKS,
-- so a caller can only ever insert a row for their own id, never someone
-- else's, same guarantee the trigger provided.
-- =============================================================================

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (id = (select auth.jwt()->>'sub'));

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (id = (select auth.jwt()->>'sub'))
  with check (id = (select auth.jwt()->>'sub'));

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (id = (select auth.jwt()->>'sub'));

-- =============================================================================
-- public.aircraft_memberships (20260726190000_create_aircraft_and_communities.sql)
-- =============================================================================

drop policy if exists "aircraft_memberships_select" on public.aircraft_memberships;
create policy "aircraft_memberships_select"
  on public.aircraft_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.jwt()->>'sub')
    or public.is_aircraft_member(aircraft_id)
  );

drop policy if exists "aircraft_memberships_insert" on public.aircraft_memberships;
create policy "aircraft_memberships_insert"
  on public.aircraft_memberships
  for insert
  to authenticated
  with check (
    (user_id = (select auth.jwt()->>'sub') and public.aircraft_has_no_members(aircraft_id))
    or public.is_verified_owner(aircraft_id)
  );

-- =============================================================================
-- public.timeline_entries (20260727220000_create_timeline_entries_and_photos.sql)
-- =============================================================================

drop policy if exists "timeline_entries_insert_member" on public.timeline_entries;
create policy "timeline_entries_insert_member"
  on public.timeline_entries
  for insert
  to authenticated
  with check (
    public.is_aircraft_member(aircraft_id)
    and created_by = (select auth.jwt()->>'sub')
  );

-- =============================================================================
-- create_aircraft_with_owner RPC (20260727120000_create_aircraft_with_owner_rpc.sql)
-- Same signature/return type, only the identity check changes.
-- =============================================================================

create or replace function public.create_aircraft_with_owner(
  p_registration text,
  p_manufacturer text,
  p_model text,
  p_nickname text default null,
  p_year integer default null,
  p_serial_number text default null,
  p_engine_information text default null,
  p_home_airport text default null,
  p_primary_photo_url text default null
)
returns public.aircraft
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_aircraft_id uuid := gen_random_uuid();
  v_user_id text := (select auth.jwt()->>'sub');
  v_aircraft public.aircraft;
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to create an aircraft.';
  end if;

  insert into public.aircraft (
    id,
    registration,
    manufacturer,
    model,
    nickname,
    year,
    serial_number,
    engine_information,
    home_airport,
    primary_photo_url
  )
  values (
    v_aircraft_id,
    p_registration,
    p_manufacturer,
    p_model,
    p_nickname,
    p_year,
    p_serial_number,
    p_engine_information,
    p_home_airport,
    p_primary_photo_url
  );

  insert into public.aircraft_memberships (aircraft_id, user_id, relationship, verified)
  values (v_aircraft_id, v_user_id, 'owner', true);

  select * into v_aircraft from public.aircraft where id = v_aircraft_id;

  return v_aircraft;
end;
$$;

-- =============================================================================
-- Storage: profile-images (20260726200000_create_storage_buckets.sql)
--
-- Non-obvious ripple effect, flagged explicitly rather than found late: this
-- bucket's path convention is {user_id}/{filename}, and the existing
-- storage_first_path_uuid() helper casts that path segment to `uuid`,
-- swallowing the cast failure as null (see its own comment). A Clerk user id
-- (e.g. "user_2abc123") is never a valid uuid, so every profile-images path
-- would silently fail that cast and always deny — reusing it here would
-- quietly break profile photo upload/update entirely, not just fail to
-- compile. aircraft-images/timeline-images/flight-images are unaffected and
-- keep using storage_first_path_uuid unchanged: those buckets are keyed by
-- aircraft.id, which stays a native Postgres uuid — this migration doesn't
-- touch the aircraft table's id column at all.
-- =============================================================================

create or replace function public.storage_first_path_text(object_name text)
returns text
language plpgsql
immutable
as $$
declare
  segment text;
begin
  segment := (storage.foldername(object_name))[1];
  return segment;
end;
$$;

drop policy if exists "profile_images_insert" on storage.objects;
create policy "profile_images_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-images'
    and public.storage_first_path_text(name) = (select auth.jwt()->>'sub')
  );

drop policy if exists "profile_images_update" on storage.objects;
create policy "profile_images_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-images'
    and public.storage_first_path_text(name) = (select auth.jwt()->>'sub')
  )
  with check (
    bucket_id = 'profile-images'
    and public.storage_first_path_text(name) = (select auth.jwt()->>'sub')
  );
