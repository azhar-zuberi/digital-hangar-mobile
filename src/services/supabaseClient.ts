import 'react-native-url-polyfill/auto';
import { getClerkInstance } from '@clerk/expo';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../models/database.types';

// Values come from the environment, never hardcoded — see .env.example.
// EXPO_PUBLIC_* vars are inlined at build time by Expo, which is safe here
// because the Supabase anon key is meant to be public; RLS enforces access.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Intentionally non-fatal at import time so the placeholder app can still
  // boot before Supabase project credentials exist (Phase 1, issue #1).
  // Actual data access will fail loudly once features start calling this client.
  console.warn(
    'Supabase env vars are not set. Copy .env.example to .env and fill in your project credentials.',
  );
}

// createClient() validates its URL argument eagerly and throws on an empty
// string (rather than just failing later on first request), which would
// defeat the "non-fatal at import time" intent above — CI's test job (and
// any local `npm test` run without a `.env`, since `.env` is gitignored)
// has no EXPO_PUBLIC_SUPABASE_* vars set, and any test that transitively
// imports this module (e.g. via imageUpload.ts) would otherwise crash the
// whole suite before a single assertion runs. A syntactically-valid
// placeholder keeps client construction non-fatal in that case; real
// requests against it still fail (network error against a host that
// doesn't resolve), same as the pre-existing "fails loudly once features
// start calling this client" behavior this comment already documented.
const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

// Typed against src/models/database.types.ts (generated via `npm run db:types`
// once linked to the live project — see issue #2 / README "Local Supabase setup").
export const supabase = createClient<Database>(
  supabaseUrl ?? FALLBACK_SUPABASE_URL,
  supabaseAnonKey ?? FALLBACK_SUPABASE_ANON_KEY,
  {
    // Clerk is the identity provider now (see docs/clerk-migration-plan.md) —
    // Supabase's own Auth session/storage is no longer used here; Supabase
    // validates Clerk's session token directly via Third-Party Auth (JWKS),
    // configured in the Supabase dashboard and supabase/config.toml, not in
    // this client. getClerkInstance() with no arguments (rather than passing
    // a publishableKey here too) returns the same singleton <ClerkProvider>
    // already initialized in App.tsx — calling it with a fallback key here
    // instead risks reinitializing/resetting that singleton if this ever ran
    // before the provider mounted. It's called fresh on every request
    // (rather than capturing a session reference once) so a request always
    // gets a current, auto-refreshed token from Clerk's own token cache.
    accessToken: async () => {
      const { session } = getClerkInstance();
      return (await session?.getToken()) ?? null;
    },
  },
);
