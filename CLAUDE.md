# Digital Hangar

Digital Hangar is a mobile-first app that gives general aviation aircraft owners a digital home for their airplane. The aircraft is the hero — this is not a maintenance tracker, fleet manager, or social network wearing an aviation skin.

**Read `docs/` before making product or architecture calls.** In order of authority when documents conflict: `docs/IMPLEMENTATION_SPEC.md` and `docs/ADDENDUM.md` (latest decisions) override `docs/TDD.md` and `docs/PRD.md` (original scope) where they disagree — the addendum and spec exist specifically to resolve conflicts between the PRD and Brand doc. `docs/BRAND.md` governs tone, visual direction, and copy voice.

## Product Principles (do not violate silently)

- **Aircraft first.** The aircraft is the primary object, not the user. Users don't "post" — they add to the aircraft's story.
- **Calm over complexity.** No dashboards, no gamification, no busy UI. The interface should disappear.
- **Story / Care / Fly** are the three nav pillars. Story = memories/milestones/timeline. Care = maintenance, squawks, reminders (member-only, always — see below). Fly = flights, hours, routes.
- **Community ships in v1**, scoped exactly to `docs/ADDENDUM.md` Section A: automatic membership by aircraft type + browse/discover only. No comments, Q&A, or discussions until post-MVP.
- **AI is a layer, not the destination.** No "chatbot" framing. See `docs/BRAND.md` §19 for voice ("Your aircraft assistant," not "AI-powered platform").

## Tech Stack

- Mobile: React Native + Expo
- Backend: Supabase (Postgres, Auth, Storage)
- State/data fetching: TanStack Query (React Query) + Supabase client — no Redux
- Auth: Sign in with Apple, Sign in with Google (Supabase Auth), identity decoupled from aircraft ownership (join table, not a foreign key on the user)
- AI: Claude API, structured retrieval (aircraft-scoped context from timeline/squawks/reminders/flights), no vector DB in MVP
- Push notifications: `expo-notifications`, triggered by a scheduled Supabase Edge Function checking reminder due dates
- Images: client-side compress via `expo-image-manipulator` before upload; Supabase Storage transformation for display variants, no server-side thumbnail pipeline
- CI/CD: EAS Build/Submit/Update, GitHub Actions on `main`/`develop`

## Database

Full schema (types, constraints, RLS) is in `docs/IMPLEMENTATION_SPEC.md` §1. Two non-obvious rules to preserve:

1. **Visibility inheritance differs by content type.** Aircraft profile, Timeline Entries, and Flights inherit the aircraft's `visibility` (private/community/public, defaults to `community`). Squawks and Reminders are **always member-only**, regardless of aircraft visibility — this was a deliberate call, not an oversight, because Care content is operational, not for display.
2. **`timeline_entries.type = 'maintenance'`** lives in the same table as memories/milestones but is queried separately and surfaced in the Care tab, not Story. Don't split this into a separate table without discussing it first — it's an intentional query-level split.

## What NOT to build in v1

Aircraft logbook/pilot logbook replacement, flight planning, aircraft marketplace, full discussion forum, fleet management, comments/Q&A on community aircraft, vector search or fine-tuned models, microservices, Kubernetes, custom auth.

## Repo Conventions

- Project structure follows `docs/TDD.md` §5 (`app/`, `components/`, `features/`, `services/`, `hooks/`, `models/`, `utils/`).
- Branching: `main`, `develop`, feature branches.
- TypeScript throughout.
- **Verification before a PR is type-check + lint + automated tests passing — not a simulator boot.** senior-engineer does not wait on an iOS simulator/native build to self-verify before opening a PR; that's slow and not its job. PRs note whether a change is checkable via `expo start --web` (most UI) or needs manual device verification (native-only: Apple/Google sign-in, camera, push notifications). Simulator/device-level verification is a human call for now, and the QA agent's job once it exists.

## Guardrails

- **Cost:** subagents are model-tiered in their frontmatter — `product-owner` and `project-manager` run on Haiku (structured, bureaucratic tasks), `senior-engineer` runs on Sonnet (actual implementation). Don't upgrade PO/PM to a stronger model without a reason; that's where cost creeps in unnecessarily.
- **Destructive commands:** `.claude/settings.json` denies `rm -rf`, `git push --force`, `git reset --hard`, branch deletion, and `gh repo delete` outright, and requires confirmation on `git push`, `rm`, and Supabase migration/reset commands. This is a best-effort client-side layer, not the authoritative one — GitHub branch protection on `main`/`develop` (require PR review, block force-push, block deletion) is the real backstop and should be enabled in repo settings directly, since client-side permission rules have had reported reliability gaps.
- **Secrets:** this is a private repo, so GitHub's free secret-scanning push protection doesn't apply (that's public-repo-only unless you're on GitHub Advanced Security). The backstop here is `.github/workflows/gitleaks.yml`, which scans every push and PR. Never write real credentials into tracked files — `.env` is gitignored; reference `process.env.*`.
- **Production AI cost (future, not yet built):** none of the docs currently specify per-user rate limiting on the AI assistant feature (Phase 6). Before that ships, add a cap — a single owner shouldn't be able to run up unbounded Claude API cost by spamming the assistant. Flag this when Phase 6 gets broken into issues.

## Docs Index

- `docs/PRD.md` — Product Requirements (v0.1)
- `docs/TDD.md` — Technical Design (v0.2)
- `docs/BRAND.md` — Brand & Design Direction (v1.0)
- `docs/ADDENDUM.md` — Architecture Addendum (v0.2) — resolves PRD/Brand conflicts, adds Flights entity
- `docs/IMPLEMENTATION_SPEC.md` — Implementation Specification (v1.0) — concrete schema, screens, design tokens, current source of truth for Phase 1
