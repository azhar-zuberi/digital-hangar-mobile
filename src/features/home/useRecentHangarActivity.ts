import { useQuery } from '@tanstack/react-query';

import { fetchRecentTimelineEntries, type TimelineEntry } from '../timeline/timelineApi';
import type { HangarActivityItem } from './hangarActivity';

/** IMPLEMENTATION_SPEC.md §2 item 4: "most recent 3-5 items." */
export const RECENT_ACTIVITY_LIMIT = 5;

export function recentHangarActivityQueryKey(aircraftId: string | null | undefined) {
  return ['recentHangarActivity', 'timeline', aircraftId ?? null] as const;
}

/** Exported for direct unit testing (see __tests__/useRecentHangarActivity.test.ts)
 * — same rationale as useAddTimelineEntry.ts exporting its pure
 * orchestration function: no React/TanStack dependency of its own, so it
 * doesn't need the hook mounted to verify. */
export function toHangarActivityItem(entry: TimelineEntry): HangarActivityItem {
  return {
    id: entry.id,
    kind: 'timeline',
    badgeLabel: entry.type === 'milestone' ? 'Milestone' : 'Memory',
    badgeVariant: entry.type === 'milestone' ? 'highlight' : 'default',
    title: entry.title,
    eventDate: entry.event_date,
    thumbnailStoragePath: entry.photos[0]?.storage_path ?? null,
  };
}

/**
 * Home screen's Recent Hangar Activity data source (issue #38). Phase 2
 * scope: only the timeline_entries slice (memory/milestone) — maintenance
 * entries are Care-tab content and are never queried here, per CLAUDE.md
 * and fetchRecentTimelineEntries' own STORY_TYPES filter.
 *
 * TODO(Phase 3): add a sibling `useRecentSquawks(aircraftId)` hook
 * (open, or open + recently resolved squawks, mapped to `kind: 'squawk'`
 * HangarActivityItems) and combine it with this hook via TanStack Query's
 * `useQueries` in RecentHangarActivityContainer (or wherever HomeScreen
 * ends up composing them) — per this issue's Implementation Notes ("merge
 * in component via Promise.all or useQueries"). Not done here: Phase 2 is
 * scoped to the timeline slice only.
 * TODO(Phase 4): same pattern for a `useRecentFlights(aircraftId)` hook,
 * mapped to `kind: 'flight'` HangarActivityItems.
 *
 * Returns pre-mapped HangarActivityItem[] so RecentHangarActivity.tsx never
 * needs to know about TimelineEntry's shape — Phase 3/4's hooks should
 * follow the same pattern, each returning their own `items` slice for the
 * component to merge via mergeHangarActivity (hangarActivity.ts).
 */
export function useRecentHangarActivity(aircraftId: string | null | undefined) {
  const query = useQuery({
    queryKey: recentHangarActivityQueryKey(aircraftId),
    queryFn: () => fetchRecentTimelineEntries(aircraftId as string, RECENT_ACTIVITY_LIMIT),
    enabled: !!aircraftId,
  });

  return {
    timelineItems: (query.data ?? []).map(toHangarActivityItem),
    isLoading: query.isLoading,
    isError: query.isError,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
