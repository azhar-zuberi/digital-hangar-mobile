# Phase 1 Foundations Sign-Off

**Date:** 2026-07-27  
**Status:** COMPLETE — All required issues closed and merged to `develop`. No blockers found.

---

## Issues Verified

All 14 Phase 1 Foundations issues are confirmed closed and merged to `develop`:

### Authentication
- #3 — Auth: Sign in with Apple (closed 2026-07-25)
- #4 — Auth: Sign in with Google (closed 2026-07-25)

### Schema & Infrastructure
- #1 — Scaffold Expo + TypeScript project structure (closed 2026-07-25)
- #2 — Wire Supabase project: env config + typed client (closed 2026-07-25)
- #5 — Migration: users table + RLS, and profile row creation on first sign-in (closed 2026-07-26)
- #6 — Migration: aircraft + aircraft_memberships tables + RLS policies (closed 2026-07-26)
- #7 — Configure Supabase Storage buckets + image compression pipeline (closed 2026-07-26)
- #18 — Migration: communities table + auto-populate trigger (closed 2026-07-26)
- #12 — CI/CD: EAS Build + GitHub Actions pipeline, choose test framework (closed 2026-07-27)

### Onboarding & Navigation
- #8 — Onboarding: Add My Aircraft screen (required fields only) (closed 2026-07-27)
- #9 — Onboarding: aircraft creation + owner membership transaction (closed 2026-07-27)
- #10 — Nav shell: Story / Care / Fly tab bar scaffold (closed 2026-07-26)
- #11 — Home gating: redirect to onboarding when user has no aircraft (closed 2026-07-27)
- #26 — Onboarding: choice screen + search-by-registration (Find an Aircraft) (closed 2026-07-27)

Source: `gh issue list --repo azhar-zuberi/digital-hangar-mobile --label phase:foundations --state all` confirms all 14 closed.

---

## Cross-Check Against Design Docs

### IMPLEMENTATION_SPEC.md §1 (Database Schema)

Phase 1 required tables and RLS policies:

| Table | Issue | Status | Notes |
|---|---|---|---|
| `users` | #5 | ✓ Complete | RLS allows user to select/update own row; `public_profiles` view exposes display name only |
| `aircraft` | #6 | ✓ Complete | Default visibility = `community` per Addendum §A; RLS via `can_view_aircraft()` |
| `aircraft_memberships` | #6 | ✓ Complete | Creator gets `relationship='owner'`, `verified=true`; RLS limits select/insert appropriately |
| `communities` | #18 | ✓ Complete | Auto-populated by trigger on aircraft insert; RLS read-only for client |

### IMPLEMENTATION_SPEC.md §2 (Screen & Flow Inventory)

Phase 1 required screens and flows:

| Screen/Flow | Issue(s) | Status | Notes |
|---|---|---|---|
| Sign in (Apple) | #3 | ✓ Complete | OAuth via Supabase Auth |
| Sign in (Google) | #4 | ✓ Complete | OAuth via Supabase Auth |
| Onboarding choice (Add / Find) | #26 | ✓ Complete | Routes to Add My Aircraft or search flow |
| Add My Aircraft form | #8 | ✓ Complete | Required fields only (registration, manufacturer, model, primary photo); optional fields deferred |
| Aircraft creation transaction | #9 | ✓ Complete | Atomic `aircraft` + `owner` membership row creation |
| Find an Aircraft search | #26 | ✓ Complete | Registration lookup; read-only profile view respecting visibility |
| Nav shell (Story/Care/Fly) | #10 | ✓ Complete | Tab bar scaffold; Entry point above tab navigator |
| Home gating | #11 | ✓ Complete | Users with no aircraft routed to onboarding, not Home |

### ADDENDUM.md §C (Phase 1 Scope)

Foundations phase includes:
- Auth (Apple/Google via Supabase) — ✓ #3, #4
- Users/Aircraft/Aircraft Membership schema + RLS — ✓ #5, #6
- Communities table + auto-populate trigger — ✓ #18
- Nav shell (Story/Care/Fly tab bar) scaffold — ✓ #10
- Gating behind "Add My Aircraft" — ✓ #11
- Aircraft visibility defaults to `community` on creation — ✓ #9 RPC, #26 form

**All items covered. No gaps detected.**

---

## Spot-Check: Scope Creep & Deviations

### PR #27: Issue #7 (Storage Buckets + Image Compression)

**Deviation flagged in PR:** Added a fourth `flight-images` bucket. TDD §9 predates the `flights` entity added in Addendum v0.2 Section B, so the original plan named only three buckets (aircraft, timeline, profile). The issue's acceptance criteria explicitly require photo-upload support for flights, and `flight_photos.storage_path` (IMPLEMENTATION_SPEC §1.10) has nowhere to live under the original buckets.

**Verdict:** ✓ Acceptable. The fourth bucket was added with the same RLS pattern as `timeline-images` (member read/write, inheriting aircraft visibility). Deviation is documented in the migration header comment and PR body — no silent scope drift. Noted as a pending TDD §9 update for the future.

### PR #29: Issue #9 (Aircraft Creation Transaction)

**Deviation flagged in PR:** Primary photo is not part of the atomic transaction. The Storage bucket's RLS requires the owner membership row to exist first before photo upload can succeed; Storage uploads are also a separate HTTP surface from the SQL function, so they cannot be in the same transaction regardless.

**Verdict:** ✓ Acceptable. The 3-step flow is documented:
1. Create aircraft (without photo)
2. Upload photo to `aircraft-images` bucket (now allowed since owner membership exists)
3. Update `aircraft.primary_photo_url` with storage path

Both PRs clearly documented their deviations; no hidden scope creep.

### Issue #6/#18: Aircraft & Communities RLS Verification

