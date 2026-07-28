import { supabase } from '../../services/supabaseClient';
import type { Tables } from '../../models/database.types';

// Read-only summary shown on a search result / profile card (issue #26):
// tail number, make/model, nickname, primary photo, visibility indicator.
// Deliberately not the full `aircraft` row — this feature never needs
// engine_information/home_airport/serial_number/etc, and keeping the
// selected columns narrow makes it obvious this is a browse-only view, not
// an editable one.
export type AircraftSummary = Pick<
  Tables<'aircraft'>,
  'id' | 'registration' | 'manufacturer' | 'model' | 'nickname' | 'primary_photo_url' | 'visibility'
>;

const AIRCRAFT_SUMMARY_COLUMNS =
  'id, registration, manufacturer, model, nickname, primary_photo_url, visibility';

// Postgres ILIKE treats `%` and `_` as wildcards (and `\` as its escape
// character) even with no wildcards added by us. Escaping them keeps the
// match literal, so a registration containing one of those characters can't
// accidentally turn an "exact match only" search (issue #26 AC: "no fuzzy
// search or partial-match listing for MVP") into a pattern match.
function escapeIlikeLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// Exact-match, case-insensitive search by tail number, per
// IMPLEMENTATION_SPEC.md §2 step 5. Returns null on no match — never a
// partial/fuzzy list. Visibility filtering happens entirely server-side via
// the `aircraft_select_can_view` RLS policy (which calls `can_view_aircraft()`,
// see supabase/migrations/20260726190000_create_aircraft_and_communities.sql):
// a Private aircraft's row is simply never returned to a non-member, so
// there's no client-side visibility check to duplicate here.
export async function searchAircraftByRegistration(
  registration: string,
): Promise<AircraftSummary | null> {
  const trimmed = registration.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('aircraft')
    .select(AIRCRAFT_SUMMARY_COLUMNS)
    .ilike('registration', escapeIlikeLiteral(trimmed))
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Fetches a single aircraft's read-only summary by id. Backs the profile
// view reached from search, and is written to be reusable by Phase 5
// Community browsing later (same "tap a card, see a read-only profile"
// shape per IMPLEMENTATION_SPEC.md §2's Community section) rather than
// being search-specific. Same RLS policy applies: a row the viewer can't
// see per `can_view_aircraft()` comes back as `null`, not an error.
export async function fetchAircraftById(aircraftId: string): Promise<AircraftSummary | null> {
  const { data, error } = await supabase
    .from('aircraft')
    .select(AIRCRAFT_SUMMARY_COLUMNS)
    .eq('id', aircraftId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Backs the Home screen's hero content (issue #35): every aircraft the
// signed-in user is a member of (owner, co-owner, or caretaker), regardless
// of that aircraft's `visibility` — a member always sees their own
// aircraft's full profile, per `can_view_aircraft()`'s `is_aircraft_member`
// fallback (supabase/migrations/20260726190000_create_aircraft_and_
// communities.sql), independent of the Private/Community/Public setting.
// This is deliberately two queries rather than one embedded
// (`aircraft_memberships` -> `aircraft`) select: it keeps both RLS policies
// doing exactly the filtering they're already responsible for
// (`aircraft_memberships_select` scopes the membership rows to the caller;
// `aircraft_select_can_view` scopes which aircraft rows come back) without
// leaning on supabase-js's embedded-resource type inference for a shape this
// small. Order is preserved from `aircraft_memberships.created_at` (oldest
// membership first) — the aircraft switcher's "first owned aircraft" default
// (see useSelectedAircraft.ts) depends on that being deterministic.
export async function fetchOwnedAircraft(userId: string): Promise<AircraftSummary[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('aircraft_memberships')
    .select('aircraft_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (membershipError) throw membershipError;

  const aircraftIds = (memberships ?? []).map((membership) => membership.aircraft_id);
  if (aircraftIds.length === 0) return [];

  const { data: aircraft, error: aircraftError } = await supabase
    .from('aircraft')
    .select(AIRCRAFT_SUMMARY_COLUMNS)
    .in('id', aircraftIds);

  if (aircraftError) throw aircraftError;

  const aircraftById = new Map((aircraft ?? []).map((row) => [row.id, row]));
  return aircraftIds
    .map((id) => aircraftById.get(id))
    .filter((row): row is AircraftSummary => row != null);
}

// The single signal behind the Home gating guard (issue #11): does the
// signed-in user have at least one `aircraft_memberships` row (owner,
// co-owner, or caretaker), regardless of relationship or verified status?
// `head: true` skips fetching row data entirely — the gate only needs a
// count, never the membership rows themselves. RLS's
// `aircraft_memberships_select` policy (`user_id = auth.uid() or
// is_aircraft_member(aircraft_id)`) already scopes this to the caller's own
// rows, so no extra filtering is needed beyond `user_id = userId` here.
export async function fetchHasAircraftMembership(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('aircraft_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return (count ?? 0) > 0;
}
