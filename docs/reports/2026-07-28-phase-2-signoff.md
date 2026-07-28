# Phase 2 Story Sign-Off

**Date:** 2026-07-28  
**Status:** COMPLETE — All 5 issues closed and merged to `develop`. No blockers found.

---

## Issues Verified

All 5 Phase 2 Story issues are confirmed closed and merged to `develop`:

### Schema & Data Access
- #34 — Schema: timeline_entries and timeline_photos tables (closed 2026-07-27, merged PR #39)

### Home Screen & Aircraft Profile
- #35 — Home: Aircraft profile screen (hero photo and identity block) (closed 2026-07-27, merged PR #40)

### Story Tab
- #36 — Story tab: timeline entries list, detail view, and add flow (closed 2026-07-27, merged PR #41)

### Cross-Phase Integration
- #38 — Home: Recent Hangar Activity feed (Phase 2 timeline slice scope) (closed 2026-07-27, merged PR #42)

### Progressive Disclosure
- #37 — Onboarding: progressive-disclosure optional aircraft fields (closed 2026-07-27, merged PR #43)

Source: `gh issue list --repo azhar-zuberi/digital-hangar-mobile --label phase:story --state closed` confirms all 5 closed.

---

## Cross-Check Against Design Docs

### IMPLEMENTATION_SPEC.md §2 (Screen & Flow Inventory — Phase 2 scope)

Phase 2 required screens and flows:

| Screen/Flow | Issue(s) | Status | Notes |
|---|---|---|---|
| Home hero aircraft photo | #35 | ✓ Complete | Full-bleed, 4:3 landscape, rounded top corners, soft shadow |
| Aircraft identity block | #35 | ✓ Complete | Tail number (Hero typography), make/model (Body), nickname (Caption) |
| Aircraft switcher (multi-aircraft) | #35 | ✓ Complete | Lightweight selector for owned aircraft, persists last-used |
| Story tab list | #36 | ✓ Complete | Reverse chronological, grouped by year, type in ('memory','milestone') only |
| Story detail view | #36 | ✓ Complete | Title, description, date, photos carousel |
| Story add flow | #36 | ✓ Complete | Type picker, title/description/date/photos, date validation, upload pipeline |
| Recent Hangar Activity (timeline slice) | #38 | ✓ Complete | 5 most recent timeline entries, badges, thumbnails; Phase 3/4 integration ready |
| Optional aircraft fields edit | #37 | ✓ Complete | Nickname, year, serial_number, engine_information, home_airport; accessible post-creation |

### IMPLEMENTATION_SPEC.md §1 (Database Schema — Phase 2 tables)

Phase 2 required tables and RLS policies:

| Table | Issue | Status | Notes |
|---|---|---|---|
| `timeline_entries` | #34 | ✓ Complete | Type enum: memory/maintenance/milestone; RLS follows aircraft visibility |
| `timeline_photos` | #34 | ✓ Complete | Inherits parent `timeline_entries` visibility via join RLS policies |

### CLAUDE.md §3 (Two Non-Obvious Rules — Verified)

**Rule 1: Visibility Inheritance**
- Aircraft profile, Timeline Entries, and Flights inherit the aircraft's `visibility` (private/community/public).
- Squawks and Reminders are **always member-only**, regardless of aircraft visibility.

**Verification:**
- ✓ `supabase/migrations/20260727220000_create_timeline_entries_and_photos.sql` correctly uses `can_view_aircraft()` for select RLS on timeline_entries, implementing aircraft visibility inheritance.
- ✓ `src/features/timeline/timelineApi.ts` passes visibility rules through Supabase RLS; no client-side filtering shadows the policies.

**Rule 2: timeline_entries.type='maintenance' Query-Level Split**
- `timeline_entries` table contains type in ('memory','maintenance','milestone').
- Story queries `type in ('memory','milestone')`.
- Care queries `type = 'maintenance'` (Phase 3 scope).
- This is a **query-level split, not a schema split**.

