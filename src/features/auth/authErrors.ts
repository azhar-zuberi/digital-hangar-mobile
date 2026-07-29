import { isClerkAPIResponseError } from '@clerk/expo';

// Calm, non-alarming copy for sign-in failure states, per docs/BRAND.md §17
// (Voice and Messaging) — no "Error:", no exclamation marks, nothing that
// reads as the app being broken.
//
// No 'cancelled' reason here (unlike the legacy Supabase-Auth version in
// ../legacy/authErrors.ts): Clerk's useSignInWithApple/useSignInWithGoogle
// hooks (see useSocialSignIn.ts) swallow the platform cancellation codes
// (ERR_REQUEST_CANCELED on Apple, SIGN_IN_CANCELLED on Google) internally and
// resolve with a null createdSessionId instead of throwing — so a cancelled
// sign-in never reaches classifyAuthError at all.
export type AuthErrorReason = 'network' | 'provider';

export const AUTH_ERROR_COPY: Record<AuthErrorReason, string> = {
  network: "Couldn't reach Digital Hangar just now. Check your connection and try again.",
  provider: "That didn't go through. Give it another try in a moment.",
};

export function classifyAuthError(error: unknown): AuthErrorReason {
  if (error instanceof Error && /network|fetch|offline/i.test(error.message)) {
    return 'network';
  }

  if (isClerkAPIResponseError(error)) return 'provider';

  return 'provider';
}
