# Digital Hangar

Digital Hangar is a mobile-first app that gives general aviation aircraft owners a digital
home for their airplane. See `CLAUDE.md` for product principles and `docs/` for the full
spec — `docs/IMPLEMENTATION_SPEC.md` and `docs/ADDENDUM.md` are the current source of truth.

## Stack

- React Native + Expo (managed workflow), TypeScript (strict mode)
- Supabase (Postgres, Auth, Storage)
- TanStack Query (React Query) + the Supabase client for server state — no Redux
- ESLint (`eslint-config-expo`) + Prettier
- Jest (`jest-expo` preset) + React Native Testing Library for unit/component tests

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
npm test                 # Jest — unit + component tests
npm run test:watch       # Jest — watch mode
npm run test:coverage    # Jest — with coverage report
```

iOS is the MVP target platform (`docs/TDD.md` §4.1, §20); Android/web are not actively
supported yet, though the architecture doesn't preclude them later.

## Testing

**Framework: Jest + React Native Testing Library**, via the `jest-expo` preset (issue #12).
`jest-expo` supplies the RN/Expo Jest environment — native module mocks, asset transforms,
and Babel via `expo/internal/babel-preset` (this project has no `babel.config.js`; Expo
falls back to its internal preset automatically, both for Metro and for Jest). Config lives
in `jest.config.js`.

Conventions:

- Test files live in `__tests__/` next to the code they cover, e.g.
  `src/features/auth/__tests__/authErrors.test.ts`.
- `@testing-library/react-native`'s `render()` is `async` in the installed version (v14,
  for React 19 concurrent rendering) — `await render(...)`, not `render(...)`.
- Custom Jest matchers (`toBeVisible`, etc.) are auto-registered by
  `@testing-library/react-native` on import; no separate `jest-native` setup needed.
- See `src/features/auth/__tests__/authErrors.test.ts` (unit test — pure sign-in error
  classification logic) and `src/components/__tests__/PlaceholderScreen.test.tsx`
  (component test, via RNTL) for the pattern to follow.

**Detox (on-device E2E): deferred, not adopted for Phase 1.** Reasoning:

- Detox needs a compiled native binary (a real EAS/Xcode build) to drive, which only
  becomes worth the setup cost once there's enough real screen flow to script end-to-end —
  right now the app is still mostly scaffolding (nav shell + auth + empty feature folders).
- It would also gate CI on a native build step, which conflicts with this repo's current
  verification bar (`CLAUDE.md`: "type-check + lint + automated tests passing — not a
  simulator boot") and would slow down every PR for coverage the Jest/RNTL layer already
  gets close enough to for Phase 1.
- Revisit once Phase 2/3 land enough real user-facing flow (aircraft creation, timeline,
  Care tab) that a true device-level regression suite pays for itself — and once the QA
  agent mentioned in `CLAUDE.md` exists to own that loop, rather than folding E2E
  maintenance onto every feature PR in the meantime.

This is a decision, not a silent gap — revisit the criteria above before assuming Detox is
still out of scope in a later phase.

### Previewing the signed-in app on web

Apple and Google sign-in have no web implementation (Apple's button is iOS-only; Google's
free-tier SDK renders a no-op stub on web), so `npm run web` normally can't get past the
sign-in screen. For local UI development only, skip the auth gate with:

```bash
EXPO_PUBLIC_SKIP_AUTH=1 npm run web
```

This only takes effect in a dev build (`__DEV__`) — it's inert in any production build
regardless of env configuration. Set `EXPO_PUBLIC_SKIP_AUTH=1` in your local `.env` instead
of the command line if you want it on by default; either way, never commit it as `1`.

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

## CI/CD

`.github/workflows/ci.yml` (issue #12) runs on every push/PR to `main` and `develop`:

- **`verify` job** — `npm ci`, then typecheck (`tsc --noEmit`), lint (`expo lint`),
  Prettier check, and the Jest suite. This is the gate described in `CLAUDE.md` — every PR
  is checked against this, not a simulator/device build.
- **`eas-build` job** — only on an actual push to `main`/`develop` (never on a PR), and only
  after `verify` passes. Triggers `eas build --platform ios --profile beta` on `main` or
  `--profile development` on `develop`, per the Development/Beta/Production split in
  `docs/TDD.md` §20 and `docs/IMPLEMENTATION_SPEC.md` §4. If the `EXPO_TOKEN` repo secret
  isn't set, this step logs a warning and skips rather than failing the workflow — see
  "Secrets" below for what to add and the manual command to run in the meantime.

`.github/workflows/gitleaks.yml` (pre-existing) scans every push/PR for committed secrets,
independent of `ci.yml`.

`eas.json` defines three build profiles — `development` (internal, dev client, simulator
disabled), `beta` (store distribution, for TestFlight), and `production` (store
distribution, for App Store) — plus matching `submit` profiles for `beta`/`production`.
EAS Submit reads Apple credentials from environment variables (see "Secrets") rather than
from `eas.json` itself, so nothing account-identifying is committed.

Production (App Store) submission is a deliberate manual step
(`eas build --profile production` then `eas submit --profile production`), not automatic on
every `main` push — this keeps a human in the loop for the one step that's actually
user-facing and irreversible-ish (an App Store release), while Development/Beta builds stay
automatic.

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
   supabase link --project-ref aocmjvqsdrdftubpxrnk
   ```

