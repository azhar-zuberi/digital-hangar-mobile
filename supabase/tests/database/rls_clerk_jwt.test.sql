-- pgTAP RLS regression suite for the Clerk migration (Phase 6 of
-- docs/clerk-migration-plan.md). Run via `supabase test db`.
--
-- Every policy under test now checks (select auth.jwt()->>'sub') instead of
-- Supabase Auth's auth.uid() (20260729100001_rewrite_rls_for_clerk_jwt.sql).
-- Rather than go through PostgREST/an HTTP request, this simulates a signed-
-- in request the same way PostgREST itself does: `set local role
-- authenticated` (the actual Postgres role RLS policies check `to
-- authenticated` against) plus `set local request.jwt.claims` (the GUC
-- auth.jwt() reads — confirmed against the installed auth.jwt() function
-- body, not assumed). This is the fast, SQL-level loop the migration plan
-- asks to prefer over exercising RLS only through the app.
--
-- Whole file runs in one transaction that's rolled back at the end
-- (`begin`/`rollback`), so it never leaves fixture data behind.
begin;

select plan(14);

-- =============================================================================
-- Fixtures (inserted as the postgres/superuser role, before any `set local
-- role`, so these bypass RLS the same way a migration or admin task would).
--
-- alice: verified owner of a private aircraft and a community-visibility
-- aircraft, with one timeline entry and a profile-images object.
-- bob: an unrelated signed-in user with no membership on either aircraft.
-- =============================================================================

insert into public.users (id, display_name) values
  ('user_test_alice', 'Alice Test'),
  ('user_test_bob', 'Bob Test');

insert into public.aircraft (id, registration, manufacturer, model, visibility) values
  ('11111111-1111-1111-1111-111111111111', 'N1TEST', 'Cessna', '172', 'private'),
  ('22222222-2222-2222-2222-222222222222', 'N2TEST', 'Piper', 'PA-28', 'community');

insert into public.aircraft_memberships (aircraft_id, user_id, relationship, verified) values
  ('11111111-1111-1111-1111-111111111111', 'user_test_alice', 'owner', true),
  ('22222222-2222-2222-2222-222222222222', 'user_test_alice', 'owner', true);

insert into public.timeline_entries (id, aircraft_id, created_by, type, title, event_date) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'user_test_alice', 'memory', 'First flight', current_date);

insert into storage.objects (bucket_id, name) values
  ('profile-images', 'user_test_alice/photo.jpg'),
  ('aircraft-images', '11111111-1111-1111-1111-111111111111/hero.jpg');

-- =============================================================================
-- As bob: negative tests — a signed-in user must not read or write another
-- user's private aircraft, membership rows, or storage objects.
-- =============================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"user_test_bob","role":"authenticated"}';

select is(
  (select count(*)::int from public.aircraft where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'bob cannot select alice''s private aircraft'
);

select is(
  (select count(*)::int from public.aircraft_memberships
   where aircraft_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'bob cannot select alice''s membership row on her private aircraft'
);

select is(
  (select count(*)::int from public.timeline_entries
   where aircraft_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'bob cannot select timeline entries on alice''s private aircraft'
);

select is(
  (select count(*)::int from public.users where id = 'user_test_alice'),
  0,
  'bob cannot select alice''s users row (no cross-user select policy)'
);

-- profile-images is intentionally readable by any authenticated user, not
-- just the owner (20260726200000_create_storage_buckets.sql: "mirrors
-- public_profiles... community member lists show profile photos") — this
-- checks bob can see alice's, not that he can't.
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'profile-images' and name = 'user_test_alice/photo.jpg'),
  1,
  'bob can select alice''s profile-images storage object (profile photos are readable by any authenticated user, by design)'
);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'aircraft-images' and name like '11111111-1111-1111-1111-111111111111/%'),
  0,
  'bob cannot select storage objects for alice''s private aircraft'
);

-- Community-visibility aircraft: bob is neither a member nor an owner of
-- another Cessna/172, so this exercises can_view_aircraft's "community"
-- branch's *deny* side, not just its allow side.
select is(
  (select count(*)::int from public.aircraft where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'bob cannot select alice''s community-visibility aircraft (not a member, doesn''t own the same type)'
);

select throws_ok(
  $$insert into public.aircraft_memberships (aircraft_id, user_id, relationship, verified)
    values ('11111111-1111-1111-1111-111111111111', 'user_test_bob', 'caretaker', false)$$,
  '42501',
  null,
  'bob cannot insert himself as a member of alice''s aircraft'
);

select throws_ok(
  $$insert into public.users (id, display_name) values ('user_test_alice', 'Impersonated')$$,
  '42501',
  null,
  'bob cannot insert/overwrite a users row under alice''s id'
);

-- users_insert_own checks id = the caller's own jwt sub, so this must
-- authenticate as the id being inserted (bob's fixture row already exists
-- under user_test_bob, so a fresh id needs a matching fresh sub).
set local request.jwt.claims to '{"sub":"user_test_bob_new","role":"authenticated"}';

select lives_ok(
  $$insert into public.users (id, display_name) values ('user_test_bob_new', 'Bob New')$$,
  'bob can insert a users row under his own id (users_insert_own)'
);

set local request.jwt.claims to '{"sub":"user_test_bob","role":"authenticated"}';

update public.aircraft set nickname = 'Hacked by bob'
  where id = '11111111-1111-1111-1111-111111111111';

-- =============================================================================
-- Back to postgres to verify bob's blocked update truly affected nothing —
-- an UPDATE whose WHERE clause is filtered to zero rows by RLS doesn't raise
-- an error, it just updates zero rows, so this has to be checked as a
-- separate assertion rather than throws_ok above.
-- =============================================================================
reset role;

select is(
  (select nickname from public.aircraft where id = '11111111-1111-1111-1111-111111111111'),
  null,
  'alice''s aircraft nickname is unchanged after bob''s blocked update attempt'
);

-- =============================================================================
-- As alice: positive tests — the verified owner can still read/write what
-- she owns; nothing above over-restricted her own access.
-- =============================================================================
set local role authenticated;
set local request.jwt.claims to '{"sub":"user_test_alice","role":"authenticated"}';

select is(
  (select count(*)::int from public.aircraft where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice can select her own private aircraft'
);

update public.aircraft set nickname = 'Skyhawk'
  where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select nickname from public.aircraft where id = '11111111-1111-1111-1111-111111111111'),
  'Skyhawk',
  'alice, as verified owner, can update her own aircraft'
);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'profile-images' and name = 'user_test_alice/photo.jpg'),
  1,
  'alice can select her own profile-images storage object'
);

select * from finish();
rollback;
