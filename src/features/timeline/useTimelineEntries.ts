import { useQuery } from '@tanstack/react-query';

import { fetchTimelineEntries } from './timelineApi';

/** Exported so useAddTimelineEntry.ts can invalidate exactly this
 * aircraft's list on a successful create, without also invalidating every
 * other aircraft's cached Story list (TanStack Query treats a partial key
 * array as a prefix match). */
export function timelineEntriesQueryKey(aircraftId: string | null | undefined) {
  return ['timelineEntries', aircraftId ?? null] as const;
}

/**
 * Story tab's list query (issue #36). Disabled until an aircraft id is
 * known — see useCurrentAircraftId.ts for how the Story screen resolves
 * that today.
 */
export function useTimelineEntries(aircraftId: string | null | undefined) {
  return useQuery({
    queryKey: timelineEntriesQueryKey(aircraftId),
    queryFn: () => fetchTimelineEntries(aircraftId as string),
    enabled: !!aircraftId,
  });
}
