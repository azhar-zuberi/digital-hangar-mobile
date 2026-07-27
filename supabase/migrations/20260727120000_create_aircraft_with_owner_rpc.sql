-- Issue #9: Onboarding — aircraft creation + owner membership transaction.
--
-- "Add My Aircraft" (docs/IMPLEMENTATION_SPEC.md §2, Onboarding step 3-4)
-- needs the new `aircraft` row and the creator's `owner` `aircraft_memberships`
-- row to appear together, with no window where one exists without the other.
-- Two independent client-side inserts (even wrapped in a client-managed
-- "transaction") can't guarantee that over HTTP — a dropped connection
-- between the two requests would leave an orphan. A single Postgres
-- function does: the entire function body runs as one statement from
-- PostgREST's point of view, so any unhandled exception (e.g. the
-- `aircraft.registration` unique violation on a duplicate tail number) rolls
-- back everything the function did, including the `aircraft` insert, not
-- just the `aircraft_memberships` insert that would have come after it.
--
-- Deliberately `security invoker` (the default — stated explicitly so intent
-- survives a Postgres upgrade), unlike the `is_aircraft_member` /
-- `is_verified_owner` / `can_view_aircraft` / `aircraft_has_no_members`
-- helpers in 20260726190000, which are `security definer` specifically to
-- break RLS self-recursion when *read* as part of a policy. This function
-- doesn't read through a recursive policy — it only performs the two inserts
-- the acceptance criteria call for — and both are already permitted for the
-- calling user by the existing `aircraft_insert_authenticated` and
-- `aircraft_memberships_insert` (self-insert branch, via
-- `aircraft_has_no_members`) policies from that same migration. Running as
-- invoker means RLS is still enforced for real inside this function, rather
-- than trusting the function body alone to only ever do the right thing —
-- defense in depth, not just convenience.
--
-- `p_primary_photo_url` is accepted but expected to be null at call time in
-- the real onboarding flow: the `aircraft-images` Storage bucket's insert
-- policy (20260726200000) requires `is_verified_owner(aircraft_id)`, which
-- can't be true until the owner membership row below exists — so the photo
-- itself can only be uploaded (Storage is a separate HTTP surface, not SQL,
-- so it can't happen inside this same function/transaction) *after* this
-- function returns the new aircraft id, then attached with a normal
-- `update aircraft set primary_photo_url = ... where id = ...`, which the
-- pre-existing `aircraft_update_verified_owner` policy already allows once
-- the membership row is in place. The parameter exists for completeness/
-- forward-compatibility (e.g. reusing an already-uploaded path), not because
-- issue #9's flow uses it. See src/services/aircraftService.ts for the
-- client-side sequencing this implies.
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
  -- Generated up front (rather than reading it back via `insert ...
  -- returning`) to sidestep a real RLS trap: Postgres re-checks a row
  -- against the table's SELECT policy whenever a RETURNING clause is
  -- present — not just the INSERT policy's WITH CHECK — and
  -- `aircraft_select_can_view` (-> can_view_aircraft) for a fresh
  -- `community`-visibility aircraft is false until the owner membership row
  -- below exists (its creator isn't a member yet, and doesn't necessarily
  -- already own another aircraft of the same manufacturer/model). An
  -- `insert ... returning` here would fail RLS even though the insert
  -- itself is allowed by `aircraft_insert_authenticated`'s `with check
  -- (true)`. Plain inserts (no RETURNING) are only subject to the INSERT
  -- policy, so neither insert below hits this.
  v_aircraft_id uuid := gen_random_uuid();
  v_aircraft public.aircraft;
begin
  if auth.uid() is null then
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

  -- Owner membership for the creator, per §1.3: "The user who creates an
  -- aircraft gets relationship = 'owner', verified = true automatically."
  -- Satisfies the insert policy's self-insert branch (user_id = auth.uid()
  -- and aircraft_has_no_members(aircraft_id) — true here since the aircraft
  -- row above has no membership rows yet).
  insert into public.aircraft_memberships (aircraft_id, user_id, relationship, verified)
  values (v_aircraft_id, auth.uid(), 'owner', true);

  -- Now that the owner membership row exists, is_aircraft_member(id) (and
  -- therefore can_view_aircraft) is true for the caller, so this plain
  -- select — which *does* go through the SELECT policy — succeeds.
  select * into v_aircraft from public.aircraft where id = v_aircraft_id;

  return v_aircraft;
end;
$$;

-- Postgres grants EXECUTE on newly created functions to PUBLIC by default —
-- revoke that and grant only to `authenticated`, consistent with every table/
-- view in this schema being scoped `to authenticated`, not `anon` (no
-- signed-out surface exists in MVP).
revoke all on function public.create_aircraft_with_owner(
  text, text, text, text, integer, text, text, text, text
) from public;

revoke all on function public.create_aircraft_with_owner(
  text, text, text, text, integer, text, text, text, text
) from anon;

grant execute on function public.create_aircraft_with_owner(
  text, text, text, text, integer, text, text, text, text
) to authenticated;
