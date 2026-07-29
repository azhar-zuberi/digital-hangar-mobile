import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../services/supabaseClient';

// The current Supabase Auth session, modeled as TanStack Query state (per
// CLAUDE.md — TanStack Query + Supabase client for all server state, no
// Redux/Context store) rather than a bespoke auth Context. `getSession()`
// seeds the cache; `onAuthStateChange` keeps it fresh across sign-in,
// sign-out, and token refresh, from any provider.
export const sessionQueryKey = ['auth', 'session'] as const;

async function fetchSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export function useSession() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    // onAuthStateChange keeps this current; there's nothing to poll for.
    staleTime: Infinity,
  });
}
