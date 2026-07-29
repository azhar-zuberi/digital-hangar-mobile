# Digital Hangar: Supabase Auth → Clerk Migration Plan

Version 0.1
Status: Proposed
Related: Technical Design Document (TDD) v0.2, Section 6 (Authentication Architecture)

## 1. Why

The current auth setup (Supabase Auth handling Apple/Google OAuth + session management in
React Native) has been the biggest source of dev friction — not Row Level Security itself.
Rather than scrap RLS or the Postgres data model, this migration replaces only the identity
provider: Clerk takes over login, OAuth, and session/token handling. Supabase remains the
database, storage, and authorization layer (RLS).

This is a **scoped swap of the auth provider**, not a backend rewrite:

- Data model (Users, Aircraft, Aircraft Membership, Timeline, Squawks, Reminders,
  Communities) is unchanged.
- The app keeps talking directly to Postgres via the Supabase client SDK — no custom
  backend API is introduced.
- RLS stays as the authorization mechanism. Policies are rewritten to read the Clerk JWT
  instead of Supabase's own `auth.uid()`.
- Storage (Aircraft/Timeline/Profile image buckets) keeps using Supabase Storage, secured
  the same RLS-based way.

Explicitly out of scope for this migration: Dynamo/S3, any new backend service, any changes
to Aircraft/Timeline/Squawks/Reminders/Communities business logic.

## 2. What changes, at a glance

| Layer | Before | After |
|---|---|---|
| Login / OAuth (Apple, Google) | Supabase Auth | Clerk (`@clerk/clerk-expo`) |
| Session / token management | Supabase Auth SDK | Clerk SDK |
| `users.id` source | Supabase `auth.users.id` (UUID) | Clerk user ID (string, e.g. `user_xxx`) |
| RLS identity check | `auth.uid()` | `(select auth.jwt()->>'sub')` |
| Database | Supabase Postgres | Unchanged |
| Storage | Supabase Storage | Unchanged |
| Authorization mechanism | Postgres RLS | Unchanged (policies rewritten, not removed) |

Note on the old "Clerk + Supabase" integration: a JWT-template-based integration existed
previously but was **deprecated by Supabase as of April 1, 2025** (it required sharing your
Postgres JWT secret with Clerk — a security anti-pattern, and it added latency). This plan
uses the current, supported approach: **Supabase Third-Party Auth**, where Clerk's own
session tokens are validated directly by Supabase via JWKS. No shared secret. Do not use the
old JWT-template integration.

## 3. Phased plan

### Phase 0 — Prep
- Confirm there is no real production user data yet (expected, pre-launch MVP). If there is
  any, decide explicitly whether to migrate it or wipe it — don't assume.
- Create/configure the Clerk application (iOS bundle ID, Apple Sign In capability, Google
  OAuth credentials in Google Cloud Console: iOS + Web client IDs).
- Confirm current Expo setup can produce a **development build** (`expo-dev-client` /
  EAS build). Native Apple/Google sign-in via Clerk does not work in Expo Go.

### Phase 1 — Connect Clerk to Supabase
- In the Clerk Dashboard, use the "Connect with Supabase" setup flow
  (dashboard.clerk.com/setup/supabase). This configures Clerk session tokens to include the
  `role` claim (`authenticated`) that Supabase expects.
- Note the Clerk Frontend API domain (e.g. `your-app.clerk.accounts.dev`) — needed in the
  next step.

### Phase 2 — Enable Clerk as a Third-Party Auth provider in Supabase
- In the Supabase Dashboard: Authentication → Third-Party Auth → add Clerk, using the domain
  from Phase 1.
- For local development / self-hosted Supabase CLI, add to `supabase/config.toml`:
  ```toml
  [auth.third_party.clerk]
  enabled = true
  domain = "your-app.clerk.accounts.dev"
  ```

### Phase 3 — Mobile app: swap the SDK
- Add Clerk's Expo SDK and its native dependencies (`expo-secure-store`, `expo-crypto`,
  `expo-apple-authentication`, `expo-dev-client`). Verify current package/import names
  against Clerk's Expo docs at implementation time, since the SDK evolves.
- Wrap the app root in Clerk's provider.
- Replace the existing Supabase-Auth-based sign-in screen(s) in
  `src/features/authentication` with Clerk's Apple/Google sign-in flows.
- Update Supabase client initialization (`src/services`) to pass an `accessToken` function
  that pulls the current token from the Clerk session, instead of relying on Supabase Auth's
  own session:
  ```ts
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => session?.getToken() ?? null,
  })
  ```

### Phase 4 — Data model: repoint `users.id`
- Change `users.id` from a foreign key against Supabase `auth.users` to a plain string
  column holding the Clerk user ID.
- Update the sign-up flow ("Create Digital Hangar user profile" in TDD §6.4) to create the
  `users` row keyed on the Clerk user ID after first sign-in.
- Audit every table with a `user_id` / `created_by` reference (Aircraft Membership, Timeline
  Entries, Squawks) — these stay as plain foreign keys to `users.id`, just now pointing at a
  Clerk-sourced string instead of a Supabase Auth UUID. No structural change to those tables.

### Phase 5 — Rewrite RLS policies
- Every existing policy that references `auth.uid()` needs to reference the Clerk subject
  claim instead: `(select auth.jwt()->>'sub')`.
- This applies to: `aircraft`, `aircraft_membership`, `timeline_entries`, `timeline_photos`,
  `squawks`, `reminders`, and the Storage policies on the Aircraft/Timeline/Profile buckets.
- Keep policies as simple, reusable checks where possible (e.g. a single
  `is_aircraft_member(aircraft_id, user_id)` SQL function used across policies) — this is a
  good moment to simplify policy structure while touching every policy anyway, without
  changing what they enforce.

### Phase 6 — Testing
Critical flows to verify end-to-end before removing the old auth path:
- Apple sign-in, Google sign-in, session persistence across app restart, sign-out.
- Aircraft creation, aircraft membership checks (owner vs. non-member access).
- Storage upload/read permission checks (aircraft images, timeline images, profile images).
- Negative tests: a signed-in user cannot read/write another user's private aircraft or
  membership rows.
- If a local Supabase CLI test harness exists (or can be added cheaply — `supabase test db` /
  pgTAP), prefer testing RLS policies at the SQL level directly; it's a much faster loop than
  exercising policies through the full app.

### Phase 7 — Cleanup
- Remove the Supabase Auth SDK calls and any Apple/Google OAuth wiring that went through
  Supabase Auth directly.
- Remove now-unused Supabase Auth env vars/config.
- Update TDD §6 (Authentication Architecture) to describe Clerk + Supabase Third-Party Auth
  instead of Supabase Auth.

## 4. Rollback / safety

- Do the migration on a branch; keep the existing Supabase-Auth sign-in path working until
  Clerk sign-in has been verified end-to-end on a TestFlight build, not just locally.
- Because this changes the identity/primary-key format for `users.id`, it is not easily
  reversible once real user data exists — this is another reason to do it now, pre-launch,
  rather than later.

## 5. Environment variables (both sides)

- Clerk: publishable key, frontend API domain.
- Supabase: URL, publishable/anon key (unchanged), Third-Party Auth provider configured in
  dashboard (no new secret to store in the app — that's the point of the non-deprecated
  integration).

## 6. Sources

- Supabase: Clerk third-party auth — https://supabase.com/docs/guides/auth/third-party/clerk
- Clerk: Supabase integration guide — https://clerk.com/docs/guides/development/integrations/databases/supabase
- Clerk: Expo SDK reference — https://clerk.com/docs/reference/expo/overview
