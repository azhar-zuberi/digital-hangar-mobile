import type { Tables } from '../../models/database.types';
import { supabase } from '../../services/supabaseClient';

// Issue #36: Story tab data access — timeline_entries where
// type in ('memory', 'milestone') only. `type = 'maintenance'` rows live in
// this same table (supabase/migrations/20260727220000_create_timeline_
// entries_and_photos.sql) but belong to the Care tab per CLAUDE.md — this
// module never queries or returns them. That's a query-level split, not a
// schema split: every function here filters `type in (...)`, nothing here
// re-defines the table.
//
// Visibility: `timeline_entries_select_can_view` (same migration) already
// scopes every select below to what the caller can see per the parent
// aircraft's visibility (private/community/public) via can_view_aircraft().
// No client-side visibility filtering is added on top of it.

export type TimelineEntryType = 'memory' | 'milestone';

export type TimelinePhoto = Pick<Tables<'timeline_photos'>, 'id' | 'storage_path' | 'created_at'>;

export type TimelineEntry = {
  id: string;
  aircraft_id: string;
  created_by: string;
  type: TimelineEntryType;
  title: string;
  description: string | null;
  /** Postgres `date` column, always a plain 'YYYY-MM-DD' string — never
   * parse with `new Date(event_date)` for display/grouping, since that
   * parses as UTC midnight and can render a day off in negative-UTC-offset
   * timezones. Use timelineValidation.ts's string-based helpers instead. */
  event_date: string;
  created_at: string;
  photos: TimelinePhoto[];
};

const TIMELINE_ENTRY_COLUMNS =
  'id, aircraft_id, created_by, type, title, description, event_date, created_at, timeline_photos(id, storage_path, created_at)';

const STORY_TYPES: TimelineEntryType[] = ['memory', 'milestone'];

type RawTimelineEntryRow = {
  id: string;
  aircraft_id: string;
  created_by: string;
  type: string;
  title: string;
  description: string | null;
  event_date: string;
  created_at: string;
  timeline_photos: TimelinePhoto[] | null;
};

// timeline_photos comes back in whatever order Postgres happens to return
// embedded rows in (not guaranteed to be insertion order) — sorted here by
// created_at ascending so the gallery/carousel always shows photos in the
// order they were added, deterministically.
function sortPhotos(photos: TimelinePhoto[] | null | undefined): TimelinePhoto[] {
  return [...(photos ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function toTimelineEntry(row: RawTimelineEntryRow): TimelineEntry {
  return {
    id: row.id,
    aircraft_id: row.aircraft_id,
    created_by: row.created_by,
    // Safe cast: every read path below filters `type in ('memory',
    // 'milestone')` or is fed a type this module itself just inserted, so a
    // 'maintenance' row can never reach here.
    type: row.type as TimelineEntryType,
    title: row.title,
    description: row.description,
    event_date: row.event_date,
    created_at: row.created_at,
    photos: sortPhotos(row.timeline_photos),
  };
}

/**
 * Story tab's list query (issue #36 AC): entries for one aircraft, newest
 * event first. Ties on the same `event_date` break on `created_at` (most
 * recently logged first) for a stable, deterministic order.
 */
export async function fetchTimelineEntries(aircraftId: string): Promise<TimelineEntry[]> {
  const { data, error } = await supabase
    .from('timeline_entries')
    .select(TIMELINE_ENTRY_COLUMNS)
    .eq('aircraft_id', aircraftId)
    .in('type', STORY_TYPES)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toTimelineEntry(row as unknown as RawTimelineEntryRow));
}

/**
 * Detail view's data source (issue #36). Refetches by id rather than
 * trusting a value passed through navigation params — same rationale as
 * useAircraftProfile.ts — and matters more here than for aircraft profiles,
 * since photo URLs are short-lived signed URLs (see useDisplayImageUrl.ts)
 * that shouldn't be trusted stale across a navigation hop.
 *
 * Still filters `type in ('memory','milestone')` even though lookup is by
 * id — a direct link/deep-link to a maintenance entry's id should not
 * render it in the Story detail view.
 */
export async function fetchTimelineEntryById(entryId: string): Promise<TimelineEntry | null> {
  const { data, error } = await supabase
    .from('timeline_entries')
    .select(TIMELINE_ENTRY_COLUMNS)
    .eq('id', entryId)
    .in('type', STORY_TYPES)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toTimelineEntry(data as unknown as RawTimelineEntryRow);
}

export type InsertTimelineEntryInput = {
  aircraftId: string;
  createdBy: string;
  type: TimelineEntryType;
  title: string;
  description: string | null;
  /** 'YYYY-MM-DD' — see timelineValidation.ts#toDateString. */
  eventDate: string;
};

/**
 * Inserts one `timeline_entries` row. `timeline_entries_insert_member` RLS
 * (the #34 migration) requires `is_aircraft_member(aircraft_id)` and
 * `created_by = auth.uid()` — both satisfied by construction since a
 * signed-in aircraft member is the only caller of this function (see
 * useAddTimelineEntry.ts). Returns the row with an empty `photos` array;
 * photo rows are inserted separately by insertTimelinePhotos below.
 */
export async function insertTimelineEntry(input: InsertTimelineEntryInput): Promise<TimelineEntry> {
  const { data, error } = await supabase
    .from('timeline_entries')
    .insert({
      aircraft_id: input.aircraftId,
      created_by: input.createdBy,
      type: input.type,
      title: input.title,
      description: input.description,
      event_date: input.eventDate,
    })
    .select(TIMELINE_ENTRY_COLUMNS)
    .single();

  if (error) throw error;
  return toTimelineEntry(data as unknown as RawTimelineEntryRow);
}

/**
 * Inserts one `timeline_photos` row per already-uploaded storage path (see
 * useAddTimelineEntry.ts for the upload step ahead of this). A no-op
 * returning `[]` when there are no photos, so callers don't need to guard
 * an empty-array insert themselves.
 */
export async function insertTimelinePhotos(
  timelineEntryId: string,
  storagePaths: string[],
): Promise<TimelinePhoto[]> {
  if (storagePaths.length === 0) return [];

  const { data, error } = await supabase
    .from('timeline_photos')
    .insert(
      storagePaths.map((storagePath) => ({
        timeline_entry_id: timelineEntryId,
        storage_path: storagePath,
      })),
    )
    .select('id, storage_path, created_at');

  if (error) throw error;
  return data ?? [];
}
