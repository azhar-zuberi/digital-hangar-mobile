import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageResult } from 'expo-image-manipulator';
import { Image, Platform } from 'react-native';

// Client-side resize/compress pipeline, per docs/IMPLEMENTATION_SPEC.md §4
// ("Remaining Implementation Choices" — image pipeline) and CLAUDE.md's tech
// stack line: max 2048px long edge, ~80% JPEG quality, always before upload.
// Supabase Storage's on-the-fly image transformation (see
// src/services/imageUpload.ts's getDisplayImageUrl) covers display-size
// variants from this single compressed original — no server-side thumbnail
// pipeline, per the same spec section.
const MAX_LONG_EDGE = 2048;
const JPEG_QUALITY = 0.8;

// Defensive cap on the *original* file, checked before attempting any
// manipulation — protects against hanging/OOMing on an unreasonably large
// source (e.g. an uncompressed RAW export) rather than discovering the
// problem partway through a slow resize. This is well above anything a phone
// camera's default JPEG produces; it exists only to fail fast, calmly, on
// outliers. Distinct from (and stricter than) the Storage bucket-level
// file_size_limit in the #7 migration, which guards the *compressed* output.
export const MAX_SOURCE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export class OversizedImageError extends Error {
  constructor() {
    super('Source image exceeds the maximum allowed size before compression.');
    this.name = 'OversizedImageError';
  }
}

export type CompressedImage = {
  /** file:// URI of the compressed JPEG, ready to hand to the upload helper. */
  uri: string;
  width: number;
  height: number;
};

// expo-file-system's File class (used below for the native size pre-check)
// is explicitly unsupported on web — its web shim is a no-op stub that never
// populates `.exists`/`.size` (see expo-file-system's ExpoFileSystem.web.ts).
// expo-image-picker's web implementation hands back a blob: URI instead of a
// file:// one anyway, so refetching it as a Blob is the web-native way to
// get its byte size.
async function getSourceFileSize(sourceUri: string): Promise<number | null> {
  if (Platform.OS === 'web') {
    const blob = await fetch(sourceUri).then((response) => response.blob());
    return blob.size;
  }

  const sourceFile = new File(sourceUri);
  return sourceFile.exists ? sourceFile.size : null;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

/**
 * Resizes an image so its long edge is at most `MAX_LONG_EDGE`px (images
 * already smaller are left at their original dimensions — this never
 * upscales) and re-encodes it as JPEG at `JPEG_QUALITY`. Call this on every
 * locally-picked/captured photo before handing it to `uploadImage` — no
 * feature should upload an uncompressed original.
 *
 * Throws `OversizedImageError` (classified by imageUpload.ts into calm copy)
 * if the source file is implausibly large before any manipulation is
 * attempted.
 */
export async function compressImageForUpload(sourceUri: string): Promise<CompressedImage> {
  const sourceSize = await getSourceFileSize(sourceUri);
  if (sourceSize !== null && sourceSize > MAX_SOURCE_FILE_BYTES) {
    throw new OversizedImageError();
  }

  const { width, height } = await getImageSize(sourceUri);
  const longEdge = Math.max(width, height);

  const context = ImageManipulator.manipulate(sourceUri);

  // Only resize if the image is actually larger than the target — never
  // upscale a smaller source image.
  if (longEdge > MAX_LONG_EDGE) {
    if (width >= height) {
      context.resize({ width: MAX_LONG_EDGE });
    } else {
      context.resize({ height: MAX_LONG_EDGE });
    }
  }

  const rendered = await context.renderAsync();
  const result: ImageResult = await rendered.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return { uri: result.uri, width: result.width, height: result.height };
}
