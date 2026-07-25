import * as Crypto from 'expo-crypto';

// Shared nonce helper for both OAuth providers' OpenID Connect flows.
//
// Pattern (mirrors Supabase's documented Apple/Google native sign-in guides):
// 1. Generate a random raw nonce.
// 2. Hand the SHA-256 hash of the raw nonce to the *native* sign-in call
//    (Apple's `signInAsync({ nonce })`, or — where the client library supports
//    it — the native Google sign-in call).
// 3. The provider echoes the hash back inside the returned ID token's `nonce`
//    claim.
// 4. Hand the *raw* (unhashed) nonce to `supabase.auth.signInWithIdToken`, so
//    Supabase can hash it itself and compare against the token's claim.
//
// This is required because Supabase's Apple/Google providers have "Skip nonce
// checks" turned OFF (a deliberate choice, not a default) — see the PR
// description for the one place this couldn't be honored end-to-end.
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
