-- Issue #5: Migration: users table + RLS, and profile row creation on first sign-in.
--
-- Schema per docs/IMPLEMENTATION_SPEC.md §1.1. `public.users` is the app-level
-- profile row; `auth.users` (Supabase Auth) remains the sole source of
-- identity. Per docs/TDD.md §2.3 ("Identity Belongs to the Owner") and
-- docs/ADDENDUM.md §D, public.users.id is always auth.users.id — it never
-- depends on which auth provider (Apple/Google) was used, and Supabase's
-- built-in identity linking (same verified email) means one auth.users row,
-- and therefore one public.users row, per person in the common case.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  profile_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- RLS: a user can select/update only their own row. There is deliberately no
-- insert or delete policy for the authenticated/anon roles — row creation
-- happens exclusively via the handle_new_user() trigger below (SECURITY
-- DEFINER, owned by the migration role, so it bypasses RLS), and deletion
-- happens only as an `on delete cascade` from auth.users. This keeps profile
-- creation server-controlled rather than trusting the client to insert its
-- own row with an arbitrary id.
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Restricted view for rendering *other* users' display_name/profile_photo_url
-- in community contexts (e.g. member lists) — never the full public.users
-- row. Per docs/IMPLEMENTATION_SPEC.md §1.1.
--
-- This relies on the standard Postgres/Supabase "security definer view"
-- pattern: a view's underlying-table access is checked against the view's
-- *owner* (the migration role here, which owns public.users and therefore
-- bypasses that table's RLS as the table owner), not against the querying
-- role — so authenticated users can see every row's public columns through
-- this view even though the base table's RLS would otherwise limit them to
-- their own row. `security_invoker = false` is the Postgres default; set
-- explicitly here so that intent survives a future Postgres upgrade.
create view public.public_profiles
  with (security_invoker = false)
  as
    select
      id,
      display_name,
      profile_photo_url
    from public.users;

-- Community member lists are an authenticated, in-app feature — not exposed
-- to signed-out (anon) traffic. Revoke first in case default privileges on
-- the public schema would otherwise grant anon/public access to a newly
-- created relation, then grant only what's intended.
revoke all on public.public_profiles from public;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- Idempotent profile-row creation on first sign-in (Apple or Google).
--
-- A trigger on auth.users insert — rather than an app-level "upsert on
-- sign-in" call — so this can't be skipped by a future auth entry point
-- forgetting to call it, and so it's atomic with account creation itself.
-- auth.users gets a new row only the first time a given identity signs in
-- (Supabase's built-in identity linking reuses the existing row for a
-- returning user or a second provider with the same verified email — see
-- docs/ADDENDUM.md §D), so this fires at most once per person in the common
-- case; `on conflict do nothing` makes a duplicate insert a no-op rather than
-- an error regardless.
--
-- display_name default is best-effort from whatever the provider's id token
-- exposed as user_metadata (Supabase populates this from standard OIDC
-- claims on signInWithIdToken): Google reliably includes `name`; Apple's id
-- token carries no name claim at all (Apple only returns full name via the
-- native authorization credential, on the very first authorization, and
-- issue #3/#4's client code does not currently forward it to Supabase — a
-- pre-existing gap, not introduced here). Falling back to the email's local
-- part, then a generic placeholder, keeps display_name non-null and editable
-- later, per the acceptance criteria.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, profile_photo_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'given_name'), ''),
      nullif(trim(split_part(new.email, '@', 1)), ''),
      'New Member'
    ),
    nullif(trim(new.raw_user_meta_data ->> 'picture'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
