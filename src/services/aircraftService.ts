import type { Database } from '../models/database.types';
import { supabase } from './supabaseClient';

// Issue #9: aircraft creation + owner membership transaction.
//
// Wraps the create_aircraft_with_owner Postgres function
// (supabase/migrations/20260727120000_create_aircraft_with_owner_rpc.sql),
// which creates the `aircraft` row and the creator's `owner`
// `aircraft_memberships` row (verified = true) as a single atomic operation
// — no window where one exists without the other, per
// docs/IMPLEMENTATION_SPEC.md §1.2/§1.3. `aircraft.visibility` is not a
// parameter: it always takes the column default (`community`), per
// docs/ADDENDUM.md §A ("automatic membership, no additional setup").
//
// Photo sequencing: `primaryPhotoPath` is accepted for forward-compatibility
// but should be left undefined by the real "Add My Aircraft" flow. The
// `aircraft-images` Storage bucket's insert policy
// (supabase/migrations/20260726200000_create_storage_buckets.sql) requires
// `is_verified_owner(aircraft_id)`, which can't be true until the owner
// membership row this call creates exists — and Storage uploads are a
// separate HTTP surface from this RPC, so they can't happen inside the same
// transaction regardless. The intended flow for a screen collecting a
// required primary photo up front (docs/IMPLEMENTATION_SPEC.md §2 step 3):
//
//   1. const aircraft = await createAircraft({ registration, manufacturer, model, ... });
//   2. const { storagePath } = await uploadImage({ bucket: IMAGE_BUCKETS.aircraft, folderId: aircraft.id, sourceUri });
//   3. await supabase.from('aircraft').update({ primary_photo_url: storagePath }).eq('id', aircraft.id);
//      (allowed by the pre-existing aircraft_update_verified_owner policy,
//      since the owner membership from step 1 already exists)
//
// Step 3 is deliberately not wrapped here — it's a plain, already-supported
// table update, not part of this issue's atomic-creation contract.

export type Aircraft = Database['public']['Tables']['aircraft']['Row'];

export type CreateAircraftInput = {
  registration: string;
  manufacturer: string;
  model: string;
  nickname?: string;
  year?: number;
  serialNumber?: string;
  engineInformation?: string;
  homeAirport?: string;
  /** See the sequencing note above — leave undefined in the real onboarding flow. */
  primaryPhotoPath?: string;
};

// Calm, non-alarming copy for creation failure states, per docs/BRAND.md §17
// — mirrors the pattern already established in
// src/features/auth/authErrors.ts and src/services/imageUpload.ts.
export type AircraftCreationErrorReason = 'duplicate_registration' | 'network' | 'unknown';

export const AIRCRAFT_CREATION_ERROR_COPY: Record<AircraftCreationErrorReason, string> = {
  duplicate_registration:
    "That tail number's already registered here. Double-check it and try again.",
  network: "Couldn't reach Digital Hangar just now. Check your connection and try again.",
  unknown: "That didn't go through. Give it another try in a moment.",
};

// Postgres error code for a unique-constraint violation — surfaced by
// PostgREST/supabase-js as a string `code` on the error object. Fires here
// on a duplicate `aircraft.registration`.
const UNIQUE_VIOLATION_CODE = '23505';

export function classifyAircraftCreationError(error: unknown): AircraftCreationErrorReason {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code);
    if (code === UNIQUE_VIOLATION_CODE) return 'duplicate_registration';
  }

  if (error instanceof Error && /network|fetch|offline|timed? ?out/i.test(error.message)) {
    return 'network';
  }

  return 'unknown';
}

export class AircraftCreationError extends Error {
  readonly reason: AircraftCreationErrorReason;

  constructor(reason: AircraftCreationErrorReason, cause?: unknown) {
    super(AIRCRAFT_CREATION_ERROR_COPY[reason]);
    this.name = 'AircraftCreationError';
    this.reason = reason;
    this.cause = cause;
  }
}

/**
 * Creates the aircraft row and the creator's owner membership row atomically
 * via the `create_aircraft_with_owner` RPC. Throws `AircraftCreationError`
 * (calm, brand-voice `.message`) on any failure — because the underlying
 * function call is a single Postgres statement, a thrown error here means
 * *nothing* was written (no orphaned `aircraft` row, no orphaned
 * `aircraft_memberships` row), so callers can safely leave the person on the
 * form and let them retry.
 */
export async function createAircraft(input: CreateAircraftInput): Promise<Aircraft> {
  const { data, error } = await supabase.rpc('create_aircraft_with_owner', {
    p_registration: input.registration,
    p_manufacturer: input.manufacturer,
    p_model: input.model,
    p_nickname: input.nickname,
    p_year: input.year,
    p_serial_number: input.serialNumber,
    p_engine_information: input.engineInformation,
    p_home_airport: input.homeAirport,
    p_primary_photo_url: input.primaryPhotoPath,
  });

  if (error) {
    throw new AircraftCreationError(classifyAircraftCreationError(error), error);
  }

  if (!data) {
    throw new AircraftCreationError('unknown');
  }

  return data;
}
