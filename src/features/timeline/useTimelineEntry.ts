import { useQuery } from '@tanstack/react-query';

import { fetchTimelineEntryById } from './timelineApi';

export function timelineEntryQueryKey(entryId: string | null | undefined) {
  return ['timelineEntries', 'detail', entryId ?? null] as const;
}

/**
 * Story detail view's data source (issue #36). Refetches by id rather than
 * relying on data passed through navigation params — see
 * fetchTimelineEntryById's comment for why that matters more here than for
 * a plain aircraft profile (signed photo URLs are short-lived).
 */
export function useTimelineEntry(entryId: string | null | undefined) {
  return useQuery({
    queryKey: timelineEntryQueryKey(entryId),
    queryFn: () => fetchTimelineEntryById(entryId as string),
    enabled: !!entryId,
  });
}
