# Clerk Migration — Phase 6 Manual Verification Checklist

**Date:** 2026-07-29
**Status:** NOT STARTED — everything below needs a real device/TestFlight build; none of it is checkable via `expo start --web` or CI.

This is the remaining half of Phase 6 (`docs/clerk-migration-plan.md`). The SQL-level half is already done: `supabase/tests/database/rls_clerk_jwt.test.sql` — 14/14 pgTAP assertions passing locally, covering cross-user reads/writes on aircraft, memberships, timeline entries, users, and storage objects under simulated Clerk JWTs. This checklist is everything that suite *can't* cover — real Apple/Google sign-in, real device storage, real app navigation — plus a couple of things this session found were missing outright, not just untested.

---

## 0. Prerequisites (nothing below works without these)

- [ ] Real Clerk Frontend API domain — `supabase/config.toml`'s `[auth.third_party.clerk]` block still has `domain = "placeholder.clerk.accounts.dev"` (a syntactically-valid placeholder, not a real one). Get the real value from the Clerk Dashboard's "Connect with Supabase" flow (dashboard.clerk.com/setup/supabase) and replace it.
- [ ] Supabase Dashboard configured to match — Authentication → Third-Party Auth → add Clerk, using the same domain, on the linked remote project (`aocmjvqsdrdftubpxrnk`), not just locally.
- [ ] `.env` filled in (copy from `.env.example`): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME`. The last one is read by `@clerk/expo-google-signin`'s config plugin at `expo prebuild`/EAS Build time, not at runtime — it has to be set *before* the build, not just before running the app.
- [ ] A development-client build (`developmentClient: true` profile already exists per Phase 0 notes) or TestFlight build — native Apple/Google sign-in has no web implementation (`EXPO_PUBLIC_SKIP_AUTH=1` only bypasses the gate for previewing screens, it doesn't exercise real auth).
- [ ] Test data is currently wiped (Phase 0 decision) — start from a clean signed-out state.

---

## 1. Sign-in / session

- [ ] **Apple sign-in** — first-time sign-in completes, lands on onboarding (no aircraft yet).
- [ ] **Google sign-in** — same, on a second test identity.
- [ ] **`public.users` row created on first sign-in** — new addition this session (`src/features/auth/ensureUserProfile.ts`, PR #46), not yet verified against a real Clerk session. Check the row exists in the Supabase Dashboard's table editor after first sign-in, with a sensible `display_name` (should reflect the real name Apple/Google provided, or fall back to the email's local part).
- [ ] **Session persists across app restart** — force-quit and reopen; should land signed in, not back at the sign-in screen.
- [ ] **Sign-out** — returns to the sign-in screen; a subsequent app restart stays signed out (no stale session).

## 2. Aircraft creation & membership

- [ ] **Create an aircraft** — exercises `create_aircraft_with_owner` RPC end-to-end, including the FK from `aircraft_memberships.user_id` to `public.users.id` that motivated the fix in #46. If the `public.users` row wasn't created in step 1, this is where it would fail with a foreign-key error.
- [ ] **Owner can view/edit their own aircraft.**
- [ ] **A second signed-in identity (non-member) cannot see a private aircraft** they don't belong to — app-level sanity check on top of the pgTAP suite's SQL-level version of the same assertion.

## 3. Storage

- [ ] **Profile image upload** — uses the new `storage_first_path_text()` path helper (PR #45); this is the one pgTAP couldn't exercise (object upload, not just a policy check against pre-seeded rows).
- [ ] **Aircraft primary photo upload** — verified-owner-only write, unchanged helper (`storage_first_path_uuid`), but worth confirming it still works post-migration.
- [ ] **Timeline photo upload**, same reasoning.
- [ ] **Profile images are visible across users** (by design — see `20260726200000_create_storage_buckets.sql`), aircraft/timeline images are not (visibility-gated) — spot check both.

## 4. Regression sanity

- [ ] Nothing from Phase 1–2 (aircraft profile, Story tab, onboarding) broke — a quick pass through existing screens, not a full re-test.

---

## References

- `docs/clerk-migration-plan.md` §Phase 6
- `supabase/tests/database/rls_clerk_jwt.test.sql` — SQL-level half of this phase, already passing
- PR #45 (Phases 4–5: data model + RLS rewrite), PR #46 (`ensureUserProfile` fix)
- Phase 0 notes: only pre-launch QA test accounts existed; wiped, not migrated

**Next step once this passes:** Phase 7 cleanup (remove `src/features/auth/legacy/`, remove unused Supabase Auth config, update `docs/TDD.md` §6) — explicitly gated on this checklist, per the migration plan's rollback guidance.
