import { useAuth } from '@clerk/expo';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../services/supabaseClient';

// Provisional "current aircraft" resolution for the Story tab (issue #36).
//
// Nothing in the codebase yet threads a real "selected aircraft" from Home
// down into the Story/Care/Fly tabs — building that (Home hero content +
// last-used aircraft persistence + a switcher, per BRAND.md §8) is issue
// #35's scope, which is in flight in parallel with this one. Rather than
// block the Story tab on #35 landing first, this hook picks the caller's
// oldest `aircraft_memberships` row (first aircraft they joined) as a
// deterministic stand-in — the same "first owned aircraft" fallback #35's
// design uses when there's no persisted last-used choice, so the two won't
// disagree about what to show for a single-aircraft owner (the common case
// pre-launch).
//
// Once #35 merges and a real selected-aircraft hook/context exists, Story
// (and Care/Fly, once they exist) should switch to consuming that instead
// of resolving independently here — this hook is deliberately small and
// self-contained (its own query, not reused by anything else) so retiring
// it later is a one-line swap at each call site, not a refactor. Flagged
// explicitly in the #36 PR description rather than decided silently, per
// CLAUDE.md's guidance on spec gaps.
export const CURRENT_AIRCRAFT_QUERY_KEY = ['currentAircraftId'] as const;

async function fetchCurrentAircraftId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('aircraft_memberships')
    .select('aircraft_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.aircraft_id ?? null;
}

export function useCurrentAircraftId() {
  const { userId } = useAuth({ treatPendingAsSignedOut: false });

  return useQuery({
    queryKey: [...CURRENT_AIRCRAFT_QUERY_KEY, userId ?? null],
    queryFn: () => fetchCurrentAircraftId(userId as string),
    enabled: !!userId,
  });
}
