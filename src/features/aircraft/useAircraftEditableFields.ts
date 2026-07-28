import { useQuery } from '@tanstack/react-query';

import { fetchAircraftEditableFields } from './aircraftApi';

// Query key exported so useUpdateAircraftProfile.ts can invalidate this
// exact query on a successful save — same "export the key for invalidation"
// pattern as useOwnedAircraft.ts's OWNED_AIRCRAFT_QUERY_KEY.
export function aircraftEditableFieldsQueryKey(aircraftId: string) {
  return ['aircraftEditableFields', aircraftId] as const;
}

/**
 * Backs the optional-fields edit form (issue #37): the current values of
 * the editable columns for one aircraft, keyed by aircraft id so it's
 * reusable for any aircraft the caller can reach the edit screen for.
 */
export function useAircraftEditableFields(aircraftId: string) {
  return useQuery({
    queryKey: aircraftEditableFieldsQueryKey(aircraftId),
    queryFn: () => fetchAircraftEditableFields(aircraftId),
  });
}
