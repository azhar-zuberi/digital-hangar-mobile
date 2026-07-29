import { useQuery } from '@tanstack/react-query';

import { ensureUserProfile, type ClerkProfileSource } from './ensureUserProfile';

/**
 * Runs ensureUserProfile() once per signed-in Clerk user, so App.tsx's
 * RootGate can gate rendering the same way it already gates on `isLoaded` —
 * screens behind it assume a `public.users` row exists for the current user
 * (see ensureUserProfile.ts). `staleTime: Infinity` since this only needs to
 * run once per session, not refetch; keyed by user id so switching
 * signed-in users can't skip the check for someone new.
 */
export function useEnsureUserProfile(user: ClerkProfileSource | null | undefined) {
  return useQuery({
    queryKey: ['ensureUserProfile', user?.id ?? null],
    queryFn: () => ensureUserProfile(user as ClerkProfileSource),
    enabled: !!user,
    staleTime: Infinity,
  });
}
