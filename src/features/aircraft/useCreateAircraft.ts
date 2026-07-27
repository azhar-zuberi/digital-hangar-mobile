import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  AIRCRAFT_CREATION_ERROR_COPY,
  AircraftCreationError,
  createAircraft,
  type Aircraft,
} from '../../services/aircraftService';
import {
  IMAGE_BUCKETS,
  ImageUploadError,
  UPLOAD_ERROR_COPY,
  uploadImage,
} from '../../services/imageUpload';
import { supabase } from '../../services/supabaseClient';
import { normalizeRegistration } from './aircraftValidation';
import { AIRCRAFT_MEMBERSHIP_QUERY_KEY } from './useHasAircraftMembership';

export type CreateAircraftVariables = {
  registration: string;
  manufacturer: string;
  model: string;
  primaryPhotoUri: string;
};

// The aircraft-images bucket's insert policy requires is_verified_owner(),
// which only becomes true once createAircraft's owner-membership row is
// committed — so the photo can't go up in the same step as the aircraft
// row. See src/services/aircraftService.ts's header comment for the full
// RLS reasoning behind this three-step sequence.
async function createAircraftWithPhoto(variables: CreateAircraftVariables): Promise<Aircraft> {
  const aircraft = await createAircraft({
    registration: normalizeRegistration(variables.registration),
    manufacturer: variables.manufacturer.trim(),
    model: variables.model.trim(),
  });

  const { storagePath } = await uploadImage({
    bucket: IMAGE_BUCKETS.aircraft,
    folderId: aircraft.id,
    sourceUri: variables.primaryPhotoUri,
  });

  const { error: updateError } = await supabase
    .from('aircraft')
    .update({ primary_photo_url: storagePath })
    .eq('id', aircraft.id);

  // Note: if the upload or this update fails, the aircraft + owner
  // membership already exist without a photo — there's no compensating
  // delete here (no delete-aircraft endpoint exists, and one row without a
  // photo isn't worth building rollback machinery for in v1). The owner
  // can add a photo later from an edit flow once one exists.
  if (updateError) {
    throw updateError;
  }

  return aircraft;
}

type SubmitErrorReason = 'registration' | 'banner';

function classifySubmitError(error: unknown): { reason: SubmitErrorReason; message: string } {
  if (error instanceof AircraftCreationError) {
    if (error.reason === 'duplicate_registration') {
      return {
        reason: 'registration',
        message: AIRCRAFT_CREATION_ERROR_COPY.duplicate_registration,
      };
    }
    return { reason: 'banner', message: error.message };
  }

  if (error instanceof ImageUploadError) {
    return { reason: 'banner', message: error.message };
  }

  // A Postgres error from the plain primary_photo_url update, or anything
  // else unclassified — falls back to the generic "didn't go through" copy;
  // a unique-violation can't actually occur on this update, so no
  // 'duplicate_registration' branch is needed here.
  return { reason: 'banner', message: UPLOAD_ERROR_COPY.unknown };
}

// Drives the "Add My Aircraft" form's submit button. Wraps the create ->
// upload -> update sequence in a TanStack Query mutation so the screen gets
// loading/error state for free, consistent with useSocialSignIn.ts's pattern
// for the sign-in flow.
//
// On success, invalidates the Home gating guard's membership query (issue
// #11's useHasAircraftMembership) so a freshly-created owner membership is
// picked up immediately rather than leaving RootNavigator's gate decision
// stale until some unrelated refetch happens to run.
export function useCreateAircraft() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createAircraftWithPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AIRCRAFT_MEMBERSHIP_QUERY_KEY });
    },
  });

  const classified = mutation.error ? classifySubmitError(mutation.error) : null;

  return {
    submit: mutation.mutate,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    createdAircraftId: mutation.data?.id ?? null,
    // Duplicate-registration errors render inline under the registration
    // field (per issue #8's acceptance criteria); anything else is a banner.
    registrationError: classified?.reason === 'registration' ? classified.message : null,
    bannerError: classified?.reason === 'banner' ? classified.message : null,
    reset: mutation.reset,
  };
}
