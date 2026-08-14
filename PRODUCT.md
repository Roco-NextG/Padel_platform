# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js + TypeScript (App Router), single monorepo containing frontend and backend (API routes / route handlers) — confirmed in `docs/09_TECHNICAL_ARCHITECTURE.md` §1, applying the "modular monolith, no microservicios prematuros" principle to deployment too. PostgreSQL via Supabase (Postgres + Auth + Storage + Realtime), Supabase Auth mapped 1:1 to `auth.users`, RBAC via Postgres Row Level Security (not app-layer only, since Supabase exposes the DB directly). npm workspaces (matches the existing `packages/tournament-engine` npm lockfile). Domain logic (Tournament Engine, Rating Engine) lives in framework-free `domain/` folders per module, testable in isolation and portable to a future extracted service.

## Users

Four actors, two hardware contexts (`docs/01_ARCHITECTURE.md` §4, `docs/07_UX_UI_ARCHITECTURE.md` §5):

- **Player** (mobile, primary device) — permanent sporting identity independent of club. Opens the app shortly before a match to know where to go; also browses tournaments, rating, results.
- **Organizer** (tablet, in-situ during tournaments) — creates/manages tournaments across one or more clubs, runs the live bracket/schedule during the event.
- **Club** (desktop) — Owner/Manager roles operate the club: courts, branding, staff, hosted tournaments.
- **Admin** (desktop) — Super Admin / Admin: platform-wide audit, dispute resolution, global management.

## Product Purpose

A SaaS platform for competitive/amateur padel: organizers run real tournaments start-to-finish inside the product (no Excel/WhatsApp for the bracket), and every confirmed match produces an individual, auditable rating event. Launching in Venezuela, architected for later international expansion. North Star Metric: `Verified Matches Played` (`docs/08_MVP_SCOPE.md` §1).

## Positioning

The defensible asset is not the UI or the bracket generator (both copyable) — it's **data + network + rating**: player identities, match history, and individual ratings connected across clubs and tournaments (`docs/01_ARCHITECTURE.md` §1). Three core engines: Tournament Engine (groups/seeding/brackets/scheduling), Match Engine (result registration/confirmation), Padel Rating Engine (Glicko-2 adapted, individual rating with a partner-effect adjustment baked in from day one, not deferred — `docs/05_RATING_ENGINE.md`).

## Operating Context

Two loops the product must sustain (`docs/01_ARCHITECTURE.md` §3):
- Player loop: discover tournament → play → register result → rating updates → view stats → find rivals → create a match → play again.
- Organizer/club loop: create tournament → publish → attract players → run it → register results → generate content → generate data → retain players → run another tournament.

Every played tournament feeds both loops simultaneously (the network effect the business depends on). Organizers are the primary acquisition wedge, not clubs directly (`docs/10_ROADMAP.md` §4) — one organizer brings multiple tournaments, multiple clubs, hundreds of players.

## Capabilities and Constraints

Non-negotiable architectural principles (`docs/01_ARCHITECTURE.md` §6), all binding on this build:

1. `Player` is a permanent identity, never duplicated across clubs/tournaments.
2. `Team` is a temporary competitive entity, not an identity — no persisted "pair" table; "usual partners" is a derived aggregate view over `team_members`, never stored.
3. `player.rating` is never written directly — every change goes through an immutable `RatingEvent`; current rating is a projection.
4. AUTO + MANUAL always coexist in the Tournament Engine: the system proposes (groups, seeding, bracket), the organizer confirms or drag-and-drop adjusts. No irreversible action skips human review.
5. Internationalizable from day one at the data/config level (country, currency, timezone, language), even though the only active locale in MVP is Venezuela/es/VES.
6. Financial/regulatory domain (Coins, Payments, Subscriptions) is modeled now, exposed later (v2/v3) — avoids destructive migrations.
7. Mandatory audit trail on results, ranking, bracket, payments, and player data — sporting history is never deleted without traceability.

MVP scope (`docs/08_MVP_SCOPE.md`): Auth + roles, Club (create, basic branding), Player (profile CRUD, public/private), Organizer (independent entity, multi-club), Tournament lifecycle, Tournament Engine, Match registration/confirmation, Rating with partner effect from day one, read-only Discovery, basic Content composer, minimal Admin panel. Explicitly out of MVP: matches outside tournaments, push/WhatsApp/SMS notifications, payments/coins/subscriptions, premium player tier, AI/matchmaking/marketplace/white-label.

Roles (RBAC, enforced at the Postgres RLS layer, not just app layer): `SUPER_ADMIN, ADMIN, CLUB_OWNER, CLUB_MANAGER, ORGANIZER, TOURNAMENT_STAFF, PLAYER`. `User` and `Player` are intentionally separate tables so a `User` can eventually manage multiple `Player` profiles (e.g. a parent managing a child's profile) without remodeling.

Database schema and RLS policies are finalized and present at `supabase/migrations/0001_schema.sql` and `0002_rls.sql` — this is authoritative, not to be redesigned during build.

Open/undecided per the docs themselves: exact numeric weighting of the rating partner-effect formula (calibrated later with real pilot data, `docs/05_RATING_ENGINE.md` §5); whether a private-profile player's result still appears in a public tournament bracket (`docs/02_DOMAIN_MODEL.md` §5, doc recommends yes but flags it as founder-pending); tiebreak rule editability (fixed order in MVP, not user-configurable).

## Brand Commitments

No confirmed logo, name-beyond-working-title ("Padel Platform"), color palette, or typography exists yet — `docs/07_UX_UI_ARCHITECTURE.md` sets visual *principles*, not a visual world: premium, visual-first, modern, fast, minimalist, intuitive; deliberately avoid long forms, dense tables, "old management software" UI, complex menus. Central rule: the most important information is shown visually, not as text rows (see doc §1 example). Each club gets its own branding (logo, primary/secondary/accent color, font) via design tokens, never screen-hardcoded styles, with mandatory automatic WCAG AA contrast validation on save — the club's palette can never compromise legibility.

## Evidence on Hand

- `packages/tournament-engine/` — working, tested (27 tests) pure-domain implementation of groups/standings/seeding/bracket-with-byes. Authoritative reference for how domain modules in this codebase are structured (framework-free, barrel-exported, vitest).
- `docs/01_ARCHITECTURE.md` through `docs/10_ROADMAP.md` — full discovery-phase specification, founder-approved decisions embedded throughout (marked "decisión confirmada").
- `supabase/migrations/0001_schema.sql`, `0002_rls.sql` — real DDL + RLS + RBAC helper functions + RPC pattern example, adapted from the schema doc to actual Supabase conventions.
- No real screenshots, user research, testimonials, pilot-tournament data, or brand assets exist yet. Future work must not fabricate any of these.

## Product Principles

1. **Propose, never decide silently.** Anywhere the system automates something a human used to control (grouping, seeding, brackets), the automation is a reversible, editable proposal until explicitly confirmed.
2. **One identity, temporary competition units.** Players persist; teams, groups, and brackets are scoped to a single tournament's lifetime.
3. **The database enforces the permission model, not just the UI.** RLS policies are the source of truth for who can read/write what, because Supabase exposes Postgres directly.
4. **Show state, not fields.** The interface leads with what matters right now (next match, live status) over verbose data rows or settings-style forms.
5. **No feature ships without an audit trail if it touches results, rating, bracket, or player data.**

## Accessibility & Inclusion

WCAG AA contrast is a hard requirement specifically for club-branding colors (validated automatically at save time, per `docs/07_UX_UI_ARCHITECTURE.md` §4) and, by extension, for the rest of the UI. No platform-specific accessibility research beyond what the docs state.
