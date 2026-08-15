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
    0005_club_audit_and_contrast.sql  triggers: auditoría universal + WCAG server-side en Club
    0006_grants.sql             GRANT base a anon/authenticated — ver nota abajo

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
2. Corre las migraciones en orden: `0001` → `0002` → `0003` → `0004` → `0005` → `0006`
   (SQL Editor del dashboard, o `supabase db push` con el CLI) — el orden importa, cada
   una depende de la anterior. Si corres esto por SQL Editor (no por `supabase db push`),
   **no te saltes `0006`**: sin ella todas las tablas devuelven 401 "permission denied"
   vía la API aunque el schema y las RLS policies estén perfectos — ver nota abajo.
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

## Nota sobre `0005_club_audit_and_contrast.sql`

Dos gaps reales encontrados al revisar `0003`: `update_club_branding` auditaba a mano pero el
`UPDATE` directo que la RLS de `clubs_update` ya permitía (name/city/address) no dejaba rastro
en `audit_log`; y la validación WCAG solo vivía en `apps/web/src/lib/color/contrast.ts` — como
Supabase expone la base directamente, nada impedía saltársela llamando la RPC o un `UPDATE`
directo. Se resuelve con dos triggers sobre `clubs` (no dentro de cada función, para que
apliquen sin importar el camino de escritura): `enforce_branding_contrast` reimplementa la
misma fórmula y los mismos umbrales que `contrast.ts` en SQL, y `audit_clubs_changes` cubre
INSERT/UPDATE/DELETE. Verificado end-to-end contra un Postgres 16 real (no solo leído): mismos
números de contraste que el cliente, un `INSERT`/`UPDATE` con mal contraste se rechaza igual
por cualquiera de los dos caminos, y cada escritura queda en `audit_log`.

## Nota sobre `0006_grants.sql`

Al fin conectar contra el proyecto Supabase real (después de aplicar `0001`-`0005` por SQL
Editor), toda la API devolvía `401 permission denied for table X` — no un problema de RLS, sino
que ninguna migración anterior le había dado a `anon`/`authenticated` el `GRANT` de tabla base
que Postgres exige antes de siquiera evaluar las policies. Es un gap típico de correr SQL crudo
por el SQL Editor en vez del flujo estándar de Supabase (que auto-otorga esto). `0006` corrige
esto con `GRANT ... ON ALL TABLES IN SCHEMA public` + `ALTER DEFAULT PRIVILEGES` para que las
tablas futuras también queden cubiertas — no abre ningún acceso que las policies no permitan ya
(verificado: tras aplicar el grant, un `INSERT` directo a `rating_events` como `authenticated`
sigue rechazado, ahora por RLS en vez de por falta de permiso).

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
