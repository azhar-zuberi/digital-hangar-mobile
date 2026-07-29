import { getClerkInstance } from '@clerk/expo';

// Single sign-out path for every provider, same shape/signature as the
// legacy Supabase-Auth version (../legacy/signOut.ts) so callers (e.g.
// HomeScreen.tsx) didn't need to change. getClerkInstance() (see
// ../../services/supabaseClient.ts for the same pattern used to read the
// current Clerk session outside a component) returns the same singleton
// ClerkProvider initialized in App.tsx.
export async function signOut(): Promise<void> {
  await getClerkInstance().signOut();
}