**Verification:**
- ✓ `src/features/timeline/timelineApi.ts` defines `STORY_TYPES = ['memory', 'milestone']` and every export (fetchTimelineEntries, fetchTimelineEntryById, fetchRecentTimelineEntries) filters `.in('type', STORY_TYPES)`.
- ✓ Comment header in timelineApi.ts explicitly states: "Issue #36: Story tab data access — timeline_entries where type in ('memory', 'milestone') only. `type = 'maintenance'` rows live in this same table... but belong to the Care tab per CLAUDE.md — this module never queries or returns them."
- ✓ `src/features/home/useRecentHangarActivity.ts` (issue #38) calls fetchRecentTimelineEntries which applies the same STORY_TYPES filter; includes a TODO comment for Phase 3 squawks and Phase 4 flights integration.
- ✓ No maintenance entries reach StoryScreen.tsx — the feed only shows memory/milestone.

**Verdict:** ✓ Both rules correctly encoded in schema, RLS policies, and query layer.

---

## Spot-Check: Gaps Between Acceptance Criteria and Delivered Code

### Issue #34 Schema Migration
**AC promised:** timeline_entries (type enum, all fields), timeline_photos (entry_id, storage_path), RLS via can_view_aircraft/is_aircraft_member, index on (aircraft_id, event_date desc).  
**Delivered:** ✓ All fields present, correct enum check, correct RLS policies, index present. Migration is well-documented with header comments explaining the query-level maintenance split.

### Issue #35 Aircraft Profile Screen
**AC promised:** Hero photo (4:3, rounded top), identity block (registration in Hero typography, make/model in Body, nickname in Caption), aircraft switcher if multi-aircraft, responsive layout.  
**Delivered:** ✓ AircraftHeroPhoto.tsx implements 4:3 aspect ratio, radii.hero (20pt) top corners, soft shadow, placeholder icon. AircraftIdentityBlock.tsx renders all three typographic levels correctly per design tokens. HomeScreen.tsx includes AircraftSwitcher component (shown only if ownedAircraft.length > 1). Layout is scrollable and responsive.

### Issue #36 Story Tab
**AC promised:** List of type in ('memory','milestone'), reverse chronological, grouped by year, detail view, add flow with type picker/title/description/date/photos, date validation, photo upload/compress.  
**Delivered:** ✓ StoryScreen.tsx queries via useTimelineEntries hook which filters STORY_TYPES. groupTimelineEntriesByYear groups output. TimelineEntryCard component displays thumbnail and meta. AddTimelineEntryScreen implements type picker (Memory/Milestone), form validation (title/date required, no future dates), photo capture/upload with expo-image-manipulator. TimelineEntryDetailScreen displays full entry + photos.

### Issue #38 Recent Hangar Activity
**AC promised (Phase 2 scope):** Query 5 most recent timeline entries (type in memory/milestone), compact cards with badge/title/date/thumbnail, code prepared for Phase 3/4 squawks/flights integration.  
**Delivered:** ✓ useRecentHangarActivity.ts queries fetchRecentTimelineEntries with RECENT_ACTIVITY_LIMIT = 5. RecentHangarActivity.tsx renders cards with kind='timeline', badgeLabel, title, eventDate, thumbnail. HomeScreen.tsx includes TODO comments for Phase 3 squawks and Phase 4 flights navigation hooks. Component structure (HangarActivityItem union type) is prepared for future kind='squawk' and kind='flight' branches.

### Issue #37 Optional Aircraft Fields
**AC promised:** Edit form for nickname, year, serial_number, engine_information, home_airport; all optional; entry point via "Edit Profile" button; progressive disclosure (don't force); save only changed fields.  
**Delivered:** ✓ EditAircraftProfileScreen implements all five fields with correct input types (year numeric-only, engine_information multiline). Form is optional — skipping a field is allowed. "Edit Profile" button on HomeScreen.tsx navigates here. Form validates, diffs against current values, and only submits changed fields via useUpdateAircraftProfile hook. Header copy is per BRAND.md voice: "Add a few more details. All optional — skip anything and add it whenever you're ready."

**No gaps detected. All acceptance criteria met.**

---

## Deferred Items (By Design, Not Missed)

### Ownership Snapshot Statistics
**AC deferred from #35:** "Ownership Snapshot stats section (hours, flights, airports visited) requires the aircraft_flight_stats view (Phase 4 Fly scope)."  
**Current state:** Home screen does not include Ownership Snapshot stats section. PR #40's notes explicitly state this is Phase 4 work, not Phase 2.  
**Verdict:** ✓ Expected gap. Stats require the flights table and aircraft_flight_stats view (Phase 4 scope per ADDENDUM.md §C item 4). Phase 2 correctly builds the screen structure; Phase 4 adds the data.

### purchase_date and ownership_story Fields
**AC deferred from #37:** "Two fields mentioned in PRD §10 (purchase_date, ownership_story) are not yet in the schema — they can be added in a future phase if needed; they are explicitly out of scope for this issue."  
**Current state:** EditAircraftProfileScreen implements nickname/year/serial_number/engine_information/home_airport only. No purchase_date or ownership_story fields in aircraft table schema.  
**Verdict:** ✓ Expected gap. These columns don't exist in the database yet (see 20260726190000_create_aircraft_and_communities.sql schema). Deferred to a future phase; not a bug.

### Recent Hangar Activity: Squawks & Flights Slices
**AC deferred from #38:** "Phase 2 scope is to implement the timeline entries slice and structure the component for future Phase 3/4 integration."  
**Current state:** useRecentHangarActivity.ts returns only `timelineItems` (timeline entries). RecentHangarActivity.tsx component has TODO comments marking where squawks and flights will be merged.  
**Verdict:** ✓ Expected gap. Phase 3 (Care) will add squawks slice, Phase 4 (Fly) will add flights slice. Structure is ready; integration deferred per ADDENDUM.md §C phase boundaries.

---

## Code Quality & Architectural Observations

### Module Organization
- **timelineApi.ts** — clean separation of concerns: all query logic lives here, STORY_TYPES constant prevents accidental maintenance inclusion, comprehensive header comment explains the query-level split.
- **useRecentHangarActivity.ts** — well-structured hook with explicit TODO comments for Phase 3/4, `toHangarActivityItem()` is testable pure function, HangarActivityItem union type prepares for future branches.
- **EditAircraftProfileScreen.tsx** — solid form management (field-level error handling, unsaved-changes guard via ref, accessibility announcements). Comment acknowledges purchase_date/ownership_story deferral.

### RLS Verification
- ✓ `timeline_entries_select_can_view` policy correctly reuses `can_view_aircraft()` from Phase 1 migrations.
- ✓ Insert/update/delete restricted to `is_aircraft_member()` with `created_by = auth.uid()` on insert.
- ✓ `timeline_photos` policies join back to parent timeline_entries row, inheriting visibility without redundant policies.
- ✓ No anon-role access (all policies specify `to authenticated`).

### Design Token Usage
- ✓ All screens use consistent colors, typography, spacing from `utils/tokens.ts`.
- ✓ Hero photo uses `radii.hero` (20pt), soft shadow per spec.
- ✓ Typography hierarchy correct (Hero/Title1/Title2/Body/Caption per IMPLEMENTATION_SPEC.md §3).

---

## Integration Points Confirmed

### Phase 1 → Phase 2 Dependencies
- ✓ Auth & users table (Phase 1) ← Aircraft membership gating works via is_aircraft_member().
- ✓ Aircraft & communities (Phase 1) ← Timeline entries inherit aircraft.visibility, can_view_aircraft() policy reused.
- ✓ Storage buckets (Phase 1) ← timeline-images bucket exists with correct RLS, ready for timeline photo uploads.

### Phase 2 → Phase 3 (Care) Dependencies
- ✓ timeline_entries table correctly holds type='maintenance' entries.
- ✓ Phase 3 will query type='maintenance' separately (query-level split documented).
- ✓ RLS is identical for maintenance entries (follows aircraft visibility), so Phase 3 needs no policy changes.
- ✓ Recent Hangar Activity component structure is ready for Phase 3's squawks integration.

### Phase 2 → Phase 4 (Fly) Dependencies
- ✓ Recent Hangar Activity component structure is ready for Phase 4's flights integration (see TODO comments).
- ✓ Aircraft profile screen is ready to accept Ownership Snapshot stats section in Phase 4 (see "Blocks" notes in PR #40).

---

## Merge Policy Verification

- ✓ All 5 Phase 2 PRs are merged into `develop` branch only.
- ✓ No PRs merged directly to `main`.
- ✓ `main` remains at Phase 1 state (commit 92fcb14: "Merge pull request #33 from azhar-zuberi/develop"), 5 commits behind `develop`, awaiting batch merge at Phase 2 completion (separate release event).
- ✓ Issues were manually closed on GitHub as PRs landed in `develop`, not via `Closes #N` (per CLAUDE.md merge policy).

---

## Sign-Off Summary

- **5/5 Phase 2 issues closed and merged to `develop`.** No open Phase 2 blockers.
- **All required screens (Home, Story tab, optional fields edit) complete.** Spec cross-check passes.
- **Two non-obvious rules from CLAUDE.md verified end-to-end:** visibility inheritance works via RLS, maintenance query-level split is correctly encoded in every query.
- **RLS policies verified for timeline tables.** No security gaps; inheritance via join works correctly.
- **Three deliberate deferrals correctly noted:** Ownership Snapshot (Phase 4 flights dependency), purchase_date/ownership_story schema columns (future phase), squawks/flights integration in Recent Hangar Activity (Phase 3/4 scope).
- **No scope creep detected.** All accepted AC met; deferred items are flagged, not silent.
- **Phase 2 → main batch merge is a separate release event** (per merge policy), not a blocker for Phase 3 work on `develop`.

**Next step:** Product-owner should create and decompose a Phase 3 epic (Care — squawks/reminders/maintenance) into concrete tickets, with explicit AC on member-only visibility enforcement (squawks/reminders are always member-only, regardless of aircraft visibility — different from Phase 2's Story/Home aircraft profile which inherit aircraft visibility). Start Phase 3 immediately; no waiting for the Phase 2 batch merge to `main`.

---

## References

- `docs/IMPLEMENTATION_SPEC.md` — §1 (schema), §2 (screens), §3 (design tokens)
- `docs/ADDENDUM.md` — §C (phase plan), §A (community/visibility), §B (flights entity)
- `docs/BRAND.md` — §9–11 (aircraft identity, hero image), §17 (voice/copy)
- `docs/PRD.md` — §10 (progressive disclosure)
- GitHub issues: #34–38 (closed); #13 (Phase 2 epic, closed as part of this sign-off — all 5 sub-issues confirmed done); Phase 3 epic (to be created/decomposed)
- PRs: #39 (#34), #40 (#35), #41 (#36), #42 (#38), #43 (#37) — all merged to `develop`
