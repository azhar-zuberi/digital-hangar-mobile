import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signInWithApple } from './appleSignIn';
import { AUTH_ERROR_COPY, classifyAuthError } from './authErrors';
import { signInWithGoogle } from './googleSignIn';
import { sessionQueryKey } from './session';

export type SocialProvider = 'apple' | 'google';
type SignInOutcome = 'success' | 'cancelled';

async function runSignIn(provider: SocialProvider): Promise<SignInOutcome> {
  if (provider === 'google') {
    // signInWithGoogle resolves with 'cancelled' rather than throwing —
    // mirror that shape for Apple below so the screen only has one outcome
    // type to branch on, regardless of provider.
    return signInWithGoogle();
  }

  try {
    await signInWithApple();
    return 'success';
  } catch (error) {
    if (classifyAuthError(error) === 'cancelled') {
      return 'cancelled';
    }
    throw error;
  }
}

// Drives both providers' sign-in buttons on the sign-in screen. A single
// mutation (rather than one per provider) keeps "only one sign-in flow at a
// time" implicit, and gives the screen one place to read loading/error state
// from regardless of which button was pressed.
export function useSocialSignIn() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: runSignIn,
    onSuccess: (outcome) => {
      if (outcome === 'success') {
        // onAuthStateChange (session.ts) also picks this up, but invalidate
        // eagerly so the sign-in → Home transition doesn't wait on that event.
        queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      }
    },
  });

  const reason = mutation.error ? classifyAuthError(mutation.error) : null;
  const errorMessage = reason && reason !== 'cancelled' ? AUTH_ERROR_COPY[reason] : null;

  return {
    signIn: mutation.mutate,
    isSigningIn: mutation.isPending,
    pendingProvider: mutation.isPending ? mutation.variables : undefined,
    errorMessage,
    dismissError: mutation.reset,
  };
}
