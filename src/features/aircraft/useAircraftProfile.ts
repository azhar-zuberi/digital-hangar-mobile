import { useQuery } from '@tanstack/react-query';

import { fetchAircraftById } from './aircraftApi';

// Backs the read-only aircraft profile view (issue #26), keyed by aircraft
// id so it's reusable from anywhere that links to a Community/Public
// aircraft (search today; Phase 5 Community browsing later), not just the
// search flow.
export function useAircraftProfile(aircraftId: string) {
  return useQuery({
    queryKey: ['aircraft', aircraftId],
    queryFn: () => fetchAircraftById(aircraftId),
  });
}
