# Digital Hangar
## Technical Design Document (TDD)

**Version:** 0.2
**Status:** MVP Architecture Definition
**Product:** Digital Hangar
**User Experience:** My Digital Hangar
**Platform:** iOS Mobile Application (MVP)
**Primary Framework:** React Native + Expo
**Backend:** Supabase
**Database:** PostgreSQL

> **Note:** Superseded in places by `ADDENDUM.md` (v0.2) and `IMPLEMENTATION_SPEC.md` (v1.0) — notably, this document does not include a Flights entity, which the addendum adds. Where they disagree, the addendum and implementation spec govern.

---

## 1. Overview

Digital Hangar is a mobile-first application that provides aircraft owners with a digital home for their airplane.

The MVP focuses on: aircraft identity, aircraft stories and memories, ownership history, maintenance experiences, squawk tracking, basic reminders, aircraft-type communities.

The architecture is designed to support: rapid MVP development, low operational cost, AI-assisted development, future platform expansion, long-term aircraft ownership history preservation.

The architecture intentionally avoids premature complexity while preserving future flexibility.

---

## 2. Architecture Principles

### 2.1 Optimize for Founder Velocity

The MVP architecture should enable a single developer to build quickly, iterate rapidly, maintain easily, minimize infrastructure overhead. Avoid unnecessary complexity.

The MVP should not introduce: microservices, Kubernetes, custom authentication systems, custom AI infrastructure, premature scalability patterns.

A modular monolith architecture is preferred.

### 2.2 Aircraft as the Primary Domain Object

The aircraft is the central object in Digital Hangar. The core relationship model is:

```
User
  ↓
Aircraft Membership
  ↓
Aircraft
  ↓
• Stories
• Maintenance
• Squawks
• Reminders
```

The aircraft identity exists independently from the user identity.

### 2.3 Identity Belongs to the Owner

Digital Hangar users may authenticate through different providers. The application should not couple aircraft ownership to: Apple ID, Google account, email address, specific device.

The relationship model should always be:

```
User
  ↓
Aircraft Membership
  ↓
Aircraft
```

This enables: future Android support, future web support, aircraft ownership transfer, multiple owners and caretakers, long-term aircraft lineage.

### 2.4 Design for Future Expansion

The MVP should support future capabilities without major refactoring: multiple aircraft per user, aircraft ownership history, FAA aircraft lookup, additional aircraft communities, AI-powered knowledge discovery, web application, Android application.

---

## 3. High-Level Architecture

Digital Hangar uses a mobile application architecture backed by Supabase services.

```
Mobile Application (React Native + Expo)
  ↓
Supabase Platform
  ↓
PostgreSQL Database / Storage / Authentication
  ↓
AI Services
```

---

## 4. Technology Stack

### 4.1 Mobile Application

**Technology:** React Native + Expo

**Reasons:** existing developer expertise, fast iteration, native device capabilities, camera integration, photo handling, push notifications, future Android compatibility.

### 4.2 Backend Platform

**Technology:** Supabase

Supabase provides: PostgreSQL database, authentication, storage, row-level security, APIs, Edge Functions (future).

Supabase is appropriate for MVP because it provides production-ready infrastructure without requiring significant backend operations.

---

## 5. Application Architecture

Recommended mobile project structure:

```
src/
  app/          — navigation, screens
  components/   — reusable UI components
  features/     — authentication, aircraft, timeline, squawks, reminders, community
  services/     — supabase integration, AI services
  hooks/
  models/
  utils/
```

---

## 6. Authentication Architecture

### 6.1 Authentication Philosophy

Digital Hangar should provide flexible identity options while keeping aircraft ownership independent from the authentication provider.

**MVP support:** Sign in with Apple, Sign in with Google.

**Future options:** email authentication, magic links, additional identity providers.

### 6.2 Supabase Auth

Supabase Auth manages: user authentication, OAuth flows, session management, secure token handling.

Digital Hangar does not store: passwords, OAuth credentials, provider secrets.

### 6.3 MVP Authentication Providers

**Sign in with Apple** — benefits: native iOS experience, strong privacy alignment, familiar user experience.

**Sign in with Google** — benefits: familiar authentication flow, broad user adoption, supports future Android and web expansion. Supabase Auth supports Google OAuth integration for native applications.

### 6.4 Authentication Flow

```
User opens app
  ↓
Select authentication provider
  ↓
Apple or Google OAuth flow
  ↓
Supabase Auth
  ↓
Create Digital Hangar user profile
  ↓
Create aircraft profile
```

---

## 7. Database Design

Entity Relationship Overview:

```
User
  ↓
Aircraft Membership
  ↓
Aircraft
  ↓
• Timeline Entries
• Squawks
• Reminders
```

---

## 8. Database Schema

> Field lists only — see `IMPLEMENTATION_SPEC.md` §1 for concrete types, constraints, indexes, and RLS policies.

### 8.1 Users Table

**Purpose:** stores application-level user information. Authentication identity is managed by Supabase Auth.

**Fields:** id, display_name, profile_photo_url, created_at, updated_at. The `id` maps to the Supabase Auth user ID.

### 8.2 Aircraft Table

**Purpose:** represents the aircraft itself.

**Fields:** id, registration, manufacturer, model, year, serial_number, nickname, engine_information, home_airport, primary_photo_url, visibility, created_at, updated_at.

**Visibility values:** Private, Community, Public.

### 8.3 Aircraft Membership Table

