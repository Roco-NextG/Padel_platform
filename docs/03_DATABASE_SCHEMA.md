# Documento 3 — Database Schema
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

> Notación conceptual (no DDL literal de producción). PostgreSQL. Todos los IDs son UUID salvo que se indique lo contrario. Todas las tablas llevan `created_at`, `updated_at`; las tablas de resultado/ranking llevan además `created_by`.

---

## 1. Identidad y cuentas

```sql
User (
  id, email UNIQUE, phone, password_hash,
  status ENUM(ACTIVE, SUSPENDED, DELETED)
)

Player (
  id, user_id FK -> User NULLABLE,   -- nullable: admin puede crear un Player sin cuenta aún (ej. import de torneo pasado)
  first_name, last_name, photo_url,
  birth_date, gender,
  country_id FK, city,
  hand ENUM(RIGHT, LEFT),
  preferred_position ENUM(DRIVE, REVES, BOTH),
  public_profile BOOLEAN DEFAULT true,
  primary_club_id FK -> Club NULLABLE
)

ClubMembership (
  id, player_id FK, club_id FK,
  role ENUM(MEMBER, STAFF, OWNER, MANAGER),
  joined_at
)
```

**Nota:** `User` y `Player` están separados a propósito (ver `02_DOMAIN_MODEL.md` §2) para permitir perfiles gestionados sin login propio.

---

## 2. Clubes y organizadores

```sql
Club (
  id, name, country_id FK, city, address,
  branding JSONB  -- { logo_url, primary_color, secondary_color, accent, font }
)

Court (
  id, club_id FK, name, number,
  indoor BOOLEAN,
  status ENUM(AVAILABLE, MAINTENANCE, DISABLED)
)

Organizer (
  id, user_id FK -> User,
  name, type ENUM(INDIVIDUAL, COMPANY)
)
```

`Organizer` no tiene FK directa a `Club`: la relación es siempre a través de `Tournament.club_id` + `Tournament.organizer_id`, que es lo que permite a un organizador gestionar torneos en varios clubes.

---

## 3. Torneos

```sql
Tournament (
  id, name, description, logo_url, cover_image_url,
  organizer_id FK, club_id FK,
  status ENUM(DRAFT, PUBLISHED, REGISTRATION_OPEN, REGISTRATION_CLOSED,
              IN_PROGRESS, FINISHED, CANCELLED, ARCHIVED),
  is_published BOOLEAN DEFAULT false,   -- visibilidad en Discovery, independiente de `status`
  start_date, end_date,
  scoring_config JSONB,   -- sets, tiebreak, super-tiebreak, etc.
  tiebreak_rules JSONB DEFAULT '["matches_won","games_won","set_diff","game_diff","head_to_head"]'
)

TournamentCategory (
  id, tournament_id FK, name,  -- ej. "4ta Masculina"
  level, gender_restriction, max_teams
)

TournamentGroup (
  id, category_id FK, name  -- "Grupo A"
)

TournamentPhase (
  id, category_id FK,
  type ENUM(GROUPS, ROUND_OF_32, ROUND_OF_16, QUARTERFINAL, SEMIFINAL, FINAL, CONSOLATION),
  order_index
)
```

**Nota sobre `tiebreak_rules`:** se guarda como JSONB con el orden fijo confirmado por defecto (`matches_won → games_won → set_diff → game_diff → head_to_head`), no hardcodeado en el código del engine. Esto no habilita edición desde la UI en MVP, pero evita una migración destructiva cuando se active en v2.

---

## 4. Parejas y partidos

```sql
Team (
  id, tournament_category_id FK NULLABLE,  -- NULL si es Team de partida casual (v2)
  group_id FK -> TournamentGroup NULLABLE,
  seed INT NULLABLE
)

TeamMember (
  id, team_id FK, player_id FK
  -- UNIQUE(team_id, player_id); un Team tiene exactamente 2 TeamMember en pádel
)

Match (
  id, tournament_id FK NULLABLE,      -- NULL para CasualMatch (v2)
  phase_id FK NULLABLE,
  group_id FK NULLABLE,
  round_index, court_id FK,
  team_a_id FK -> Team, team_b_id FK -> Team,
  scheduled_start, scheduled_end, actual_start, actual_end,
  status ENUM(SCHEDULED, IN_PROGRESS, PENDING_CONFIRMATION, CONFIRMED, DISPUTED, CANCELLED),
  winner_team_id FK NULLABLE,
  match_type ENUM(TOURNAMENT, COMPETITIVE, CASUAL)  -- CASUAL/COMPETITIVE libres se activan en v2
)

SetScore (
  id, match_id FK, set_number,
  team_a_games, team_b_games,
  tiebreak_a NULLABLE, tiebreak_b NULLABLE
)

MatchConfirmation (
  id, match_id FK, player_id FK,
  confirmed BOOLEAN, confirmed_at
)
```

---

## 5. Rating

```sql
RatingEvent (
  id, player_id FK, match_id FK,
  old_rating, new_rating, old_rd, new_rd,   -- rd = rating deviation (confianza)
  partner_id FK,                             -- quién fue su compañero en este evento
  reason ENUM(TOURNAMENT_MATCH, COMPETITIVE_MATCH),
  algorithm_version VARCHAR,
  created_at
)
```

`RatingHistory` **no es una tabla propia**: es una vista/proyección ordenada de `RatingEvent` por jugador. El rating "actual" de un jugador (`Player.current_rating`, columna desnormalizada para performance de lectura) se recalcula siempre a partir del último `RatingEvent` — nunca se edita directamente (regla dura, ver `01_ARCHITECTURE.md` §6.3).

---

## 6. Auditoría

```sql
AuditLog (
  id, actor_user_id FK, entity_type, entity_id,
  action, before JSONB, after JSONB, created_at
)
```

Obligatorio en escrituras a: `Match` (resultado), `RatingEvent`, `Team`/bracket, `Player`, cualquier operación de `Admin`.

---

## 7. Preparado pero no implementado en MVP

`Sponsor`, `ContentAsset`, `Template` (modelo mínimo sí se crea para el Content Composer básico del MVP — ver §66 del brief), `CoinWallet`, `CoinTransaction`, `Payment`, `Subscription`. Se documentan aquí para que su futura activación no requiera romper el esquema existente, pero no se migran a producción hasta v2/v3 según corresponda.

---

## 8. Índices críticos de performance

- `Match(tournament_id, status)` — vista "en vivo" del organizador (sección 120 del brief).
- `RatingEvent(player_id, created_at DESC)` — historial/leaderboard de jugador.
- `Tournament(is_published, start_date)` — Discovery.
- `TeamMember(player_id)` — cálculo de "compañeros habituales" (agregación, ver `02_DOMAIN_MODEL.md` §3).
