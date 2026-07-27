-- Issue #34: Schema: timeline_entries and timeline_photos tables.
--
-- Backs the Story tab (memories/milestones) and, via the same table, the
-- Care tab's Maintenance History section (type = 'maintenance'). Schema per
-- docs/IMPLEMENTATION_SPEC.md §1.4 (timeline_entries) and §1.5
-- (timeline_photos); query-intent split per §2 (Screen & Flow Inventory).
--
-- Per CLAUDE.md this is a *query-level* split, not a schema split: Story
-- queries `type in ('memory','milestone')`, Care queries `type =
-- 'maintenance'`. Both live in this one table — do not split maintenance
-- out into its own table. (This is a different rule from Squawks/Reminders,
-- which are always member-only regardless of aircraft visibility — those are
-- out of scope for this issue entirely, tracked separately for Phase 3.)
--
-- Visibility model: `timeline_entries` inherits the parent aircraft's
-- `visibility` (private/community/public), reusing `can_view_aircraft()`
-- and `is_aircraft_member()` from
-- 20260726190000_create_aircraft_and_communities.sql rather than
-- redefining them. `timeline_photos` has no visibility/aircraft_id column
-- of its own — it inherits by joining to its parent `timeline_entries` row,
-- per §1.5.
--
-- The `timeline-images` Storage bucket already exists
-- (20260726200000_create_storage_buckets.sql, with its own RLS policies
-- keyed on `can_view_aircraft`/`is_aircraft_member` via
-- `storage_first_path_uuid`). This migration is schema/RLS only for the two
-- Postgres tables — no bucket changes.

-- =============================================================================
-- timeline_entries
-- =============================================================================

create table public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  created_by uuid not null references public.users(id),
  type text not null check (type in ('memory', 'maintenance', 'milestone')),
  title text not null,
  description text,
  event_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index timeline_entries_aircraft_idx
  on public.timeline_entries (aircraft_id, event_date desc);

alter table public.timeline_entries enable row level security;

-- Select follows the parent aircraft's visibility rule, exactly like
-- `aircraft_select_can_view` — reusing `can_view_aircraft()` rather than
-- reimplementing the private/community/public logic here.
create policy "timeline_entries_select_can_view"
  on public.timeline_entries
  for select
  to authenticated
  using (public.can_view_aircraft(aircraft_id));

-- Insert/update/delete restricted to aircraft members (any relationship —
-- owner, previous_owner, caretaker — matching `is_aircraft_member()`'s
-- existing definition, not just verified owners). `created_by` on insert
-- must be the inserting user, so a member can't attribute an entry to
-- someone else.
create policy "timeline_entries_insert_member"
  on public.timeline_entries
  for insert
  to authenticated
  with check (
    public.is_aircraft_member(aircraft_id)
    and created_by = auth.uid()
  );

create policy "timeline_entries_update_member"
  on public.timeline_entries
  for update
  to authenticated
  using (public.is_aircraft_member(aircraft_id))
  with check (public.is_aircraft_member(aircraft_id));

create policy "timeline_entries_delete_member"
  on public.timeline_entries
  for delete
  to authenticated
  using (public.is_aircraft_member(aircraft_id));

-- =============================================================================
-- timeline_photos
-- =============================================================================

create table public.timeline_photos (
  id uuid primary key default gen_random_uuid(),
  timeline_entry_id uuid not null references public.timeline_entries(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index timeline_photos_entry_idx
  on public.timeline_photos (timeline_entry_id);

alter table public.timeline_photos enable row level security;

-- No aircraft_id/visibility column of its own — every policy joins back to
-- the parent timeline_entries row and re-runs the same
-- can_view_aircraft()/is_aircraft_member() checks against *its*
-- aircraft_id, per §1.5 ("inherits from the parent timeline_entries row via
-- join"). A photo can never be more or less visible than the entry it's
-- attached to.
create policy "timeline_photos_select_can_view"
  on public.timeline_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.timeline_entries te
      where te.id = timeline_entry_id
        and public.can_view_aircraft(te.aircraft_id)
    )
  );

create policy "timeline_photos_insert_member"
  on public.timeline_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.timeline_entries te
      where te.id = timeline_entry_id
        and public.is_aircraft_member(te.aircraft_id)
    )
  );

create policy "timeline_photos_update_member"
  on public.timeline_photos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.timeline_entries te
      where te.id = timeline_entry_id
        and public.is_aircraft_member(te.aircraft_id)
    )
  )
  with check (
    exists (
      select 1
      from public.timeline_entries te
      where te.id = timeline_entry_id
        and public.is_aircraft_member(te.aircraft_id)
    )
  );

create policy "timeline_photos_delete_member"
  on public.timeline_photos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.timeline_entries te
      where te.id = timeline_entry_id
        and public.is_aircraft_member(te.aircraft_id)
    )
  );
