import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAircraftFields, type UpdateAircraftFieldsInput } from './aircraftApi';
import { aircraftEditableFieldsQueryKey } from './useAircraftEditableFields';
import { OWNED_AIRCRAFT_QUERY_KEY } from './useOwnedAircraft';

// Calm, non-alarming copy per docs/BRAND.md §17 — mirrors
// useAddTimelineEntry.ts / useCreateAircraft.ts's error-copy pattern.
export const AIRCRAFT_UPDATE_ERROR_COPY = {
  network: "Couldn't save those changes — check your connection and try again.",
  unknown: "That didn't save. Give it another try in a moment.",
} as const;

export function classifyAircraftUpdateError(error: unknown): string {
  if (error instanceof Error && /network|fetch|offline|timed? ?out/i.test(error.message)) {
    return AIRCRAFT_UPDATE_ERROR_COPY.network;
  }
  return AIRCRAFT_UPDATE_ERROR_COPY.unknown;
}

/**
 * Optional-fields edit form's save mutation (issue #37). On success,
 * invalidates both this aircraft's editable-fields query (so a re-opened
 * edit screen shows the saved values) and Home's owned-aircraft query (so
 * the identity block's nickname reflects the change immediately) — same
 * "invalidate on success" pattern as useCreateAircraft.ts /
 * useAddTimelineEntry.ts.
 *
 * Callers are expected to skip calling `submit` entirely when there's
 * nothing to save (see aircraftEditValidation.ts's `diffEditableValues`
 * returning `{}`) rather than issuing a no-op update request.
 */
export function useUpdateAircraftProfile(aircraftId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (fields: UpdateAircraftFieldsInput) => updateAircraftFields(aircraftId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aircraftEditableFieldsQueryKey(aircraftId) });
      queryClient.invalidateQueries({ queryKey: OWNED_AIRCRAFT_QUERY_KEY });
    },
  });

  return {
    submit: mutation.mutate,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    bannerError: mutation.error ? classifyAircraftUpdateError(mutation.error) : null,
    reset: mutation.reset,
  };
}
