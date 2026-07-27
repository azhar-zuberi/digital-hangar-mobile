// Aircraft-creation service call for the "Add My Aircraft" form (issue #8).
//
// ============================================================================
// STUBBED — pending issue #9 ("Postgres RPC + client service function for
// creating an aircraft + owner membership atomically"), which is being built
// concurrently in another worktree. `createAircraft` below does NOT talk to
// Supabase yet. It simulates a successful creation (after a short delay, so
// the form's loading state is visible) so the rest of the form — validation,
// photo picking, error rendering, navigation on success — can be built,
// reviewed, and tested independently of #9 landing.
//
// ASSUMED SHAPE for whoever wires the real call once #9 merges:
//
//   1. `createAircraft` will call a Postgres RPC (e.g.
//      `supabase.rpc('create_aircraft_with_owner', { registration,
//      manufacturer, model })`) that, in one transaction, inserts the
//      `aircraft` row (visibility defaults to 'community' per
//      IMPLEMENTATION_SPEC.md §1.2) and an `aircraft_memberships` row for the
//      caller with relationship='owner', verified=true, and returns the new
//      aircraft's id.
//
//   2. IMPORTANT — the primary photo CANNOT be uploaded before that RPC
//      returns. The `aircraft-images` Storage bucket's insert policy is
//      `is_verified_owner(storage_first_path_uuid(name))`
//      (supabase/migrations/20260726200000_create_storage_buckets.sql), keyed
//      on {aircraft_id}/{filename} — so both the aircraft row AND the
//      caller's verified-owner membership must exist first, or the upload is
//      denied by RLS. The real flow is therefore: create the aircraft (no
//      photo) -> upload the compressed photo to
//      `aircraft-images/{newAircraftId}/...` via src/services/imageUpload.ts
//      (bucket: 'aircraft', folderId: newAircraftId) -> update
//      `aircraft.primary_photo_url` to the resulting storage path. This
//      function's signature already reflects that: it takes the raw picker
//      URI, not a pre-uploaded storage path, so the upload-after-create step
//      can be slotted into this function's body without changing its
//      contract with the form/hook above it.
//
//   3. Duplicate registration: the real RPC will reject with a Postgres
//      unique-violation (code 23505, on the `aircraft_registration_key`
//      constraint — see IMPLEMENTATION_SPEC.md §1.2's `registration text not
//      null unique`). `classifyCreateAircraftError` below already recognizes
//      that shape, so the inline "already taken" error on the registration
//      field works unchanged once the stub is replaced — no separate
//      pre-submit "is this registration free?" query is assumed, since a
//      plain client-side select against `aircraft` would be filtered by
//      `can_view_aircraft` RLS and could wrongly report a private aircraft's
//      registration as available (see PR notes for this issue).
//
// TODO(#9): replace this function's body with the real RPC call (and the
// upload-then-update sequence in step 2). Don't change the exported
// signature or the error shapes below without checking with whoever
// implements #9 and whoever wired this hook up on the form side.
// ============================================================================

export type CreateAircraftInput = {
  /** Expected already normalized (trimmed, uppercased) by the caller — see
   * src/features/aircraft/aircraftValidation.ts's normalizeRegistration. */
  registration: string;
  manufacturer: string;
  model: string;
  /** Local file:// (native) or blob:/data: (web) URI from the image picker —
   * NOT yet compressed or uploaded. See the module header for why this
   * function (not the caller) owns the upload-after-create sequencing. */
  primaryPhotoUri: string;
};

export type CreatedAircraft = {
  id: string;
};

export class DuplicateRegistrationError extends Error {
  constructor(readonly registration: string) {
    super(`Registration "${registration}" is already registered to another aircraft.`);
    this.name = 'DuplicateRegistrationError';
  }
}

// Calm, non-alarming copy per docs/BRAND.md §17 — mirrors the pattern in
// src/features/auth/authErrors.ts and src/services/imageUpload.ts.
export type CreateAircraftErrorReason = 'duplicate_registration' | 'network' | 'unknown';

export const CREATE_AIRCRAFT_ERROR_COPY: Record<CreateAircraftErrorReason, string> = {
  duplicate_registration:
    "That registration's already in the hangar. Double-check the tail number.",
  network: "Couldn't reach Digital Hangar just now. Check your connection and try again.",
  unknown: "That didn't go through. Give it another try in a moment.",
};

export function classifyCreateAircraftError(error: unknown): CreateAircraftErrorReason {
  if (error instanceof DuplicateRegistrationError) return 'duplicate_registration';

  // Postgres unique_violation, as raised by supabase-js's PostgrestError.
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code);
    if (code === '23505') return 'duplicate_registration';
  }

  if (error instanceof Error && /network|fetch|offline|timed? ?out/i.test(error.message)) {
    return 'network';
  }

  return 'unknown';
}

// Stub-only id generator — deliberately NOT expo-crypto's randomUUID or a
// Postgres-generated id, since nothing here is persisted. Swapped out
// entirely (the RPC's response supplies the real id) once #9 lands.
function mockAircraftId(): string {
  return `stub-aircraft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Creates an aircraft + owner membership. See the module header — this is
 * currently a stub that simulates success and does not persist anything.
 */
export async function createAircraft(input: CreateAircraftInput): Promise<CreatedAircraft> {
  // `__DEV__` is a React Native/Metro global injected at bundle time — guard
  // with `typeof` so this file stays safely importable from any plain-Node
  // context (e.g. a future test runner, per #12) where it isn't defined.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      '[aircraftService] createAircraft is STUBBED pending #9 — simulating success, nothing was persisted.',
      input,
    );
  }

  // Small delay so the form's loading state is exercised in manual/expo-web
  // verification rather than resolving instantly.
  await new Promise((resolve) => setTimeout(resolve, 400));

  return { id: mockAircraftId() };
}
