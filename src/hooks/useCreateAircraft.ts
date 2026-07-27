import { useMutation } from '@tanstack/react-query';

import { createAircraft, type CreateAircraftInput } from '../services/aircraftService';

/**
 * TanStack Query mutation wrapper around
 * src/services/aircraftService.ts#createAircraft — per CLAUDE.md's "TanStack
 * Query + Supabase client for server state, no Redux." Left screen-agnostic
 * on purpose: navigation-on-success (landing on Home with the new aircraft
 * as active) and error-banner rendering are the "Add My Aircraft" screen's
 * concern (issue #8), not this hook's.
 */
export function useCreateAircraft() {
  return useMutation({
    mutationFn: (input: CreateAircraftInput) => createAircraft(input),
  });
}