**Purpose:** separates users from aircraft ownership. This enables: ownership transfers, multiple owners, caretakers, historical ownership.

**Fields:** id, aircraft_id, user_id, relationship, verified, created_at.

**Relationship values:** Owner, Previous Owner, Caretaker.

### 8.4 Timeline Entries Table

**Purpose:** stores aircraft history.

**Fields:** id, aircraft_id, created_by, type, title, description, event_date, created_at, updated_at.

**Entry types:** Memory, Maintenance, Milestone.

### 8.5 Timeline Photos Table

**Purpose:** stores images associated with timeline entries.

**Fields:** id, timeline_entry_id, storage_path, created_at.

### 8.6 Squawks Table

**Purpose:** tracks aircraft issues.

**Fields:** id, aircraft_id, created_by, title, description, status, resolution, created_at, resolved_at, updated_at.

**Status values:** Open, Resolved.

### 8.7 Reminders Table

**Purpose:** stores ownership reminders.

**Fields:** id, aircraft_id, type, description, due_date, completed, created_at.

### 8.8 Communities Table

**Purpose:** represents aircraft-type communities.

**Fields:** id, manufacturer, model, name, created_at.

Example: Manufacturer — Piper; Model — PA-38; Community — "Piper PA-38 Owners."

---

## 9. Storage Architecture

Supabase Storage manages media assets.

**Storage buckets:** Aircraft Images, Timeline Images, Profile Images.

Example structure: `Aircraft Images → User ID → Aircraft ID → Image files`

---

## 10. API Architecture

The MVP should minimize custom backend development.

**Primary access pattern:**

```
React Native App
  ↓
Supabase Client SDK
  ↓
PostgreSQL Database
```

Custom services should only be introduced when needed — examples: AI processing, FAA lookup, notifications, external integrations.

---

## 11. AI Architecture

### 11.1 MVP Goal

Provide aircraft-specific assistance. Examples: "When was my last oil change?" / "Summarize my aircraft history." / "What issues have I tracked?"

### 11.2 MVP AI Architecture

```
User Question
  ↓
Retrieve aircraft context
  ↓
Relevant: timeline entries, maintenance records, squawks
  ↓
LLM Request
  ↓
Response
```

### 11.3 Initial AI Approach

Use structured retrieval. Do not initially introduce: vector databases, embedding pipelines, fine tuning, custom models.

---

## 12. Future AI Architecture

```
Aircraft Data
  ↓
Embedding Pipeline
  ↓
Vector Database
  ↓
Semantic Search
  ↓
Aircraft Knowledge Assistant
```

Potential capabilities: similar aircraft issue discovery, maintenance trend analysis, community knowledge summaries, aircraft history generation.

---

## 13. Security Design

**Authentication Security** — handled by Supabase Auth, Apple OAuth, Google OAuth.

**Authorization** — implemented using PostgreSQL Row Level Security, aircraft visibility rules, membership relationships.

**Security Principles** — users should only access: their private aircraft, aircraft shared with their community, public aircraft profiles.

---

## 14. Privacy Design

Digital Hangar should minimize unnecessary data collection.

**Potential sensitive information:** aircraft location, ownership details, maintenance documentation, personal contact information.

**Users control:** aircraft visibility, story visibility, community participation.

---

## 15. Future FAA Integration

The architecture should support future aircraft lookup.

**Future workflow:**

```
User enters N-number
  ↓
FAA Registry Lookup
  ↓
Populate aircraft data
  ↓
User confirms aircraft ownership
```

**MVP approach:** aircraft information is entered manually by the user. **Future enhancement:** automatic aircraft data retrieval through FAA registry integration.

---

## 16. Future Multi-Aircraft Support

The MVP database already supports multiple aircraft per user. Example: My Digital Hangar — Piper PA-38, Cessna 150, RV-7. No schema redesign is required.

---

## 17. Future Aircraft Lineage

Long-term vision: aircraft history follows the aircraft. Example: N123AZ — 1980 Original Owner, 2005 Second Owner, 2026 Digital Hangar Owner. This capability is enabled by the Aircraft entity and Aircraft Membership History.

---

## 18. Development Practices

**Source Control:** repository — `digital-hangar-mobile`.

**Branching Strategy:** main, develop, feature branches.

**Environment Separation:** Development, Beta, Production.

---

## 19. Testing Strategy

**Functional Testing** — critical flows: user registration, authentication, aircraft creation, photo upload, timeline creation, squawk creation, reminder management.

**Security Testing** — validate: users cannot access private aircraft, visibility rules work correctly, storage permissions are correct, OAuth flows work correctly.

---

## 20. Deployment Strategy

**iOS Distribution** — Development: local builds. Beta: TestFlight. Production: Apple App Store.

**Backend:** Supabase managed infrastructure.

---

## 21. Operational Monitoring

**Track:** application crashes, authentication failures, API errors, storage failures.

**Analytics should focus on product value:** aircraft created, stories added, squawks resolved, returning owners.

Avoid unnecessary user tracking.

---

## 22. Future Extensions

Potential future capabilities: Android application, web application, FAA integration, flight tracking, weather integration, maintenance shop collaboration, aircraft valuation history, AI knowledge graph, ownership transfer workflows.

---

## 23. Architecture North Star

The Digital Hangar architecture should enable a future where every aircraft has a digital identity, a preserved history, and a growing body of shared owner knowledge.

The MVP architecture should remain simple enough for one developer to build and maintain while preserving the foundation for a much larger aviation ownership platform.
