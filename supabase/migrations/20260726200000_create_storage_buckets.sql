-- Issue #7: Configure Supabase Storage buckets + image compression pipeline.
--
-- Schema/bucket naming per docs/TDD.md §9 (Storage Architecture: "Aircraft
-- Images, Timeline Images, Profile Images") and docs/IMPLEMENTATION_SPEC.md
-- §1.5/§1.10 (timeline_photos.storage_path, flight_photos.storage_path).
--
-- Deviation flagged: TDD §9 only names three buckets (Aircraft/Timeline/
-- Profile Images), because it predates Addendum v0.2 Section B's `flights`
-- entity. Issue #7's acceptance criteria also require the upload helper to be
-- "reusable across aircraft primary photo, timeline photos, and flight
-- photos" — but flight_photos.storage_path (IMPLEMENTATION_SPEC.md §1.10) has
-- nowhere to live without a fourth bucket. Adding `flight-images` here,
-- mirrored on the existing `timeline-images` pattern, rather than cramming
-- flight photos into `aircraft-images` (which is reserved for the single
-- `aircraft.primary_photo_url`, and has stricter verified-owner-only write
-- rules that don't fit flight photos). Flagging this as a documentation gap
-- worth folding into TDD §9 later, not silently improvising scope.
--
-- Visibility model (per CLAUDE.md / IMPLEMENTATION_SPEC.md §1):
--   - aircraft-images, timeline-images, flight-images are Story-like content
--     — reads inherit the parent aircraft's `visibility` via the existing
--     `can_view_aircraft()` helper (20260726190000_create_aircraft_and_
--     communities.sql). Squawks/Reminders have no image fields in the schema,
--     so there is no Care-tab bucket to reason about here — nothing in this
--     migration inherits aircraft.visibility for member-only content.
--   - profile-images mirrors `public_profiles`: readable by any authenticated
--     user (community member lists show profile photos), writable only by
--     the owning user.
--
-- Write policies are matched to each backing table's own table-level RLS
-- (not just "any aircraft member") so Storage doesn't grant a looser
-- permission than the row it supports:
--   - aircraft-images  -> only a verified owner can set `primary_photo_url`
--                         (aircraft_update_verified_owner policy), so only a
--                         verified owner can write here.
--   - timeline-images   -> timeline_entries insert/update/delete is member-
--                         only (§1.4), so this bucket allows full member CRUD.
--   - flight-images     -> flights insert/update is member-only, no delete
--                         policy exists on `flights` (§1.9), so this bucket
--                         has no delete policy either.
--   - profile-images    -> only the owning user can update their own `users`
--                         row (§1.1), so only the owning user can write here.
--
-- Path convention for every bucket: `{aircraft_id or user_id}/{filename}` —
-- a flat one-level-deep folder keyed by whichever id the RLS check needs.
-- (TDD §9's own example nests `User ID -> Aircraft ID`, but that's
-- illustrative, not a literal contract: nesting by uploader would make
-- co-owner access to files another member uploaded needlessly awkward to
-- check in a policy. Keying directly by the id the visibility/membership
-- check actually needs is simpler and equivalent in practice.)

-- =============================================================================
-- Buckets
--
-- All private (public = false) — consistent with the "no anonymous/public web
-- view in MVP" stance already established in 20260726190000's aircraft
-- policies (`to authenticated`, not `anon`). Reads go through the
-- authenticated Supabase client (signed URLs / on-the-fly transforms), never
-- a bare public URL.
--
-- allowed_mime_types is locked to image/jpeg: the client-side compression
-- pipeline (src/services/imageCompression.ts) always converts to JPEG before
-- upload, so nothing else should ever reach these buckets. file_size_limit
-- (15 MB) is a defense-in-depth backstop against a bypassed/broken client —
-- normal compressed output (2048px long edge, ~80% quality) is far smaller.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('aircraft-images', 'aircraft-images', false, 15728640, array['image/jpeg']),
  ('timeline-images', 'timeline-images', false, 15728640, array['image/jpeg']),
  ('flight-images', 'flight-images', false, 15728640, array['image/jpeg']),
  ('profile-images', 'profile-images', false, 15728640, array['image/jpeg'])
on conflict (id) do nothing;

-- =============================================================================
-- Path-parsing helper
--
-- Extracts the first folder segment of a storage object's path and casts it
-- to uuid, returning null (never raising) when the segment is missing or not
-- a valid uuid. plpgsql, not sql, specifically so the exception handler can
-- swallow a bad cast — a storage RLS policy that *errors* on a malformed path
-- is a worse failure mode than one that just quietly denies access (every
-- caller below feeds the result into can_view_aircraft/is_aircraft_member/
-- is_verified_owner, all of which treat a null id as "no match", i.e. deny).
-- =============================================================================

create or replace function public.storage_first_path_uuid(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  segment text;
begin
  segment := (storage.foldername(object_name))[1];
  if segment is null then
    return null;
  end if;
  return segment::uuid;
exception
  when others then
    return null;
end;
$$;

-- =============================================================================
-- aircraft-images
-- Path: {aircraft_id}/{filename}
-- =============================================================================

create policy "aircraft_images_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'aircraft-images'
    and public.can_view_aircraft(public.storage_first_path_uuid(name))
  );

create policy "aircraft_images_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'aircraft-images'
    and public.is_verified_owner(public.storage_first_path_uuid(name))
  );

create policy "aircraft_images_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'aircraft-images'
    and public.is_verified_owner(public.storage_first_path_uuid(name))
  )
  with check (
    bucket_id = 'aircraft-images'
    and public.is_verified_owner(public.storage_first_path_uuid(name))
  );

