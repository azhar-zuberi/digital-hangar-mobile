// LEGACY (pre-Clerk-migration): superseded by ../authErrors.ts (Clerk-backed).
// Kept unwired for rollback until the Clerk path is verified end-to-end and
// Phase 7 cleanup is explicitly approved — see docs/clerk-migration-plan.md.
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

// Calm, non-alarming copy for sign-in failure states, per docs/BRAND.md §17
// (Voice and Messaging) — no "Error:", no exclamation marks, nothing that
// reads as the app being broken. A cancelled sign-in isn't a failure at all,
// so it gets no banner — the person just lands back on the sign-in screen.
export type AuthErrorReason = 'cancelled' | 'network' | 'provider';

export const AUTH_ERROR_COPY: Record<Exclude<AuthErrorReason, 'cancelled'>, string> = {
  network: "Couldn't reach Digital Hangar just now. Check your connection and try again.",
  provider: "That didn't go through. Give it another try in a moment.",
};

/**
 * Recognizes "the person tapped cancel" for the Apple flow, which rejects
 * with this code. (The Google flow never throws on cancel — signInWithGoogle
 * resolves with `'cancelled'` instead — so useSocialSignIn.ts never needs to
 * classify a Google cancellation as an error in the first place.)
 */
function isCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : undefined;
  return code === 'ERR_REQUEST_CANCELED';
}

export function classifyAuthError(error: unknown): AuthErrorReason {
  if (isCancellation(error)) return 'cancelled';

  if (isAuthRetryableFetchError(error)) return 'network';

  if (error instanceof Error && /network|fetch|offline/i.test(error.message)) {
    return 'network';
  }

  if (isAuthApiError(error)) return 'provider';

  return 'provider';
}
