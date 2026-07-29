// LEGACY (pre-Clerk-migration): only used by ./appleSignIn.ts. Kept unwired
// for rollback until the Clerk path is verified end-to-end and Phase 7
// cleanup is explicitly approved — see docs/clerk-migration-plan.md.
import * as Crypto from 'expo-crypto';

// Nonce helper for the Apple sign-in flow (see appleSignIn.ts).
//
// Pattern (mirrors Supabase's documented Apple native sign-in guide):
// 1. Generate a random raw nonce.
// 2. Hand the SHA-256 hash of the raw nonce to the *native* sign-in call —
//    `AppleAuthentication.signInAsync({ nonce: hashed })`.
// 3. Apple echoes the hash back inside the returned ID token's `nonce` claim.
// 4. Hand the *raw* (unhashed) nonce to `supabase.auth.signInWithIdToken`, so
//    Supabase can hash it itself and compare against the token's claim.
//
// This is required because Supabase's Apple provider has "Skip nonce checks"
// OFF, so nonce verification is fully enforced for Apple sign-in.
//
// Google does NOT use this helper. See googleSignIn.ts — the free tier of
// @react-native-google-signin/google-signin has no nonce API on iOS, so
// Google sign-in instead relies on Supabase's "Skip nonce checks" being ON
// for that provider (a deliberate, accepted v1 tradeoff, not an oversight).
export type NoncePair = {
  /** Pass to `supabase.auth.signInWithIdToken({ ..., nonce: raw })`. */
  raw: string;
  /** Pass to the provider's native sign-in request. */
  hashed: string;
};

export async function generateNoncePair(): Promise<NoncePair> {
  const randomBytes = Crypto.getRandomBytes(32);
  const raw = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);

  return { raw, hashed };
}
