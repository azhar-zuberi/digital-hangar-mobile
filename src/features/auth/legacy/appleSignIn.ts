import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '../../services/supabaseClient';
import { generateNoncePair } from './nonce';

// Sign in with Apple via expo-apple-authentication + Supabase Auth.
//
// Apple config (Services ID, key, Supabase provider) was done manually in the
// Apple Developer portal and Supabase dashboard — see issue #3. This module
// only consumes that config; it holds no secrets (the identity token is
// short-lived and verified server-side by Supabase against Apple's public
// keys — Digital Hangar never sees or stores an Apple client secret).
export async function signInWithApple(): Promise<void> {
  const { raw: rawNonce, hashed: hashedNonce } = await generateNoncePair();

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    // Not expected in practice (Apple always returns one for a login
    // operation), but the type is nullable, so guard rather than assume.
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) {
    throw error;
  }
}
