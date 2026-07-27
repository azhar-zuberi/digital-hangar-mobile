import { useQuery } from '@tanstack/react-query';

import { useSession } from '../auth/session';
import { fetchHasAircraftMembership } from './aircraftApi';

// Base query key for "does this user have an aircraft_memberships row"
// queries. Exported so src/features/aircraft/useCreateAircraft.ts can
// invalidate it on a successful creation — TanStack Query treats a partial
// key as a prefix match, so invalidating this base key catches the
// per-user key below regardless of which user is signed in.
export const AIRCRAFT_MEMBERSHIP_QUERY_KEY = ['aircraftMemberships'] as const;

/**
 * The Home gating guard's data source (issue #11): whether the signed-in
 * user has at least one `aircraft_memberships` row anywhere (own, co-own, or
 * caretaker of any aircraft). Consumed in exactly one place —
 * RootNavigator.tsx, via src/app/navigation/homeGate.ts's pure
 * `decideHomeGate` — so the "no aircraft yet -> onboarding" decision isn't
 * duplicated per-screen.
 *
 * Keyed by user id (not just a static key) so switching signed-in users
 * (sign out -> sign in as someone else) can't serve stale cached data for
 * the wrong person. Disabled until a session exists; in practice this hook
 * is only rendered inside RootNavigator, which itself only mounts once
 * App.tsx's session gate confirms a session, so `userId` is expected to
 * already be defined by the time this runs.
 */
export function useHasAircraftMembership() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...AIRCRAFT_MEMBERSHIP_QUERY_KEY, userId ?? null],
    queryFn: () => fetchHasAircraftMembership(userId as string),
    enabled: !!userId,
  });
}
