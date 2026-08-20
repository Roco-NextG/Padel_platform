# Padel Platform

Plataforma SaaS de pádel — Tournament, Ranking & Player Network.

## Estado del proyecto

El proyecto se reinició (ver git history si necesitás la implementación anterior — torneos,
partidos, rating, discovery — todavía existe en commits previos de `main`, solo que ya no está
en el working tree). Orden de construcción nuevo: **panel de Admin primero**, después Club,
después Organizador, después app móvil de Jugador (Android, luego iOS), y recién ahí se retoma
el resto de la web. Este README describe únicamente lo que existe hoy: el reset + panel de
admin v1.

Se conservó del proyecto anterior: los tokens de diseño (`apps/web/src/app/globals.css`) y el
kit de UI compartido (`apps/web/src/components/ui/*` — Button, Card, Badge, Input/Field/Label,
Alert, ChoiceGroup, EmptyState, Switch), ninguno de los dos acoplado a la lógica de negocio que
se tiró. Todo lo demás — los 3 packages (`tournament-engine`, `rating-engine`, `match-engine`),
las 23 migraciones, el modelo de roles anterior — se borró.

## Modelo de 3 roles + admin

- **Admin**: ve y administra todo — toda la base de clubes, organizadores y jugadores.
- **Club** y **Organizador**: cada uno crea torneos; solo van a ver jugadores inscritos en SUS
  PROPIOS torneos (esa regla de scoping vive en el esquema de torneos/inscripción, que todavía
  no existe — esta fase solo sienta la base de cuentas + roles).
- **Jugador**: fuera de alcance de esta fase — el enum ya lo incluye (barato hoy, evita un
  `ALTER TYPE` más adelante) pero ninguna UI lo asigna todavía.

No hay auto-registro público: la única forma de conseguir una cuenta de Club u Organizador es
que un Admin la invite desde `/admin/invitar`.

## Estructura

```
apps/web/src/
  app/
    (auth)/
      login/              /login
      invitacion/         acepta una invitación pendiente (fija contraseña, adjunta el rol)
      bienvenida/         landing placeholder post-invitación — todavía no hay panel de Club/Organizador
    admin/                panel de admin: /admin (usuarios), /admin/invitar, /admin/invitaciones
    auth/callback/         intercambia el `code` de Supabase (invite/magic-link) por una sesión
    proxy.ts               refresca sesión + gatea rutas (login vs. resto)
  modules/
    auth/       domain (roles, schemas, mensajes de error) · application (sign in/out,
                getCurrentUserContext) · infrastructure (Supabase)
    admin/      domain (schema de invitación) · application (acciones, agregación de datos) ·
                infrastructure (lecturas via RLS + client de service role para Auth Admin API) ·
                ui (lista de usuarios, formulario de invitar, lista de invitaciones pendientes)
    invites/    domain (schema de contraseña) · application (setPasswordAction + redeem_invite) ·
                ui (formulario de activar cuenta)
  lib/
    supabase/   client.ts (browser) · server.ts (RSC/actions, respeta RLS) · admin.ts (service
                role — solo desde Server Actions, nunca desde el cliente) · session.ts (helper
                del proxy) · database.types.ts (a mano, ver nota abajo)
  components/ui/ Kit compartido (ver "Estado del proyecto")

supabase/migrations/
  0001_reset.sql           drop schema public cascade — arranca limpio, mismo proyecto Supabase
  0002_schema.sql          clubs, organizers, role_assignments, players (placeholder mínimo),
                            pending_invites — con los GRANT incluidos desde el día 1
  0003_rls.sql              is_admin() / is_club() / is_organizer() + policies
  0004_invite_rpc.sql       redeem_invite() — adjunta el role_assignment al aceptar la invitación
```

## Stack

Next.js 16 (App Router) + TypeScript · Supabase (Postgres + Auth, RLS como capa de seguridad
real) · Tailwind v4 · Inter (`next/font`) · Phosphor Icons · Zod + Server Actions +
`useActionState`.