-- No delete policy — mirrors `aircraft`'s own table-level RLS, which has no
-- delete policy either (IMPLEMENTATION_SPEC.md §1.2: disallowed at the API
-- layer for MVP). Replacing a photo means uploading (upsert) to a path, not
-- deleting the old object.

-- =============================================================================
-- timeline-images
-- Path: {aircraft_id}/{filename}
-- =============================================================================

create policy "timeline_images_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'timeline-images'
    and public.can_view_aircraft(public.storage_first_path_uuid(name))
  );

create policy "timeline_images_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'timeline-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  );

create policy "timeline_images_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'timeline-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  )
  with check (
    bucket_id = 'timeline-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  );

create policy "timeline_images_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'timeline-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  );

-- =============================================================================
-- flight-images
-- Path: {aircraft_id}/{filename}
-- =============================================================================

create policy "flight_images_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'flight-images'
    and public.can_view_aircraft(public.storage_first_path_uuid(name))
  );

create policy "flight_images_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'flight-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  );

create policy "flight_images_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'flight-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  )
  with check (
    bucket_id = 'flight-images'
    and public.is_aircraft_member(public.storage_first_path_uuid(name))
  );

-- No delete policy — mirrors `flights`' own table-level RLS, which
-- (IMPLEMENTATION_SPEC.md §1.9) only grants insert/update to members, no
-- delete.

-- =============================================================================
-- profile-images
-- Path: {user_id}/{filename}
--
-- Read is broad (any authenticated user), matching `public_profiles`
-- (20260726182211_create_users_and_profile_trigger.sql), which exposes
-- every user's profile_photo_url for community member lists. Write is
-- restricted to the owning user, matching `users_update_own`.
-- =============================================================================

create policy "profile_images_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-images');

create policy "profile_images_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-images'
    and public.storage_first_path_uuid(name) = auth.uid()
  );

create policy "profile_images_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-images'
    and public.storage_first_path_uuid(name) = auth.uid()
  )
  with check (
    bucket_id = 'profile-images'
    and public.storage_first_path_uuid(name) = auth.uid()
  );

-- No delete policy — mirrors `users`, which likewise has no delete policy
-- (row deletion only happens via `on delete cascade` from auth.users).
-- Replacing a profile photo means uploading (upsert) to the same path.
