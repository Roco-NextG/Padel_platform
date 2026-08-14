# Design

<!-- impeccable:design-schema 1 -->

## Mode

Operate (both surfaces). The player mobile surface leans slightly toward Persuade at the
edges (auth, the rating moment) but the app itself is a task tool, not a marketing page —
per `docs/07_UX_UI_ARCHITECTURE.md`, expression never obscures the task.

## Direction

Two surfaces, one system: **mobile-first for Player** (bottom nav, single column, thumb
reach), **desktop-first for Club/Organizer** (sidebar, dense dashboard). Both read from the
same tokens so a club's custom branding (logo/colors/font, stored in `clubs.branding`) can
be layered on top without forking the design system.

Color strategy: **Restrained** (Operate default) — warm near-black/near-white neutrals,
never pure `#000`/`#fff`, plus one saturated accent: **court blue** (`#2454e0` light /
`#5b83ec` dark), evoking the blue synthetic-turf courts used on the professional tour.
Deliberately not the generic AI-purple/gold SaaS default. The auth screen's brand panel is
the one place color strategy shifts toward Committed — fixed dark (`#121110`) regardless of
the app's light/dark setting, with radial court-blue glow, because it's the one moment this
product allows itself a statement before the user is inside a task.

## Typography

One family, two cuts — **Barlow** (400–700) for all UI: body, labels, buttons, data. **Barlow
Condensed** (500–700) reserved for the handful of "visual-first" hero numerals the product
spec calls out explicitly: the rating number, big time/court displays. This is the literal
mechanism behind `docs/07_UX_UI_ARCHITECTURE.md` §1's rule — "the most important information
is shown visually, not in rows of text" — condensed display type is the tool that makes a
number read as the point of the screen instead of a data field.

Scale is a fixed rem scale (Operate default, not fluid/clamp), tight ratio, body text 14–16px.

## Color tokens

CSS custom properties in `apps/web/src/app/globals.css`, remapped through Tailwind v4's
`@theme inline` block. Light and dark defined as two full palettes under `:root` /
`:root.dark`, switched via a class on `<html>` (`@custom-variant dark`), driven by
`ThemeProvider` (light / dark / system, persisted to `localStorage`, applied pre-hydration by
an inlined script to avoid flash).

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#fafaf9` | `#121110` | Page background |
| `surface` | `#ffffff` | `#1a1817` | Cards, inputs, panels |
| `surface-secondary` | `#f4f3f1` | `#211e1c` | Sidebar, secondary panels |
| `foreground` | `#1c1917` | `#f5f4f2` | Primary text |
| `muted-foreground` | `#57534e` | `#a8a29e` | Secondary text |
| `border` / `border-strong` | `#e7e5e4` / `#d6d3d1` | `#2e2b28` / `#3a3532` | Dividers, input borders |
| `accent` / `accent-foreground` / `accent-muted` | `#2454e0` / white / `#e8edfc` | `#5b83ec` / near-black / `#1c2540` | Primary actions, current state, links |
| `success` / `warning` / `destructive` (+ `-foreground`, `-muted`) | standard semantic greens/ambers/reds | — | Confirmed/pending/error states |

Club branding overrides `--color-accent` and related tokens at a scoped surface root once the
club's chosen colors pass `lib/color/contrast.ts` (WCAG AA, ≥3:1 large text) — enforced
automatically on save, per `docs/07_UX_UI_ARCHITECTURE.md` §4's hard rule.

## Shape & elevation

One radius scale, applied by role, not by whim: `radius-md` (12px) for buttons/inputs,
`radius-lg` (16px) for cards/panels, full-round for badges/pills/the emphasized bottom-nav
action. Elevation is declared once — border OR shadow, never both stacked on the same
element (no "ghost card").

## Components

- **`components/ui/`** — cross-cutting primitives: `Button`, `Input`/`Field`/`Label`,
  `Select`/`Textarea`, `Switch`, `ChoiceGroup` (pill radio group — used instead of native
  `<select>` for small enums like gender/hand/position, touch-friendly on mobile),
  `Badge`, `Alert`, `EmptyState`.
- **`modules/<name>/ui/`** — module-specific composition: forms (`LoginForm`,
  `SignUpForm`, `PlayerProfileForm`, `ClubBrandingForm`, `OrganizerForm`), the player
  `BottomNav` + `PlayerTopBar` + `RatingBadge`, the club `Sidebar`.

Every interactive element has default/hover/focus/active/disabled states; every data screen
has loading (Next.js Suspense boundaries via server components), empty (`EmptyState`,
content-specific copy, never "nothing here"), and error (`Alert`) states — no bare screens.

## Icons

Phosphor Icons exclusively, one stroke family, `weight="regular"` default /
`weight="fill"` for active/selected states. No emoji, no hand-rolled SVG.

## Motion

150ms transitions on interactive states (colors, transforms) via Tailwind's default
duration utilities. `:active` states scale to 0.98 for tactile feedback. No orchestrated
page-load sequences, no decorative motion — Operate mode: motion conveys state, not
personality. `prefers-reduced-motion` respected globally in `globals.css`.

## Layout

- **Player surface**: single column, `max-w-md`, fixed bottom nav (`env(safe-area-inset-bottom)`
  aware), content sections in strict priority order per `docs/07_UX_UI_ARCHITECTURE.md` §3.
- **Club/Organizer surface**: fixed 240px sidebar + fluid content area, top bar with
  session controls. Sidebar groups primary nav from settings (club/organizer identity).
- **Auth**: split-screen ≥1024px (fixed-dark brand panel + form), single column below —
  the one asymmetric-split composition in the product, reserved for the one surface where a
  visitor isn't in a task yet.

## First viewport (reference)

Login/register: brand panel (radial court-blue glow on near-black, "Datos. Red. Rating."
in Barlow Condensed) + centered form, theme toggle top-right. Player home: greeting, then
próximo partido → torneo actual → **rating** (the one big-numeral moment) → últimos
resultados → torneos cerca → partidas disponibles, each with an honest empty state until
Tournament/Match Engine ship. Club dashboard: LIVE status row with a pulsing indicator,
4-stat grid (currently zeroed, real once Match Engine lands), "para empezar" prompts when
club/organizer setup is incomplete.

## What's next (not yet built, don't assume it exists)

Tournament, Match, and Rating engines are unimplemented in the UI — every reference to them
in the current build is an intentional, honestly-labeled empty/"próximamente" state, not a
placeholder for missing polish. `packages/tournament-engine` has the pure domain logic
already; it has no UI or database wiring yet.
