import { useAuth } from '@clerk/expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  IMAGE_BUCKETS,
  ImageUploadError,
  UPLOAD_ERROR_COPY,
  uploadImage,
} from '../../services/imageUpload';
import {
  insertTimelineEntry,
  insertTimelinePhotos,
  type TimelineEntry,
  type TimelineEntryType,
} from './timelineApi';
import { toDateString } from './timelineValidation';
import { timelineEntriesQueryKey } from './useTimelineEntries';

export type AddTimelineEntryInput = {
  aircraftId: string;
  type: TimelineEntryType;
  title: string;
  description: string;
  eventDate: Date;
  /** Local file:// URIs from the image picker, not yet compressed/uploaded. */
  photoUris: string[];
};

// Calm, non-alarming copy per docs/BRAND.md §17 — mirrors
// aircraftApi.ts/imageUpload.ts's error-copy pattern.
export const ADD_TIMELINE_ENTRY_ERROR_COPY = {
  network: "Couldn't save that entry — check your connection and try again.",
  unknown: "That didn't save. Give it another try in a moment.",
} as const;

export function classifyAddTimelineEntryError(error: unknown): string {
  // A photo upload failure already carries calm, specific copy (oversized,
  // network, etc.) — surface it directly rather than re-classifying.
  if (error instanceof ImageUploadError) return error.message;

  if (error instanceof Error && /network|fetch|offline|timed? ?out/i.test(error.message)) {
    return ADD_TIMELINE_ENTRY_ERROR_COPY.network;
  }

  return ADD_TIMELINE_ENTRY_ERROR_COPY.unknown;
}

/**
 * Creates the timeline_entries row, then uploads and links any photos.
 * Exported (not just used internally) so it's unit-testable without
 * mounting the mutation hook — see __tests__/useAddTimelineEntry.test.ts.
 *
 * Sequencing, and why this isn't one atomic transaction: `timeline_entries`
 * insert and `timeline_photos` insert are both single Postgres statements,
 * but the photo upload between them is a separate Supabase Storage HTTP
 * call that can't participate in a Postgres transaction regardless (same
 * constraint documented in aircraftApi.ts for the aircraft-creation flow).
 * Unlike that flow, though, RLS here doesn't *require* this order — the
 * caller is already an aircraft member before this runs, so
 * timeline_photos_insert_member would pass regardless of write order. The
 * entry-first order is kept anyway so a photo upload failure still leaves a
 * real (photo-less) entry behind rather than an orphaned upload with
 * nothing pointing at it. Photos upload sequentially, not via Promise.all,
 * to avoid firing several large multipart requests at once on a mobile
 * connection — same choice AddAircraftScreen's single-photo flow implies.
 */
export async function createTimelineEntryWithPhotos(
  input: AddTimelineEntryInput,
  createdBy: string,
): Promise<TimelineEntry> {
  const entry = await insertTimelineEntry({
    aircraftId: input.aircraftId,
    createdBy,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim() || null,
    eventDate: toDateString(input.eventDate),
  });

  if (input.photoUris.length === 0) {
    return entry;
  }

  const storagePaths: string[] = [];
  for (const sourceUri of input.photoUris) {
    const uploaded = await uploadImage({
      bucket: IMAGE_BUCKETS.timeline,
      folderId: input.aircraftId,
      sourceUri,
    });
    storagePaths.push(uploaded.storagePath);
  }

  const photos = await insertTimelinePhotos(entry.id, storagePaths);
  return { ...entry, photos };
}

/**
 * Add-entry form's submit mutation (issue #36). Invalidates this aircraft's
 * Story list on success so the new entry appears without a manual refresh —
 * same "invalidate on success" pattern as useCreateAircraft.ts.
 */
export function useAddTimelineEntry(aircraftId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const mutation = useMutation({
    mutationFn: (input: AddTimelineEntryInput) => {
      if (!userId) {
        // Defensive only — every screen that can reach this form is nested
        // under an authenticated session gate (App.tsx / RootNavigator), so
        // this should be unreachable in practice.
        return Promise.reject(new Error(UPLOAD_ERROR_COPY.unknown));
      }
      return createTimelineEntryWithPhotos(input, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timelineEntriesQueryKey(aircraftId) });
    },
  });

  return {
    submit: mutation.mutate,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    createdEntry: mutation.data ?? null,
    bannerError: mutation.error ? classifyAddTimelineEntryError(mutation.error) : null,
    reset: mutation.reset,
  };
}
