import { supabase } from '../../services/supabaseClient';

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