## Levantar el proyecto

```bash
npm install
```

1. Mismo proyecto Supabase de siempre (`uvdenlpryorrcjxiilxt`). Corré las 4 migraciones nuevas
   en orden por el SQL Editor del dashboard: `0001_reset.sql` (⚠️ borra todo el schema `public`
   existente) → `0002_schema.sql` → `0003_rls.sql` → `0004_invite_rpc.sql`.
2. Copiá `apps/web/.env.local.example` a `apps/web/.env.local` y completá:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
   - `SUPABASE_SERVICE_ROLE_KEY` (mismo lugar, clave `service_role` — **secreta**, nunca con
     prefijo `NEXT_PUBLIC_`). Sin esto, `/admin/invitar` no puede llamar a
     `auth.admin.inviteUserByEmail`.
   - `NEXT_PUBLIC_SITE_URL` — el origin real de la app (en producción, la URL de Vercel) — se
     usa para armar el link al que redirige la invitación.
3. `npm run dev` (levanta `apps/web` en `http://localhost:3000`).

### Primer admin (bootstrap manual)

`role_assignments` solo se puede escribir desde admin (RLS: `role_assignments_write` exige
`is_admin()`) o desde `redeem_invite()` (security definer). Para el primer Admin, no hay
invitación posible todavía — hay que hacerlo a mano una vez:

1. Creá la cuenta desde el Dashboard de Supabase (Authentication → Add User).
2. Insertá su rol en el SQL Editor:

```sql
insert into public.role_assignments (user_id, role)
values ('<auth.users.id de esa cuenta>', 'ADMIN');
```

Desde ahí, ese admin invita a Clubes y Organizadores desde `/admin/invitar` — ya no hace falta
tocar SQL de nuevo.

## Nota sobre `database.types.ts`

Está escrito a mano, no generado — cubre exactamente las tablas de `0002_schema.sql`. Una vez
que las migraciones estén aplicadas en el proyecto real, regenerarlo de verdad (Dashboard →
"Generate types", o el CLI) y diffear contra este archivo para detectar cualquier divergencia.
No confiar en la versión a mano más allá de esta fase inicial.

## Nota sobre el mecanismo de invitación

El token que efectivamente crea la cuenta lo genera y valida **Supabase Auth**
(`auth.admin.inviteUserByEmail` — link de un solo uso, con expiración, todo del lado de
Supabase). `pending_invites` es solo metadata de negocio (qué rol/alcance corresponde asignar
al aceptar, y para que el admin vea invitaciones pendientes/vencidas en `/admin/invitaciones`)
— nunca la barrera de seguridad en sí. La creación del club/organizer y el envío de la
invitación no son atómicos (dos sistemas distintos no pueden compartir una transacción); si el
segundo paso falla, el club/organizer queda visible como huérfano en `/admin/invitaciones` en
vez de silencioso — se resuelve reintentando la invitación a mano.

## Qué está construido vs. qué falta

**Construido en esta fase:** login/logout, panel de Admin (lista de usuarios con
activar/desactivar, invitar Club u Organizador, seguimiento de invitaciones pendientes), flujo
completo de aceptación de invitación (fijar contraseña → rol adjuntado vía `redeem_invite`).

**No construido todavía:** paneles de Club y Organizador (torneos, partidos, jugadores
inscritos — todo lo que dependía de los packages/migraciones borrados), app móvil de Jugador,
y el resto de la web (todo lo que vivía bajo las rutas `(club)`/`(player)`/`descubrir` del
proyecto anterior).

## Tests

No hay ningún test en este momento — los 3 packages con sus suites de vitest se borraron junto
con el resto de la lógica de negocio anterior. Van a volver a existir cuando se reconstruya esa
lógica en las próximas fases.

```bash
npm run build   # build de producción de apps/web (incluye typecheck)
npm run lint    # eslint de apps/web
```
