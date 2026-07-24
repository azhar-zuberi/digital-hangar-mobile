# Digital Hangar
## Architecture & Product Addendum

**Version:** 0.2
**Status:** For founder sign-off
**Purpose:** Resolve two open issues identified in the PRD/TDD/Brand review — community scope for v1, and the missing Flights data model — before implementation begins.

**Revision note (v0.2):** Section A reversed per founder direction — the PRD is the source of truth on community scope, not the Brand doc. Downstream implications (visibility default, phase plan) updated accordingly.

---

## A. Community Scope Reconciliation

### The conflict

The PRD (§7 MVP Goal 4, §13 "Aircraft Communities") treats aircraft-type community as an MVP feature: automatic membership on aircraft creation, browse/discover other owners, no additional setup required.

The Brand & Design Direction doc (§21 "Community Philosophy") reads more conservatively: *"Community is a future extension. Digital Hangar v1 is a private ownership experience. The first relationship is: Owner ↔ Aircraft."*

### Recommendation

**The PRD governs. Community ships in v1**, scoped exactly as PRD §13 defines it.

Reasoning:

1. The PRD is the more detailed, more deliberate specification of what v1 actually builds — it names community formation as a validation goal (§7, Goal 4) and defines a specific, bounded feature set for it, not a vague aspiration.
2. Re-reading §13, the PRD already draws its own line between what ships now and what's deferred: **MVP Community Features** are browse similar aircraft, view shared aircraft stories, discover other owners — passive discovery, nothing social. **Future Community Features** — comments, Q&A, discussions, regional groups, owner collaboration — are explicitly staged for later by the PRD itself.
3. Read that way, the Brand doc's "community is a future extension" isn't actually in conflict — it's describing the *social* layer (comments, discussions, collaboration) that the PRD also defers. It's not a statement against the lightweight, ownership-driven discovery layer PRD §13 scopes for v1. §3.3 of the PRD makes the same distinction explicitly: *"Digital Hangar is not intended to be another social media platform... Aircraft ownership creates the connection."*
4. Cold-start is a real risk (a "Piper PA-38 Owners" community with two members feels thin), but it's a sequencing/seeding problem to manage at launch, not a reason to cut a named MVP goal.

### Proposed resolution

- PRD §13's **MVP Community Features** (automatic membership by aircraft type, browse/discover, view shared stories) ship in v1, as written.
- PRD §13's **Future Community Features** (comments, Q&A, discussions, regional groups, collaboration) stay deferred — this was already the PRD's own plan, not a new cut.
- **Aircraft visibility defaults to Community on creation**, not Private. This is what makes "automatic membership, no additional setup" (PRD §13) literally true — an aircraft that's auto-enrolled but defaults to Private would show up in no one's discovery view, silently breaking the feature. Owners can still dial down to Private or up to Public at any time (schema in TDD §8.2 already supports this — it's a default-value decision, not a schema change).
- Cold-start is handled operationally, not architecturally: the Piper PA-38 Tomahawk community (PRD's named "Initial Community") is the seed population, consistent with the PRD's own framing of this as the first cohort.

### Status

Resolved — PRD is source of truth. No further sign-off needed on this point.

---

## B. Flights Entity — TDD Addendum

### The gap

The Brand doc's home screen spec (§10) shows flight hours, flight count, and airports visited. The nav IA (§18) makes Fly one of three primary pillars, alongside Story and Care. But the TDD's schema (§8) and feature-folder structure (§5) contain no `flights` table and no `Flights` feature — Fly currently has no data behind it.

### Proposed schema addition

**`flights` table**

Purpose: stores individual flight records — the raw material for the Fly tab and its aggregate stats.

Fields:
- `id`
- `aircraft_id`
- `created_by`
- `flight_date`
- `duration_hours` (numeric — manual entry for MVP; Hobbs/tach import is a future enhancement, not v1)
- `departure_airport` (free text or airport code; optional)
- `arrival_airport` (optional — same as departure for local flights)
- `title` (optional, e.g. "First cross-country")
- `notes` (optional free text)
- `created_at`
- `updated_at`

**`flight_photos` table**

Same pattern as the existing `timeline_photos` table:
- `id`
- `flight_id`
- `storage_path`
- `created_at`

### Aggregate stats

Total hours, total flight count, and distinct airports visited (the numbers shown on the home screen) should be computed via a **Postgres view**, not stored/cached fields — consistent with the TDD's "avoid premature complexity" principle. A materialized view or caching layer can be introduced later if performance requires it; there's no reason to build that now.

### Relationship to Story

A flight can optionally surface as a Story milestone (e.g., logging a flight auto-suggests "First cross-country" as a memory), but that's a nice-to-have integration for a later phase, not a v1 requirement. Flights and Timeline Entries stay as separate tables — this matches the Brand doc's own separation of Story (emotional layer) from Fly (adventure layer).

### Impact on TDD

This adds one new domain object to §2.2's core relationship model:

```
User
  ↓
Aircraft Membership
  ↓
Aircraft
  ↓
• Stories (Timeline Entries)
• Maintenance / Squawks
• Reminders
• Flights  ← new
```

And one new feature folder: `features/flights`, alongside the existing `features/timeline`, `features/squawks`, `features/reminders`.

---

## C. Updated MVP Phase Plan

1. **Foundations** — auth (Apple/Google via Supabase), Users/Aircraft/Aircraft Membership schema + RLS, nav shell (Story/Care/Fly) gated behind "Add My Aircraft." Aircraft visibility defaults to **Community** on creation (see Section A).
2. **Story** — aircraft profile, hero photo, timeline entries (memories/milestones).
3. **Care** — maintenance entries, squawks, reminders + a scheduled check (Supabase Edge Function) to trigger due-date notifications.
4. **Fly** — `flights` + `flight_photos` tables, home screen aggregate stats view.
5. **Community (MVP scope)** — automatic membership by aircraft type, browse/discover other owners, view shared stories, per PRD §13. Comments/Q&A/discussions stay out, per the PRD's own "Future Community Features" split. Seed with the Piper PA-38 Tomahawk cohort named in the PRD.
6. **AI assistant** — single Edge Function, aircraft-scoped structured retrieval over timeline/squawks/reminders/flights, no vector DB.

---

## D. OAuth Identity Linking (Apple / Google Dedup)

### The gap

Neither the PRD nor the TDD specifies what happens if the same person signs in with Apple once and Google another time, using the same email. Since `public.users.id` maps 1:1 to `auth.users.id`, an unhandled case risks creating two separate app profiles ("ghost" accounts) for one person — one of them possibly aircraft-less and orphaned.

### Decision

**Rely on Supabase Auth's built-in automatic identity linking — no custom merge/dedup logic for v1.**

When two OAuth providers report the same *verified* email address, Supabase links both identities to a single `auth.users` row automatically. In the common case (Apple and Google both return a verified email), this means one identity, one `public.users` row, one profile — with zero extra application code. No merge UI, no blocking error, no manual account-linking flow.

### Known limitation (accepted for v1)

If a user chooses Apple's "Hide My Email" relay, Apple issues a private relay address instead of their real email, which won't match their Google email — so automatic linking won't trigger, and that user ends up with two separate profiles. This is accepted as a documented edge case, not solved in v1: it's rare, non-destructive (no data loss — at worst, two aircraft-less accounts), and building account-merge UX for it now would be scope creep against "calm over complexity." Revisit only if it proves to be a real-world support burden post-launch.

### Status

Resolved — no custom dedup logic in scope for issue #4 or Phase 1.

---

*Ready to update the PRD/TDD directly and move into Phase 1 implementation.*