5. **Apply migrations.** All schema changes live under `supabase/migrations/` as plain SQL
   files, applied in filename (timestamp) order:

   ```bash
   supabase db push
   ```

   This currently applies the smoke-test table from issue #2 (`_health_check`), the
   `users` table + `public_profiles` view from issue #5, the `aircraft` /
   `aircraft_memberships` / `communities` tables + RLS from issues #6 and #18, and the
   `aircraft-images` / `timeline-images` / `flight-images` / `profile-images` Storage
   buckets + RLS from issue #7 — the rest of the domain schema (timeline entries,
   squawks, reminders, flights) lands via later issues.

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

### Image uploads

Any feature that uploads a photo (aircraft primary photo, timeline photos, flight photos,
profile photos) should go through `src/services/imageCompression.ts` (client-side resize to a
2048px long edge + ~80% JPEG compression via `expo-image-manipulator`, per
`docs/IMPLEMENTATION_SPEC.md` §4) and then `src/services/imageUpload.ts`'s `uploadImage()` —
never upload an uncompressed original directly. `uploadImage()` throws a calm-copy
`ImageUploadError` (see `docs/BRAND.md` §17) on network failure or an oversized source file.
`getDisplayImageUrl()` in the same file returns a signed, RLS-checked URL and can request a
display-size variant via Supabase Storage's on-the-fly image transformation instead of a
separate thumbnail pipeline.

## Secrets

Never commit real credentials. `.env` is gitignored; copy `.env.example` and fill in your
own values locally. Every push and PR is scanned by `.github/workflows/gitleaks.yml` as a
backstop (this repo is private, so GitHub's free push-protection secret scanning doesn't
apply automatically).

### Required GitHub Actions secrets

None of these are set yet (`ci.yml`'s `eas-build` job checks for `EXPO_TOKEN` and skips
with a warning, rather than failing, until it's added). Add via Settings → Secrets and
variables → Actions, or `gh secret set <NAME>`:

| Secret | Used for |
| --- | --- |
| `EXPO_TOKEN` | Authenticates `eas build` in CI (`eas-build` job in `ci.yml`). Generate a robot/personal access token from your Expo account. Without it, the EAS Build trigger step is a documented manual step instead (see `ci.yml`'s skip-warning message for the exact command). |
| `EXPO_APPLE_ID` | Apple ID email for `eas submit` (TestFlight/App Store) — read by the EAS CLI directly from the environment, not from `eas.json`. Only needed once submission is automated; not required for `eas build` alone. |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for the same Apple ID, for non-interactive `eas submit`. |
| `EXPO_ASC_APP_ID` | App Store Connect app ID, for `eas submit`. |
| `EXPO_APPLE_TEAM_ID` | Apple Developer Team ID, for `eas submit`. |

The Supabase URL/anon key are public-by-design client values (`EXPO_PUBLIC_*`, read from
`.env` at build time) and Apple/Google sign-in credentials are configured as native
app/plugin config (`app.json`, `GoogleService-Info.plist` equivalents), not as GitHub
Actions secrets — there's no server-side Actions step today that needs them injected.

**Note on where these actually belong:** the GitHub Actions runner in `ci.yml` only
*triggers* `eas build`; the native build itself runs on EAS's own build infrastructure, not
on the Actions runner. So any value the compiled app needs at build time (Supabase
URL/anon key, Google `iosUrlScheme`, etc.) has to be provided to *EAS*, not GitHub
Actions — via `eas secret:create` (or an EAS environment variable) — not a GitHub Actions
secret. `EXPO_TOKEN` is the one credential that genuinely belongs in GitHub Actions, since
it's what authenticates the Actions runner to EAS in the first place. Currently `app.json`
has no `.env`/EXPO_PUBLIC_* dependency baked into the native build step, so this hasn't
bitten anyone yet — flagging it now so it isn't assumed solved once real EAS builds start
running from CI.
