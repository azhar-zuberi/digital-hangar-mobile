import { useAuth } from '@clerk/expo';
import { useQuery } from '@tanstack/react-query';

import { fetchOwnedAircraft } from './aircraftApi';

// Base query key for "every aircraft this user is a member of" queries.
// Exported so useCreateAircraft.ts can invalidate it on a successful
// creation — a freshly-created aircraft should appear in the Home screen's
// aircraft switcher (issue #35) without waiting on an unrelated refetch,
// same pattern as useHasAircraftMembership.ts's AIRCRAFT_MEMBERSHIP_QUERY_KEY.
export const OWNED_AIRCRAFT_QUERY_KEY = ['ownedAircraft'] as const;

/**
 * Every aircraft the signed-in user is a member of (owner, co-owner, or
 * caretaker), in the order they joined — the data source behind Home's hero
 * content and aircraft switcher (issue #35). Keyed by user id so switching
 * signed-in users can't serve stale data for the wrong person, matching
 * useHasAircraftMembership.ts. Disabled until a session exists.
 */
export function useOwnedAircraft() {
  const { userId } = useAuth({ treatPendingAsSignedOut: false });

  return useQuery({
    queryKey: [...OWNED_AIRCRAFT_QUERY_KEY, userId ?? null],
    queryFn: () => fetchOwnedAircraft(userId as string),
    enabled: !!userId,
  });
}
