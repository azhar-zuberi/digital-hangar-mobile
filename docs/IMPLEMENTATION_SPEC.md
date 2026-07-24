# Digital Hangar
## Implementation Specification

**Version:** 1.0
**Status:** For founder sign-off, pre-Phase 1
**Builds on:** PRD v0.1, TDD v0.2, Brand & Design Direction v1.0, Architecture Addendum v0.2

**Purpose:** The TDD is correct at the principles/schema-skeleton level but stops short of implementation-ready. This document goes one layer deeper — concrete database schema (types, constraints, RLS), a screen/flow inventory, design tokens, and the handful of technical choices the TDD left open — so Phase 1 starts from a settled spec, not improvisation.

---

## 1. Database Schema

All tables live in the `public` schema, Supabase-managed Postgres. `auth.users` (Supabase Auth) is the source of identity; `public.users` is the app-level profile row, per TDD §2.3 (identity independent of auth provider).

Two visibility models apply, and they differ by design:

- **Story-like content** (aircraft profile, Timeline Entries, Flights) inherits the aircraft's `visibility` setting (Private / Community / Public). This is content the owner may want to show off.
- **Care-like content** (Squawks, Reminders) is **always member-only**, regardless of the aircraft's visibility. Open squawks and reminders are operational, not for display — a Public aircraft profile shouldn't leak "known issues" to strangers. This wasn't explicit in the TDD; flagging it here as a decision, not an assumption.

### 1.1 `users`