PR #24 combined these issues and verified RLS comprehensively via rolled-back transactions against the live dev Supabase project (`aocmjvqsdrdftubpxrnk`), testing 8+ edge cases:

- Private/community/public visibility filtering works correctly
- Member-only access enforced via `is_aircraft_member()`
- Verified-owner-only access enforced for updates
- Communities auto-populated exactly once per manufacturer/model pair
- Non-members cannot see private aircraft
- Community membership checked correctly (verified ownership of same aircraft type)
- Authenticated users can read `communities`; no client writes allowed
- `anon` role sees 0 rows across all tables

**Verdict:** ✓ RLS policies verified end-to-end. No policy gaps or silent regressions detected.

### HomeScreen.tsx: Current State

File exists at `src/app/screens/HomeScreen.tsx` with intentional placeholder content:

```
Placeholder for Home ("My Digital Hangar") — real content (hero photo,
ownership snapshot, recent hangar activity per IMPLEMENTATION_SPEC.md §2)
is out of scope for issue #10, which only needs Home reachable as the
entry point above the Story/Care/Fly tab navigator.
```

The screen gates access (issue #11 ensures users with no aircraft never land here) and includes a temporary "Sign out" button pending Profile/Settings. The "Enter the Hangar" button navigates to the tab bar.

**Verdict:** ✓ Correct scope for Phase 1. Aircraft profile screen (hero photo, identity block) is Phase 2 (#13) scope, with the Ownership Snapshot feature requiring the flights table (Phase 4 dependency per ADDENDUM §C item 4).

---

## Phase 2 Sequencing Recommendation

**Status:** Ready to decompose immediately. Phase 2 has zero blockers — all Phase 1 dependencies are complete.

### Recommended Decomposition Order (Priority Sequence)

**1. Timeline entries schema migration** (new issue)
- Create `timeline_entries` table (type: memory/milestone/maintenance, title, description, event_date, created_by, aircraft_id)
- Create `timeline_photos` table (timeline_entry_id, storage_path)
- RLS: select follows aircraft visibility; insert/update/delete restricted to aircraft members
- Reference: IMPLEMENTATION_SPEC §1.4–1.5
- Blocked by: nothing
- Blocks: Story tab UI, Care tab (maintenance entries), Recent Hangar Activity cross-phase query

**2. Aircraft profile screen** (new issue)
- Display on Home as the primary content area
- Hero photo (full-bleed, 4:3 landscape, rounded top corners)
- Identity block: tail number (hero typography), make/model, nickname if present
- Brand-voice copy per BRAND.md §17
- Reference: IMPLEMENTATION_SPEC §2 (Home screen structure, items 1-2)
- Blocked by: nothing
- Blocks: Community aircraft cards (Phase 5)
- **Note:** Ownership Snapshot (`aircraft_flight_stats` view) depends on flights table (Phase 4). Phase 2 can build the screen without stats; Phase 4 adds the stats section.

**3. Story tab UI & detail view** (new issue)
- List `timeline_entries` where `type in ('memory','milestone')`, reverse chronological
- Group by year per IMPLEMENTATION_SPEC §2
- Detail view: title, description, date, photos
- Add flow: type picker (Memory / Milestone), title, description, date, photo capture/upload
- Reference: IMPLEMENTATION_SPEC §2 (Story tab)
- Blocked by: Issue #1 (timeline schema)
- Blocks: Recent Hangar Activity union query (Phase 4)

**4. Progressive-disclosure optional aircraft fields** (new issue, or consider deferring)
- Nickname, year, serial number, engine info, home airport (and possibly purchase date, ownership story per PRD §10)
- Editable via a follow-up flow after aircraft creation (not forced into onboarding)
- Reference: IMPLEMENTATION_SPEC §2 (Onboarding step 3), PRD §10
- Blocked by: nothing
- Blocks: aircraft profile completeness
- **Scope note:** This could be bundled with Issue #2 (aircraft profile) or deferred to later in the phase if time-boxed. Included in #13's AC but risk of scope creep if done as one large PR.

### Cross-Phase Dependency Note

**Recent Hangar Activity** on Home (IMPLEMENTATION_SPEC §2, item 4) requires a union of:
- Latest `timeline_entries` (Phase 2: Story)
- Latest `squawks` (Phase 3: Care)
- Latest `flights` (Phase 4: Fly)

Phase 2 can define the timeline slice of this query now and leave squawks/flights as TODO comments, coordinating schema with Phase 3/4 later. This avoids a circular dependency while preserving the cross-phase integration point.

---

## Sign-Off Summary

- **14/14 Phase 1 issues closed and merged to `develop`.** No open Phase 1 blockers.
- **All required schema, auth, onboarding, and nav shell complete.** Spec cross-check passes.
- **Two minor deviations (flight-images bucket, primary photo sequencing) well-documented and reasonable.** No scope creep.
- **RLS policies verified end-to-end.** No security gaps.
- **Phase 1 → main batch merge is a separate release event** (per merge policy), not a blocker for Phase 2 work on `develop`.

**Next step:** Product-owner should decompose issue #13 (Phase 2 — Story) into the issues listed above. Start Phase 2 immediately; no waiting for the Phase 1 batch merge to `main`.

---

## References

- `docs/IMPLEMENTATION_SPEC.md` — §1 (schema), §2 (screens), §5 (remaining choices)
- `docs/ADDENDUM.md` — §C (phase plan), §A (community/visibility), §B (flights entity)
- `docs/BRAND.md` — §17 (voice/copy), §10 (Home mock)
- `docs/PRD.md` — §10 (progressive disclosure), §13 (community MVP scope)
- GitHub issues: #1–#12, #18, #26 (closed); #13 (Phase 2 epic, open)
