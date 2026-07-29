import { useSSO } from '@clerk/expo';
import { useMutation } from '@tanstack/react-query';

import { AUTH_ERROR_COPY, classifyAuthError } from './authErrors';

type SignInOutcome = 'success' | 'cancelled';

/**
 * Dev/test-only: a real Clerk session via browser OAuth redirect, using
 * useSSO() — Clerk's own hooks explicitly recommend useSSO() for web
 * platforms (see useSignInWithGoogle.d.ts's own doc comment), since the
 * native useSignInWithGoogle/useSignInWithApple hooks in useSocialSignIn.ts
 * require native modules with no web implementation (see
 * google_signin_free_tier_limits memory / SignInScreen.tsx). Not part of the
 * shipped v1 auth surface (CLAUDE.md: Apple/Google native sign-in only) —
 * gated to `__DEV__ && Platform.OS === 'web'` at the call site in
 * SignInScreen.tsx, purely so `expo start --web` can exercise the real
 * auth -> RLS -> ensureUserProfile pipeline during the Clerk migration's
 * Phase 6 verification instead of requiring a device build for every
 * iteration.
 */
export function useWebGoogleSignIn() {
  const { startSSOFlow } = useSSO();

  const mutation = useMutation({
    mutationFn: async (): Promise<SignInOutcome> => {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: 'oauth_google' });

      // A null createdSessionId is how Clerk represents "the person closed
      // the OAuth popup/tab without completing it" — not a failure, same
      // convention as useSocialSignIn.ts's native flow.
      if (!createdSessionId || !setActive) {
        return 'cancelled';
      }

      await setActive({ session: createdSessionId });
      return 'success';
    },
  });

  const errorMessage = mutation.error ? AUTH_ERROR_COPY[classifyAuthError(mutation.error)] : null;

  return {
    signIn: () => mutation.mutate(),
    isSigningIn: mutation.isPending,
    errorMessage,
  };
}
