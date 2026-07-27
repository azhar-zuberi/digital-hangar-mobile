-- One-time backfill for public.users rows missing on auth.users accounts
-- created before the on_auth_user_created trigger existed
-- (20260726182211_create_users_and_profile_trigger.sql, added 2026-07-26
-- 18:22). Any account signed up before that timestamp (e.g. the #3/#4
-- sign-in testing accounts from 2026-07-25) has an auth.users row but no
-- corresponding public.users row, which breaks anything with a foreign key
-- to public.users — e.g. issue #9's create_aircraft_with_owner RPC fails
-- inserting into aircraft_memberships with "violates foreign key constraint
-- aircraft_memberships_user_id_fkey" for these accounts.
--
-- Mirrors handle_new_user()'s exact name-resolution logic so a backfilled
-- row is indistinguishable from one the trigger would have created at
-- signup time. `on conflict (id) do nothing` makes this safe to run
-- repeatedly and a no-op for any environment where the trigger already
-- caught every account (i.e. everywhere except this dev project's early
-- test accounts).
insert into public.users (id, display_name, profile_photo_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'given_name'), ''),
    nullif(trim(split_part(u.email, '@', 1)), ''),
    'New Member'
  ),
  nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
from auth.users u
left join public.users pu on pu.id = u.id
where pu.id is null
on conflict (id) do nothing;
