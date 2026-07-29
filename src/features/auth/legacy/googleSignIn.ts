// LEGACY (pre-Clerk-migration): superseded by ../useSocialSignIn.ts. Kept
// unwired for rollback until the Clerk path is verified end-to-end and
// Phase 7 cleanup is explicitly approved — see docs/clerk-migration-plan.md.
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

import { supabase } from '../../../services/supabaseClient';

// Sign in with Google via @react-native-google-signin/google-signin +
// Supabase Auth. Google Cloud OAuth client + Supabase provider config were
// done manually — see issue #4. iosClientId/webClientId below are public
// OAuth client identifiers, not secrets (nothing here is a client secret;
// that stays server-side in Supabase's dashboard).
GoogleSignin.configure({
  iosClientId: '437508253809-h4qnagpj8t7n5h0kkuaec1bpejd3u8i9.apps.googleusercontent.com',
  webClientId: '437508253809-b7bnf1sm7e2u44allc1sac7uia9ol5jk.apps.googleusercontent.com',
});

// --- No nonce on the Google path — accepted v1 tradeoff, not an oversight ---
//
// Issue #4 originally asked for a client-generated nonce, hashed and passed
// to the *native* Google sign-in call, mirroring the Apple flow (nonce.ts).
// That isn't possible with the free/public version of
// @react-native-google-signin/google-signin (the version installed here,
// 16.x): neither `GoogleSignin.configure()`'s `ConfigureParams` nor
// `GoogleSignin.signIn()`'s `SignInParams` expose a nonce field on iOS —
// custom nonce support was moved to the maintainer's paid "Universal Sign In"
// product (confirmed by reading node_modules/@react-native-google-signin/
// google-signin/src/types.ts and the package's own security docs, which
// state the nonce functionality "is available in the licensed version").
// This is also a widely reported limitation for this exact
// free-library + Supabase combination (e.g.
// react-native-google-signin/google-signin#1176).
//
// Decision (made after flagging the conflict rather than resolving it
// silently): Supabase's Google provider now has "Skip nonce checks" ON, so
// the call below intentionally sends no nonce — there's nothing dead or
// half-wired here, this is the whole flow for Google. The ID token is still
// fully verified against Google's public keys either way; "Skip nonce
// checks" only turns off replay-nonce verification, not signature/issuer
// verification. This is a documented, accepted v1 limitation, same spirit as
// the Apple private-relay-email edge case in docs/ADDENDUM.md §D — not
// something to revisit without a reason. Apple's provider is unaffected and
// keeps full nonce enforcement (see appleSignIn.ts / nonce.ts).
export async function signInWithGoogle(): Promise<'success' | 'cancelled'> {
  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return 'cancelled';
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    throw error;
  }

  return 'success';
}
