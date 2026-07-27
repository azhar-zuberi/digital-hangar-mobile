import { useMutation } from '@tanstack/react-query';

import {
  classifyCreateAircraftError,
  createAircraft,
  CREATE_AIRCRAFT_ERROR_COPY,
} from '../../services/aircraftService';
import { normalizeRegistration } from './aircraftValidation';

export type CreateAircraftVariables = {
  registration: string;
  manufacturer: string;
  model: string;
  primaryPhotoUri: string;
};

// Drives the "Add My Aircraft" form's submit button. Wraps the (currently
// stubbed — see src/services/aircraftService.ts) createAircraft call in a
// TanStack Query mutation so the screen gets loading/error state for free,
// consistent with useSocialSignIn.ts's pattern for the sign-in flow.
//
// No `onSuccess` cache invalidation yet: there's no "current user's aircraft
// list" query to invalidate until the onboarding gate (#11) and Home's real
// data exist. This is the natural place to add
// `queryClient.invalidateQueries(...)` once that query key exists.
export function useCreateAircraft() {
  const mutation = useMutation({
    mutationFn: (variables: CreateAircraftVariables) =>
      createAircraft({
        registration: normalizeRegistration(variables.registration),
        manufacturer: variables.manufacturer.trim(),
        model: variables.model.trim(),
        primaryPhotoUri: variables.primaryPhotoUri,
      }),
  });

  const errorReason = mutation.error ? classifyCreateAircraftError(mutation.error) : null;

  return {
    submit: mutation.mutate,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    createdAircraftId: mutation.data?.id ?? null,
    // Duplicate-registration errors render inline under the registration
    // field (per issue #8's acceptance criteria); anything else is a banner.
    registrationError:
      errorReason === 'duplicate_registration'
        ? CREATE_AIRCRAFT_ERROR_COPY.duplicate_registration
        : null,
    bannerError:
      errorReason && errorReason !== 'duplicate_registration'
        ? CREATE_AIRCRAFT_ERROR_COPY[errorReason]
        : null,
    reset: mutation.reset,
  };
}
