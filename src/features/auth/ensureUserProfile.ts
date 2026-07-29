import { supabase } from '../../services/supabaseClient';

// Minimal shape this needs from Clerk's UserResource (see useUser() in
// @clerk/expo) — typed narrowly here instead of importing Clerk's type so
// this stays trivially testable with a plain object.
export interface ClerkProfileSource {
  id: string;
  fullName: string | null;
  firstName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}

// Mirrors the retired handle_new_user() trigger's display_name fallback
// chain (20260726182211_create_users_and_profile_trigger.sql) — Clerk's
// fields differ from the OIDC claims that trigger read, but the intent is
// the same: best-effort a real name, else the email's local part, else a
// generic placeholder.
function resolveDisplayName(user: ClerkProfileSource): string {
  return (
    user.fullName?.trim() ||
    user.firstName?.trim() ||
    user.primaryEmailAddress?.emailAddress.split('@')[0]?.trim() ||
    'New Member'
  );
}

/**
 * Creates this user's `public.users` row on first sign-in. The Postgres
 * trigger that used to do this (on_auth_user_created, dropped in
 * 20260729100000_repoint_users_id_to_clerk.sql) fired on auth.users inserts,
 * which Clerk sign-ins never produce — this is its client-side replacement,
 * as flagged in 20260729100001_rewrite_rls_for_clerk_jwt.sql's users_insert_own
 * comment. aircraft_memberships.user_id and timeline_entries.created_by both
 * have a foreign key against public.users(id), so this must resolve before
 * aircraft creation is attempted.
 *
 * `ignoreDuplicates: true` (-> `on conflict (id) do nothing`) so a returning
 * user's row — and any display_name/profile_photo_url they've since edited —
 * is never overwritten by stale Clerk profile data on a later sign-in.
 */
export async function ensureUserProfile(user: ClerkProfileSource): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      display_name: resolveDisplayName(user),
      profile_photo_url: user.imageUrl || null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  if (error) {
    throw error;
  }
}
