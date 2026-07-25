import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

import { supabase } from '../../services/supabaseClient';

// Sign in with Google via @react-native-google-signin/google-signin +
// Supabase Auth. Google Cloud OAuth client + Supabase provider config were
// done manually — see issue #4. iosClientId/webClientId below are public
// OAuth client identifiers, not secrets (nothing here is a client secret;
// that stays server-side in Supabase's dashboard).
GoogleSignin.configure({
  iosClientId: '437508253809-h4qnagpj8t7n5h0kkuaec1bpejd3u8i9.apps.googleusercontent.com',
  webClientId: '437508253809-b7bnf1sm7e2u44allc1sac7uia9ol5jk.apps.googleusercontent.com',
});

// --- Known deviation from the issue #4 spec — flagging rather than hiding it ---
//
// The issue asks for a client-generated nonce, hashed and passed to the
// *native* Google sign-in call, mirroring the Apple flow (see nonce.ts). That
// is not possible with the free/public version of
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
// Practical effect: as shipped, the call below sends no nonce, so it will
// only succeed while Supabase's Google provider has "Skip nonce checks" ON.
// That setting was deliberately left OFF this session. This PR does not flip
// it — that's a security-relevant call for a human to make, not something to
// change silently mid-implementation. See the PR description for the options
// this leaves open.
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
