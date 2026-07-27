import * as Crypto from 'expo-crypto';

import { compressImageForUpload, OversizedImageError } from './imageCompression';
import { supabase } from './supabaseClient';

// Storage buckets configured in
// supabase/migrations/20260726200000_create_storage_buckets.sql. See that
// migration's header comment for the full RLS/visibility reasoning — the
// short version: aircraft-images/timeline-images/flight-images are
// Story-like (read follows aircraft.visibility), profile-images is broadly
// readable by any signed-in user, and writes are scoped per-bucket to match
// each backing table's own RLS (verified-owner-only for aircraft-images,
// member-only for timeline/flight-images, owning-user-only for
// profile-images).
export const IMAGE_BUCKETS = {
  aircraft: 'aircraft-images',
  timeline: 'timeline-images',
  flight: 'flight-images',
  profile: 'profile-images',
} as const;

export type ImageBucket = (typeof IMAGE_BUCKETS)[keyof typeof IMAGE_BUCKETS];

// Calm, non-alarming copy for upload failure states, per docs/BRAND.md §17
// (Voice and Messaging) — mirrors the pattern already established in
// src/features/auth/authErrors.ts. No "Error:", no exclamation marks.
export type UploadErrorReason = 'network' | 'oversized' | 'unknown';

export const UPLOAD_ERROR_COPY: Record<UploadErrorReason, string> = {
  network: "Couldn't upload that photo — check your connection and try again.",
  oversized: "That photo's too large to upload. Try a different one.",
  unknown: "That photo didn't upload. Give it another try in a moment.",
};

export function classifyUploadError(error: unknown): UploadErrorReason {
  if (error instanceof OversizedImageError) return 'oversized';

  if (error instanceof Error && /network|fetch|offline|timed? ?out/i.test(error.message)) {
    return 'network';
  }

  // Supabase storage errors carry a `statusCode` string on the error object.
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = String((error as { statusCode?: unknown }).statusCode);
    if (statusCode === '413') return 'oversized';
  }

  return 'unknown';
}

export class ImageUploadError extends Error {
  readonly reason: UploadErrorReason;

  constructor(reason: UploadErrorReason, cause?: unknown) {
    super(UPLOAD_ERROR_COPY[reason]);
    this.name = 'ImageUploadError';
    this.reason = reason;
    this.cause = cause;
  }
}

function buildObjectPath(folderId: string): string {
  // compressImageForUpload always outputs JPEG (see imageCompression.ts), so
  // the object name doesn't need to inspect the source file's extension.
  return `${folderId}/${Crypto.randomUUID()}.jpg`;
}

export type UploadImageParams = {
  bucket: ImageBucket;
  /**
   * The id that scopes this bucket's RLS policies — an aircraft id for
   * aircraft/timeline/flight-images, or a user id for profile-images. Must
   * be the first path segment; see the migration's `storage_first_path_uuid`
   * helper.
   */
  folderId: string;
  /** Local file:// URI from the image picker/camera — NOT yet compressed. */
  sourceUri: string;
};

export type UploadedImage = {
  /** Path within the bucket, suitable for `timeline_photos.storage_path` /
   * `flight_photos.storage_path` / `aircraft.primary_photo_url` (see
   * getDisplayImageUrl to turn this into a renderable URL). */
  storagePath: string;
  width: number;
  height: number;
};

/**
 * Reusable upload helper for every feature that stores an aircraft-related
 * photo (aircraft primary photo, timeline photos, flight photos) or a user
 * profile photo — per issue #7's acceptance criteria. Always compresses
 * client-side first (src/services/imageCompression.ts) before uploading; no
 * caller should upload an uncompressed original.
 *
 * Throws `ImageUploadError` with calm, brand-voice copy on failure — callers
 * should surface `error.message` directly rather than a generic banner.
 */
export async function uploadImage({
  bucket,
  folderId,
  sourceUri,
}: UploadImageParams): Promise<UploadedImage> {
  let compressed;
  try {
    compressed = await compressImageForUpload(sourceUri);
  } catch (error) {
    throw new ImageUploadError(classifyUploadError(error), error);
  }

  const objectPath = buildObjectPath(folderId);

  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(compressed.uri);
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    throw new ImageUploadError('network', error);
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new ImageUploadError(classifyUploadError(uploadError), uploadError);
  }

  return {
    storagePath: objectPath,
    width: compressed.width,
    height: compressed.height,
  };
}

export type DisplayImageOptions = {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  /** Signed URL lifetime in seconds. Defaults to 1 hour. */
  expiresInSeconds?: number;
};

/**
 * Returns a time-limited, RLS-checked URL for a stored image, optionally
 * requesting a display-size variant via Supabase Storage's on-the-fly image
 * transformation — per docs/IMPLEMENTATION_SPEC.md §4: no server-side
 * thumbnail pipeline, transforms happen on read instead.
 *
 * All four buckets are private (see the #7 migration), so this always goes
 * through `createSignedUrl` rather than a bare public URL — the signed URL
 * itself is generated under the requesting user's RLS, so it naturally
 * respects the same visibility/membership rules as any other read.
 */
export async function getDisplayImageUrl(
  bucket: ImageBucket,
  storagePath: string,
  options: DisplayImageOptions = {},
): Promise<string> {
  const { width, height, resize, expiresInSeconds = 3600 } = options;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(
      storagePath,
      expiresInSeconds,
      width || height ? { transform: { width, height, resize } } : undefined,
    );

  if (error || !data) {
    throw new ImageUploadError(classifyUploadError(error), error);
  }

  return data.signedUrl;
}
