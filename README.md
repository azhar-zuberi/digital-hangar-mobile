# Digital Hangar

Digital Hangar is a mobile-first app that gives general aviation aircraft owners a digital
home for their airplane. See `CLAUDE.md` for product principles and `docs/` for the full
spec — `docs/IMPLEMENTATION_SPEC.md` and `docs/ADDENDUM.md` are the current source of truth.

## Stack

- React Native + Expo (managed workflow), TypeScript (strict mode)
- Supabase (Postgres, Auth, Storage)
- TanStack Query (React Query) + the Supabase client for server state — no Redux
- ESLint (`eslint-config-expo`) + Prettier

## Project structure

```
src/
  app/          — navigation, screens
  components/   — reusable UI components
  features/     — auth, aircraft, timeline, squawks, reminders, flights, community
  services/     — Supabase client, TanStack Query client, AI services
  hooks/        — shared custom hooks
  models/       — shared TypeScript types mirroring the database schema
  utils/        — design tokens, formatting, misc helpers
```

`App.tsx` at the repo root is Expo's entry point; it re-exports the real app root at
`src/app/App.tsx` so the source tree matches `docs/TDD.md` §5.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own Supabase project URL/anon key — never commit real values
npm run ios            # build and run on the iOS simulator (requires Xcode)
npm run start           # or: start the Metro bundler and open in Expo Go / a dev client
```

Useful scripts:

```bash
npm run lint            # ESLint
npm run format           # Prettier — write
npm run format:check     # Prettier — check only
npm run typecheck        # tsc --noEmit
```

iOS is the MVP target platform (`docs/TDD.md` §4.1, §20); Android/web are not actively
supported yet, though the architecture doesn't preclude them later.

## Branching & workflow

Per `docs/TDD.md` §18:

- **`main`** — production. Deploys to TestFlight/App Store via EAS Submit.
- **`develop`** — integration branch. All feature work merges here first.
- **`feature/<issue-number>-<short-description>`** — one branch per GitHub issue, branched
  from `develop`, merged back via PR referencing the issue number.

Environment separation follows Development → Beta → Production, backed by Supabase's
managed infrastructure and EAS Build/Submit/Update (`docs/IMPLEMENTATION_SPEC.md` §4).

### Branch protection

`main` and `develop` should have GitHub branch protection enabled directly in repo settings
(Settings → Branches), per `CLAUDE.md` "Guardrails" — this is the authoritative backstop,
not the client-side rules in `.claude/settings.json`:

- Require a pull request before merging (at least one review).
- Block force pushes.
- Block branch deletion.
- Require status checks to pass before merging (CI, `gitleaks` secret scan) once those
  workflows exist.

These protections are configured in GitHub's UI/API, not in this repo's code, so they can't
be verified by reading a file here — confirm them in Settings → Branches after this PR merges
if they aren't already on.

## Local Supabase setup for a new developer

Every feature that touches data depends on a linked Supabase project and a typed client.
Follow these steps once, locally:

1. **Get a Supabase project.** For the shared Development environment, ask to be added as a
   collaborator on the existing project (ref `aocmjvqsdrdftubpxrnk`). To stand up your own
   throwaway project instead, create one at [supabase.com](https://supabase.com) and swap the
   project ref below for yours.

2. **Install the Supabase CLI** (not a project dependency — install however you prefer, e.g.
   `brew install supabase/tap/supabase`).

3. **Fill in `.env`:**

   ```bash
   cp .env.example .env
   ```

   Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the Supabase
   dashboard (Project Settings → API). Never commit `.env` — it's gitignored, and both values
   are read at build time via `process.env.EXPO_PUBLIC_*` (Expo's built-in env inlining, no
   extra `app.config.ts` plumbing needed).

4. **Authenticate and link the CLI to the project:**

   ```bash
   supabase login
   supabase link --project-id aocmjvqsdrdftubpxrnk
   ```

5. **Apply migrations.** All schema changes live under `supabase/migrations/` as plain SQL
   files, applied in filename (timestamp) order:

   ```bash
   supabase db push
   ```

   This currently applies just the smoke-test table from issue #2
   (`_health_check`) — the real domain schema (users, aircraft, timeline entries, squawks,
   reminders, communities, flights) lands via later issues (#5, #6, #18, ...).

6. **Regenerate the typed client** from the live schema:

   ```bash
   npm run db:types
   ```

   This overwrites `src/models/database.types.ts` with the Supabase CLI's real output. Do this
   any time the schema changes.

7. **Run the smoke test** to confirm the app can actually reach the database through the anon
   key and RLS:

   ```bash
   npm run db:smoke-test
   ```

   It queries `_health_check` and prints the seed row on success. If it fails, the most likely
   cause is step 5 not having been run yet (or `.env` pointing at the wrong project).

The typed client itself lives at `src/services/supabaseClient.ts` and is used everywhere data
is fetched (TanStack Query + this client — see `docs/ADDENDUM.md` §4).

## Secrets

Never commit real credentials. `.env` is gitignored; copy `.env.example` and fill in your
own values locally. Every push and PR is scanned by `.github/workflows/gitleaks.yml` as a
backstop (this repo is private, so GitHub's free push-protection secret scanning doesn't
apply automatically).
