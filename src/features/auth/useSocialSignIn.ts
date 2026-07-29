import { useMutation } from '@tanstack/react-query';
import { useSignInWithApple } from '@clerk/expo/apple';
import { useSignInWithGoogle } from '@clerk/expo/google';

import { AUTH_ERROR_COPY, classifyAuthError } from './authErrors';

export type SocialProvider = 'apple' | 'google';
type SignInOutcome = 'success' | 'cancelled';

// Drives both providers' sign-in buttons on the sign-in screen. A single
// mutation (rather than one per provider) keeps "only one sign-in flow at a
// time" implicit, and gives the screen one place to read loading/error state
// from regardless of which button was pressed. Mirrors the shape of the
// legacy Supabase-Auth version (../legacy/useSocialSignIn.ts) closely enough
// that SignInScreen.tsx needed no changes.
//
// Unlike the legacy version, there's no sessionQueryKey to invalidate on
// success: Clerk's ClerkProvider context (App.tsx) re-renders reactively the
// moment setActive() resolves, so nothing here needs to reach into TanStack
// Query's cache to make the sign-in -> Home transition happen.
export function useSocialSignIn() {
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();

  const mutation = useMutation({
    mutationFn: async (provider: SocialProvider): Promise<SignInOutcome> => {
      const { createdSessionId, setActive } =
        provider === 'apple'
          ? await startAppleAuthenticationFlow()
          : await startGoogleAuthenticationFlow();

      // A null createdSessionId is how Clerk's hooks represent "the person
      // cancelled the native sheet" (see authErrors.ts) — not a failure.
      if (!createdSessionId || !setActive) {
        return 'cancelled';
      }

      await setActive({ session: createdSessionId });
      return 'success';
    },
  });

  const errorMessage = mutation.error ? AUTH_ERROR_COPY[classifyAuthError(mutation.error)] : null;

  return {
    signIn: mutation.mutate,
    isSigningIn: mutation.isPending,
    pendingProvider: mutation.isPending ? mutation.variables : undefined,
    errorMessage,
    dismissError: mutation.reset,
  };
}
