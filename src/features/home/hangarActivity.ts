// Shared shape for the Home screen's Recent Hangar Activity feed (issue
// #38, IMPLEMENTATION_SPEC.md §2 item 4). Phase 2 only ever produces
// `kind: 'timeline'` items (see useRecentHangarActivity.ts), but the type
// and merge function below are written to also accept 'squawk' (Phase 3)
// and 'flight' (Phase 4) items without needing a shape change later — per
// this issue's "Implementation Notes": Phase 3/4 add their own queries and
// merge the result in via useQueries, not by touching this file's sort/cap
// logic.

export type HangarActivityKind = 'timeline' | 'squawk' | 'flight';

/**
 * Two-tone badge system rather than one color per content type, since
 * IMPLEMENTATION_SPEC.md §3's design tokens only define `skyBlue` as an
 * interactive accent (everything else is text/background/divider).
 * 'highlight' (skyBlue) marks the entries that most want attention —
 * milestones today; likely open squawks once Phase 3 lands — 'default'
 * (graphite12) is everything else. Revisit if/when squawk/flight badges get
 * their own validated colors.
 */
export type HangarActivityBadgeVariant = 'default' | 'highlight';

export type HangarActivityItem = {
  id: string;
  kind: HangarActivityKind;
  badgeLabel: string;
  badgeVariant: HangarActivityBadgeVariant;
  title: string;
  /** Postgres `date` column value ('YYYY-MM-DD'), always zero-padded ISO so
   * it's both lexically sortable and safe to slice for display without
   * `new Date(...)`'s UTC-midnight pitfall (see timelineApi.ts's
   * TimelineEntry.event_date comment). Per this issue's Implementation
   * Notes: timeline/squawks use `event_date`, flights use `flight_date` —
   * whichever the source table calls it, it's normalized to this field
   * name here so cross-type sorting doesn't need to know the difference. */
  eventDate: string;
  thumbnailStoragePath: string | null;
};

type HangarActivitySlices = {
  timelineItems: HangarActivityItem[];
  /** TODO(Phase 3): open (or open + recently resolved) squawks, mapped to
   * `kind: 'squawk'` HangarActivityItems by a future useRecentSquawks()
   * hook. */
  squawkItems?: HangarActivityItem[];
  /** TODO(Phase 4): latest flights, mapped to `kind: 'flight'`
   * HangarActivityItems by a future useRecentFlights() hook. */
  flightItems?: HangarActivityItem[];
};

/**
 * Merges the activity slices into one reverse-chronological feed capped to
 * `limit`, per IMPLEMENTATION_SPEC.md §2's "union of latest timeline_entries,
 * squawks, flights — most recent 3-5 items." Pure and framework-free (no
 * React Native imports) so it's unit-testable without rendering anything —
 * same rationale as timelineGrouping.ts. Ties on `eventDate` are stable
 * (Array.prototype.sort), so within-day ordering follows each slice's own
 * upstream order (fetchRecentTimelineEntries already breaks ties on
 * created_at desc).
 */
export function mergeHangarActivity(
  slices: HangarActivitySlices,
  limit: number,
): HangarActivityItem[] {
  const merged = [
    ...slices.timelineItems,
    ...(slices.squawkItems ?? []),
    ...(slices.flightItems ?? []),
  ];

  return merged
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : 0))
    .slice(0, limit);
}