```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  profile_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS: a user can select/update their own row. Other users' `display_name`/`profile_photo_url` are exposed only through a restricted view (`public_profiles`) used when rendering community member lists — never the full row.

### 1.2 `aircraft`

```sql
create table public.aircraft (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,        -- tail number, e.g. N123AZ
  manufacturer text not null,
  model text not null,
  year integer,
  serial_number text,
  nickname text,
  engine_information text,
  home_airport text,
  primary_photo_url text,
  visibility text not null default 'community'
    check (visibility in ('private','community','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index aircraft_manufacturer_model_idx on public.aircraft (manufacturer, model);
```

Default visibility is **`community`**, per Addendum v0.2 Section A — this is what makes "automatic membership, no additional setup" (PRD §13) actually true.

RLS (conceptual — implemented via a `can_view_aircraft(aircraft_id)` policy function):
- **Select:** visible if `visibility = 'public'`, or `visibility = 'community'` AND the viewer owns an aircraft of the same manufacturer/model (community member) or is a member of this aircraft, or `visibility = 'private'` AND the viewer is a member.
- **Insert:** any authenticated user (creates the aircraft row and, in the same transaction, an `owner` membership row for the creator).
- **Update:** only members with `relationship = 'owner'` and `verified = true`.
- **Delete:** disallowed at the API layer for MVP; ownership issues are handled through membership changes, not deletion.

### 1.3 `aircraft_memberships`

```sql
create table public.aircraft_memberships (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  relationship text not null
    check (relationship in ('owner','previous_owner','caretaker')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (aircraft_id, user_id)
);
```

The user who creates an aircraft gets `relationship = 'owner'`, `verified = true` automatically. Verification for anyone added later (co-owner, caretaker) is a manual, in-app confirmation step by an existing verified owner — there's no external identity check in MVP (no FAA registry cross-reference yet; that's the future integration in TDD §15).

RLS: select limited to the row owner (`user_id = auth.uid()`) or other members of the same aircraft (so co-owners/caretakers are visible to each other, not to the public). Insert restricted to verified owners adding new members, or the self-insert that happens at aircraft creation.

### 1.4 `timeline_entries`

```sql
create table public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  created_by uuid not null references public.users(id),
  type text not null check (type in ('memory','maintenance','milestone')),
  title text not null,
  description text,
  event_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index timeline_entries_aircraft_idx on public.timeline_entries (aircraft_id, event_date desc);
```

Note: `type = 'maintenance'` entries live in this same table (per TDD §8.4) but are surfaced in the **Care** tab, not Story — see §2 Screen Inventory. This is a query-level split, not a schema split: Story queries `type in ('memory','milestone')`, Care queries `type = 'maintenance'`. No schema change needed, just documenting the intent so it isn't re-litigated during implementation.

RLS: select follows the parent aircraft's visibility rule. Insert/update/delete restricted to aircraft members.

### 1.5 `timeline_photos`

```sql
create table public.timeline_photos (
  id uuid primary key default gen_random_uuid(),
  timeline_entry_id uuid not null references public.timeline_entries(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
```

RLS: inherits from the parent `timeline_entries` row via join.

### 1.6 `squawks`

```sql
create table public.squawks (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  created_by uuid not null references public.users(id),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);
```

RLS: member-only for select/insert/update, always — independent of `aircraft.visibility`.

### 1.7 `reminders`

```sql
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  type text not null,   -- e.g. 'annual_inspection','oil_change','insurance_renewal','registration_renewal','other'
  description text,
  due_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index reminders_due_idx on public.reminders (due_date) where completed = false;
```

RLS: member-only, always.

### 1.8 `communities`

```sql
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null,
  model text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (manufacturer, model)
);
```

Populated automatically: a trigger on `aircraft` insert upserts a `communities` row for the manufacturer/model if one doesn't exist yet (e.g., first Piper PA-38 owner auto-creates "Piper PA-38 Owners"). No manual admin step required. RLS: readable by any authenticated user; no direct client writes.

### 1.9 `flights` *(new — not in TDD v0.2, added per Addendum v0.2 Section B)*

```sql
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  aircraft_id uuid not null references public.aircraft(id) on delete cascade,
  created_by uuid not null references public.users(id),
  flight_date date not null,
  duration_hours numeric(4,1) not null check (duration_hours > 0),
  departure_airport text,
  arrival_airport text,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flights_aircraft_idx on public.flights (aircraft_id, flight_date desc);
```

RLS: select follows aircraft `visibility`, same as Story content — a flight to a favorite destination is something an owner would want to show off, consistent with Fly as the "adventure layer." Insert/update restricted to members.

### 1.10 `flight_photos`

```sql
create table public.flight_photos (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
```

### 1.11 `aircraft_flight_stats` (view)

Backs the home screen "Ownership Snapshot" (Brand doc §10 — hours, flights, airports visited). Computed, not cached, per the TDD's "avoid premature complexity" principle:

```sql
create view public.aircraft_flight_stats as
select
  f.aircraft_id,
  count(*) as flight_count,
  coalesce(sum(f.duration_hours), 0) as total_hours,
  (
    select count(distinct airport) from (
      select departure_airport as airport from public.flights x
        where x.aircraft_id = f.aircraft_id and departure_airport is not null
      union
      select arrival_airport as airport from public.flights y
        where y.aircraft_id = f.aircraft_id and arrival_airport is not null
    ) a
  ) as airports_visited
from public.flights f
group by f.aircraft_id;
```

---

## 2. Screen & Flow Inventory

### Onboarding
1. Launch → Sign in with Apple / Google (Supabase Auth).
2. New user, no aircraft yet → choice screen: **Add My Aircraft** or **Find an Aircraft**.
3. Add My Aircraft: required fields only up front (registration, manufacturer, model, primary photo) — optional fields (nickname, year, serial number, engine info, home airport, purchase date, ownership story) are progressively disclosed after creation, not forced into the first form. This matches PRD §10 and the "progressive disclosure" design principle.
4. On submit: creates `aircraft` row (visibility defaults to `community`) + `owner` membership row → lands on Home.
5. Find an Aircraft: search by registration (tail number) → view an existing aircraft's Community/Public profile → request to join as caretaker (future) or just browse.

Empty state copy (per Brand doc §17 voice guidance): "This is where your airplane lives." / "Your first flight together is waiting."

### Home ("My Digital Hangar")
Defaults to the last-used aircraft (Brand doc §8 — no asset picker on open). Structure per Brand doc §10:
1. Hero aircraft photo (full-bleed).
2. Identity block below the image: tail number, make/model, nickname.
3. Ownership Snapshot: pulls from `aircraft_flight_stats` (hours, flights, airports visited).
4. Recent Hangar Activity: union of latest `timeline_entries`, `squawks`, `flights` — most recent 3–5 items.
5. If user owns multiple aircraft: a lightweight hangar switcher (not a prominent nav element — this stays secondary per "aircraft first," not a fleet-management picker).

### Story tab
List of `timeline_entries` where `type in ('memory','milestone')`, reverse chronological, grouped by year. Tap → entry detail (title, description, date, photos). Add flow: type picker (Memory / Milestone), title, description, date, photos.

### Care tab
Three sections on one screen, each independently addable:
- **Maintenance History** — `timeline_entries` where `type = 'maintenance'` (same table as Story, filtered differently — see §1.4 note).
- **Squawks** — open/resolved list; detail view has a status toggle and resolution note field.
- **Reminders** — upcoming (sorted by `due_date`) and completed; due-soon items get a badge.

Add flows: add maintenance story (same form shape as Story's add-entry, different type), log a squawk (title, description), set a reminder (type, description, due date).

### Fly tab
List of `flights`, reverse chronological, with the aggregate stats header repeated (or linked from Home). Add flow: date, duration, departure/arrival airports, optional title/notes, photos. Detail view shows route and notes.

### Community
Reachable from the aircraft profile or a dedicated tab — TBD placement, but functionally: a screen per manufacturer/model (e.g., "Piper PA-38 Tomahawk Owners") listing other Community/Public-visible aircraft of that type as cards (photo, tail number, nickname). Tap → that aircraft's Community/Public-visible Story (read-only, no interaction — comments/discussion are explicitly deferred per Addendum v0.2). Cold-start empty state: "You're among the first Piper PA-38 Tomahawk owners here" rather than a bare empty list.

### Profile / Settings
Display name, profile photo, sign out, notification preferences, aircraft visibility toggle (Private/Community/Public) per aircraft, manage additional aircraft (add another).

---

## 3. Design Tokens

Proposed starting values — flag these for visual design validation before locking, but concrete enough to build against rather than leaving "warm ivory" and "brass" undefined.

**Color**
| Token | Hex | Use |
|---|---|---|
| `ivory` | `#FAF6EE` | Primary background |
| `graphite` | `#26272B` | Primary text |
| `graphite-60` | `#26272B` @ 60% opacity | Secondary text |
| `brass` | `#A8813F` | Accents, milestones, highlights |
| `aluminum` | `#D4D6D9` | Dividers, subtle UI, disabled states |

**Typography** (SF Pro, iOS system font)
| Token | Size / Weight | Use |
|---|---|---|
| Hero | 34pt / Bold | Tail number on home screen |
| Title 1 | 28pt / Semibold | Screen titles |
| Title 2 | 22pt / Semibold | Section headers |
| Body | 17pt / Regular | Primary content |
| Caption | 13–15pt / Regular, `graphite-60` | Secondary/meta text |

**Spacing** — 4pt base unit: 4, 8, 12, 16, 24, 32, 48, 64.

**Corner radii** — 8pt (buttons/inputs), 12pt (cards), 20pt (hero image container).

**Elevation** — minimal, soft, low-opacity shadows on the hero card only; avoid heavy drop shadows elsewhere (calm/minimal principle).

**Hero image treatment** — full-bleed, 4:3 landscape, rounded top corners; identity text placed *below* the image (not overlaid), matching the Brand doc §10 mock exactly. Photography direction per Brand doc §11: owner-provided, full aircraft, real environments — never white-background renders or stock photography.

**Iconography** — SF Symbols, for native feel and zero maintenance overhead.

**Motion** — subtle, 200–250ms ease transitions; crossfade for photo transitions, no bounce or playful animation (calm principle).

---

## 4. Remaining Implementation Choices

**AI provider** — Claude API (Haiku-tier for cost, upgradeable to Sonnet if retrieval quality needs it) for the aircraft-scoped assistant described in TDD §11. Structured retrieval: pull the aircraft's recent `timeline_entries`, `squawks`, `reminders`, `flights` as context, no vector database for MVP (per TDD §11.3).

**Rate limiting (added — not in original scope)** — no document before this addition specified a per-user cap on assistant queries. Before Phase 6 ships, add one (e.g., a daily query cap per aircraft, enforced in the Edge Function before it calls the Claude API) — without it, a single owner can run up unbounded API cost with no product benefit. This should become an explicit acceptance criterion on whichever issue implements the assistant, not an afterthought.

**Push notifications** — `expo-notifications` for delivery. A Supabase Edge Function on a scheduled trigger (Supabase Cron) checks `reminders` for upcoming `due_date` values daily and sends via the Expo Push API. This closes the gap in TDD §8.7 — nothing previously triggered reminder delivery.

**State management / data fetching** — TanStack Query (React Query) paired with the Supabase client for all server state (aircraft, timeline, squawks, flights); local UI state via React state/Context. No Redux — consistent with the TDD's "avoid unnecessary complexity" principle (§2.1).

**Image pipeline** — client-side resize/compress before upload (`expo-image-manipulator`, max 2048px long edge, ~80% JPEG quality). Display-size variants come from Supabase Storage's on-the-fly image transformation rather than pre-generating thumbnails server-side — avoids building a thumbnailing pipeline for MVP.

**CI/CD** — EAS Build + EAS Submit for iOS builds and TestFlight delivery; EAS Update for OTA JS updates between store releases; GitHub Actions triggers EAS builds on merges to `main`/`develop`, consistent with the branching strategy already in TDD §18.

---

## 5. What This Doesn't Cover

This spec settles data model, screen inventory, and design tokens — enough to start building with confidence. It does not include final visual mockups (the tokens above are a starting point for a designer, not a replacement for one), copy for every screen (Brand doc §17 gives the voice, not a full copy deck), or the ownership-transfer/multi-owner UI flow (schema supports it per TDD §2.4, but the interaction design is out of scope for Phase 1).

---

*Once this is confirmed, Phase 1 (Foundations) starts: auth, project scaffold, and the schema above as Supabase migrations.*
