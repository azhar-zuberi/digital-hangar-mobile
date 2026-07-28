import { useQuery } from '@tanstack/react-query';

import {
  getDisplayImageUrl,
  type DisplayImageOptions,
  type ImageBucket,
} from '../services/imageUpload';

/**
 * TanStack Query wrapper around imageUpload.ts's getDisplayImageUrl — turns
 * a private bucket's `storage_path` into a short-lived, RLS-checked signed
 * URL suitable for `<Image source={{ uri }}>`. Every image bucket in this
 * app (aircraft/timeline/flight/profile-images) is private, so nothing
 * should render a bucket-relative storage_path directly as an Image uri;
 * this hook is the one place that turns a path into a renderable one. Built
 * for the Story tab's thumbnails/gallery (issue #36) but deliberately
 * feature-agnostic — src/hooks/ per the pattern any other feature's photo
 * display (aircraft, flights) can reuse rather than re-implementing.
 *
 * `staleTime` is kept comfortably under getDisplayImageUrl's default
 * 1-hour signed URL expiry so a cached URL is never handed back after it's
 * gone stale server-side.
 */
export function useDisplayImageUrl(
  bucket: ImageBucket,
  storagePath: string | null | undefined,
  options?: DisplayImageOptions,
) {
  return useQuery({
    queryKey: [
      'displayImageUrl',
      bucket,
      storagePath ?? null,
      options?.width ?? null,
      options?.height ?? null,
      options?.resize ?? null,
    ],
    queryFn: () => getDisplayImageUrl(bucket, storagePath as string, options),
    enabled: !!storagePath,
    staleTime: 45 * 60 * 1000,
  });
}
