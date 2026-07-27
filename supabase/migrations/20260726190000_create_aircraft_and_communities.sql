-- Issue #6: Migration: aircraft + aircraft_memberships tables + RLS policies
-- Issue #18: Migration: communities table + auto-populate trigger
--
-- Combined into one migration file because #18's trigger fires on `aircraft`
-- inserts, so it has a direct, sequential dependency on #6's `aircraft` table
-- existing first. Landing #18 alongside #6 (rather than waiting for its
-- Phase 5 epic, #16) avoids a backfill migration later, once aircraft rows
-- already exist without a matching community row — approved by the project
-- owner per project-manager's sequencing recommendation.
--
-- Schema per docs/IMPLEMENTATION_SPEC.md §1.2 (aircraft), §1.3
-- (aircraft_memberships), §1.8 (communities); scope/rules per
-- docs/ADDENDUM.md §A (Community Scope Reconciliation) and
-- docs/TDD.md §8.2-8.3, §13 (Security Design).

-- =============================================================================
-- #6: aircraft
-- =============================================================================

create table public.aircraft (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,        -- tail number, e.g. N123AZ
  manufacturer text not null,
  model text not null,
  year integer,
  serial_number text,
  nickname text,
  engine_information text,
  home_airport text,
  primary_photo_url text,
  visibility text not null default 'community'
    check (visibility in ('private','community','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index aircraft_manufacturer_model_idx on public.aircraft (manufacturer, model);

alter table public.aircraft enable row level security;

-- =============================================================================
-- #6: aircraft_memberships
-- =============================================================================

create table public.aircraft_memberships (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  relationship text not null
    check (relationship in ('owner','previous_owner','caretaker')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (aircraft_id, user_id)
);

alter table public.aircraft_memberships enable row level security;

-- =============================================================================
-- #6: RLS helper functions
--
-- Each is SECURITY DEFINER so its internal reads of `aircraft` /
-- `aircraft_memberships` run as the owning (migration) role, which owns both
-- tables and therefore bypasses their RLS — the same "security definer"
-- rationale used for `public_profiles` in #5's migration. This is required,
-- not just a style choice: a policy on `aircraft_memberships` that
-- self-joined `aircraft_memberships` directly (rather than through one of
-- these functions) would hit Postgres's "infinite recursion detected in
-- policy" error, since evaluating the policy for the joined rows would
-- re-trigger the same policy. Routing through a SECURITY DEFINER function
-- breaks that cycle.
-- =============================================================================

-- True if the current user has a membership row on the given aircraft
-- (any relationship, verified or not) — i.e. is a co-owner, caretaker, or
-- previous owner who's still listed as a member.
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
      and m.user_id = auth.uid()
  );
$$;

-- True if the current user is a verified owner of the given aircraft.
-- Backs both the aircraft update policy and "verified owners can add new
-- members" on aircraft_memberships.
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
      and m.user_id = auth.uid()
      and m.relationship = 'owner'
      and m.verified = true
  );
$$;

-- True if the given aircraft has no membership rows at all yet. Backs the
-- "self-insert at aircraft creation" branch of the aircraft_memberships
-- insert policy: the very first membership row on a brand-new aircraft
-- (created in the same onboarding transaction as the aircraft row itself,
-- per docs/IMPLEMENTATION_SPEC.md §1.2/§1.3 — the transaction itself is a
-- separate, later issue) can't yet satisfy is_verified_owner, since no owner
-- row exists to check against.
create or replace function public.aircraft_has_no_members(target_aircraft_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.aircraft_memberships m
    where m.aircraft_id = target_aircraft_id
  );
$$;

-- Implements the §1.2 select rule:
--   - public       -> visible to all
--   - community    -> visible to members of this aircraft, OR to a viewer who
--                     is a verified *owner* of some other aircraft of the
--                     same manufacturer/model (the "community" is the set of
--                     owners of that aircraft type, per PRD §13's "a Piper
--                     PA-38 owner automatically belongs to Piper PA-38
--                     Owners" and IMPLEMENTATION_SPEC.md §1.2's "the viewer
--                     owns an aircraft of the same manufacturer/model" —
--                     read literally as relationship = 'owner', not any
--                     membership row, since it's the ownership relationship
--                     that determines community membership)
--   - private      -> members only
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
        where m.user_id = auth.uid()
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
-- #6: aircraft policies
--
-- All scoped `to authenticated`, not `anon` — consistent with #5's
-- precedent and with the app being entirely sign-in-gated in MVP (no public
-- web view exists yet; PRD §16 lists "public aircraft pages" as a Future
-- Platform, not v1). "Public" visibility here means "visible to every
-- signed-in user," not "visible to anonymous web traffic."
-- =============================================================================

create policy "aircraft_select_can_view"
  on public.aircraft
  for select
  to authenticated
  using (public.can_view_aircraft(id));

-- Any authenticated user may create an aircraft row. Per
-- docs/IMPLEMENTATION_SPEC.md §1.2, aircraft creation is paired with an
-- `owner` membership row in the same transaction — that combined onboarding
-- flow is a separate, later issue; this policy only needs to allow the
-- aircraft insert half of it.
create policy "aircraft_insert_authenticated"
  on public.aircraft
  for insert
  to authenticated
  with check (true);

create policy "aircraft_update_verified_owner"
  on public.aircraft
  for update
  to authenticated
  using (public.is_verified_owner(id))
  with check (public.is_verified_owner(id));

-- No delete policy: deletion has no API-layer path in MVP, per
-- docs/IMPLEMENTATION_SPEC.md §1.2. RLS denies by default absent a policy.

-- =============================================================================
-- #6: aircraft_memberships policies
--
-- Only select + insert are in scope for #6's acceptance criteria. Update
-- (e.g. an owner flipping `verified` to true on a newly added co-owner or
-- caretaker) and delete (removing a member) have no policy yet and are
-- therefore blocked at the API layer until a future issue adds them
-- deliberately — not an oversight.
-- =============================================================================

create policy "aircraft_memberships_select"
  on public.aircraft_memberships
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_aircraft_member(aircraft_id)
  );

create policy "aircraft_memberships_insert"
  on public.aircraft_memberships
  for insert
  to authenticated
  with check (
    -- Self-insert at aircraft creation: the inserting user is adding
    -- themself, and no membership row exists yet for this aircraft.
    (user_id = auth.uid() and public.aircraft_has_no_members(aircraft_id))
    -- Verified owner adding a new member (co-owner, caretaker, etc).
    or public.is_verified_owner(aircraft_id)
  );

-- =============================================================================
-- #18: communities
-- =============================================================================

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null,
  model text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (manufacturer, model)
);

alter table public.communities enable row level security;

-- Readable by any signed-in user; no client-side writes at all (insert,
-- update, delete) — populated exclusively by the trigger below, which runs
-- SECURITY DEFINER and therefore bypasses RLS regardless of policies here.
create policy "communities_select_authenticated"
  on public.communities
  for select
  to authenticated
  using (true);

-- Auto-populate a `communities` row for an aircraft's manufacturer/model the
-- first time it's seen, per docs/IMPLEMENTATION_SPEC.md §1.8 and
-- docs/ADDENDUM.md §A ("automatic membership by aircraft type, no additional
-- setup"). `on conflict do nothing` makes this idempotent for every
-- subsequent aircraft of an already-known manufacturer/model.
--
-- Name convention follows docs/TDD.md §8.8's example verbatim: manufacturer
-- + model + " Owners" (e.g. "Piper PA-38 Owners").
create or replace function public.handle_new_aircraft()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.communities (manufacturer, model, name)
  values (
    new.manufacturer,
    new.model,
    new.manufacturer || ' ' || new.model || ' Owners'
  )
  on conflict (manufacturer, model) do nothing;

  return new;
end;
$$;

create trigger on_aircraft_created
  after insert on public.aircraft
  for each row execute function public.handle_new_aircraft();
