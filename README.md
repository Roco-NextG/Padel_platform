# Padel Platform

Plataforma SaaS de pádel — Tournament, Ranking & Player Network.

## Estructura

```
docs/                         Documentación de Discovery (fase pre-código)
  01_ARCHITECTURE.md .. 10_ROADMAP.md

apps/
  web/                         Next.js 16 (App Router) — frontend + backend en el mismo monorepo
    src/
      app/
        (auth)/                /login, /registro — split-screen, brand panel fijo en dark
        (player)/               /, /perfil, /torneos, /ranking, /jugar — mobile-first, bottom nav
        (club)/                /dashboard, /dashboard/club, /dashboard/organizador, ... — desktop-first, sidebar
        proxy.ts                Next 16: reemplaza a middleware.ts — refresca sesión + gatea rutas
      modules/
        auth/       domain (roles, schemas) · application (actions, casos de uso) · infrastructure (Supabase)
        players/    idem — CRUD de perfil de jugador
        clubs/      idem — CRUD de club + branding (con validación de contraste WCAG AA)
        organizers/ idem — CRUD de organizador
        rating/     application (recordRatingEventsForMatch) · infrastructure (Supabase) — ver nota abajo
      lib/
        supabase/    client.ts (browser) · server.ts (RSC/actions) · session.ts (proxy helper) · database.types.ts
        color/       contrast.ts — validador WCAG AA para branding de club
      components/ui/ Primitivas compartidas (Button, Input, Switch, ChoiceGroup, Badge, Alert, EmptyState)

packages/
  tournament-engine/            Lógica pura: grupos, standings, seeding, bracket con byes.
                                 27 tests, ver packages/tournament-engine/README.md
  rating-engine/                Lógica pura: Glicko-2 adaptado + efecto compañero desde el día 1.
                                 22 tests, ver packages/rating-engine/README.md

supabase/
  migrations/
    0001_schema.sql             Schema completo (identidad, clubes, torneos, partidos, rating, auditoría)
    0002_rls.sql                RLS + helpers de RBAC + patrón RPC security definer
    0003_club_organizer_rpc.sql create_club / update_club_branding — ver nota abajo
    0004_rating_rpc.sql         record_rating_events — único punto de escritura de rating_events

PRODUCT.md                      Contexto de producto (usuarios, alcance, principios)
DESIGN.md                       Sistema de diseño construido (tokens, tipografía, componentes)
```

`packages/*` compilan a `dist/` (no está en git). `npm run dev` y `npm run build` en la raíz
ya lo hacen por ti; si corres algo dentro de `apps/web` directamente, compila los packages
primero (`npm run build -w packages/tournament-engine -w packages/rating-engine`).

## Stack

Next.js 16 + TypeScript (App Router, monorepo con npm workspaces) · Supabase (Postgres + Auth
+ Storage, RLS como capa de seguridad real, no solo la app) · Tailwind v4 · Barlow / Barlow
Condensed (`next/font`) · Phosphor Icons · Zod + React Hook Form pattern (Server Actions +
`useActionState`). Ver `docs/09_TECHNICAL_ARCHITECTURE.md` para el detalle completo y el
porqué de cada decisión.

## Levantar el proyecto

```bash
npm install
```

1. Crea un proyecto en [supabase.com](https://supabase.com) (o usa Supabase CLI local).
2. Corre las migraciones en orden: `0001_schema.sql`, `0002_rls.sql`,
   `0003_club_organizer_rpc.sql`, `0004_rating_rpc.sql` (SQL Editor del dashboard, o
   `supabase db push` con el CLI) — el orden importa, cada una depende de la anterior.
3. Copia `apps/web/.env.local.example` a `apps/web/.env.local` y completa con la URL y
   anon key de tu proyecto (Project Settings → API).
4. `npm run dev` (levanta `apps/web` en `http://localhost:3000`).

### Primer admin (bootstrap manual)

`user_roles` solo se puede escribir desde el rol `admin` de Postgres (RLS: `user_roles_write`
exige `is_admin()`). Nadie puede auto-otorgarse un rol desde la app — es intencional. Para
crear el primer `SUPER_ADMIN`, corre esto una vez en el SQL Editor de Supabase después de que
esa persona se haya registrado normalmente en `/registro`:

```sql
insert into public.user_roles (user_id, role)
values ('<auth.users.id de la cuenta>', 'SUPER_ADMIN');
```

Desde ahí, ese admin es quien le otorga `CLUB_OWNER` a los dueños de club (mismo patrón:
insert directo en `user_roles`, o desde un panel de Admin cuando se construya — fuera del
alcance de esta fase). Sin ese rol, `/dashboard/club` muestra el estado "necesitas que un
admin te otorgue el rol" en vez de un formulario roto.

## Nota sobre `0003_club_organizer_rpc.sql`

Las migraciones `0001`/`0002` ya venían completas y no se tocaron. Al construir el CRUD de
Club apareció un gap real: `clubs_insert` exige que el usuario ya tenga `CLUB_OWNER`, pero
`user_roles` es de escritura exclusiva de admin — nadie podría nunca terminar de convertirse
en manager de su propio club recién creado. `0003` agrega `create_club` y
`update_club_branding` como funciones `security definer`, siguiendo el mismo patrón que el
propio `0002_rls.sql` ya dejaba documentado ahí para `submit_match_result`. No abre ninguna
policy nueva de escritura directa — vale la pena que lo revises antes de aplicarlo en
producción.

## Nota sobre `0004_rating_rpc.sql`

`packages/rating-engine` es lógica pura (Glicko-2 adaptado + efecto compañero, cold start,
recalculo histórico — ver su README) y no la reimplementamos ni recalibramos: solo se integró.
`rating_events` no tiene policy de insert para `authenticated` (0002_rls.sql) — el rating nunca
se escribe directo desde el cliente, ni desde esta capa de aplicación. `record_rating_events`
es el único punto de entrada: recibe los `RatingEventOutput` ya calculados, valida que el
partido esté `CONFIRMED` y que el caller lo administre, inserta las filas y proyecta
`players.current_rating`/`current_rating_deviation`.

El punto de integración con el resto del sistema es
`modules/rating/application/recordRatingEventsForMatch.ts` — no está conectado a ningún flujo
todavía porque el Match Engine (confirmación de resultado, Fase 6) no existe aún. Cuando se
construya, debe invocar esta función en el momento exacto en que `Match.status` pasa a
`CONFIRMED`, y en ningún otro momento.

## Qué está construido vs. qué falta

**Construido en esta fase:** Auth (registro, login, roles, RBAC vía RLS), CRUD de
Player/Club/Organizer, shells de Player (mobile) y Club/Organizer (desktop), y la integración
del Rating Engine (lectura de equipos/jugadores, cómputo puro, persistencia vía RPC, rating +
confianza visibles en perfil y home) — lista para que el Match Engine la dispare.

**No construido todavía** (ver `docs/10_ROADMAP.md` — son las próximas fases): Tournament
Engine conectado a UI/DB, Match Engine (validación de scoring, confirmación de 4 jugadores),
Discovery, Content Composer, Admin panel.

## Tests

```bash
npm run test          # tournament-engine (27 tests) + rating-engine (22 tests), vitest
npm run build          # compila los packages + build de producción de apps/web (incluye typecheck)
npm run lint            # eslint de apps/web
```
