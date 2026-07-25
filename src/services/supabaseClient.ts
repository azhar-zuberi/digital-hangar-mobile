import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Typed against src/models/database.types.ts (generated via `npm run db:types`
// once linked to the live project — see issue #2 / README "Local Supabase setup").
export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
