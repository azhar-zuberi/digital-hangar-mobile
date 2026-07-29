// LEGACY (pre-Clerk-migration): superseded by ../signOut.ts (Clerk-backed).
// Kept unwired for rollback until the Clerk path is verified end-to-end and
// Phase 7 cleanup is explicitly approved — see docs/clerk-migration-plan.md.
import { supabase } from '../../../services/supabaseClient';

// Single sign-out path for every provider. Supabase Auth owns the session
// regardless of whether it was created via Apple or Google, so there is
// nothing provider-specific to do here — no per-provider branching, per
// issue #4's acceptance criteria.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
