# Documento 2 — Domain Model
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Mapa de entidades principales

```
                        ┌───────────┐
                        │   User    │  (cuenta técnica: login, email, password)
                        └─────┬─────┘
                              │ 1:1
                        ┌─────▼─────┐
                        │  Player   │  (identidad deportiva permanente)
                        └─────┬─────┘
        ┌─────────────┬───────┼────────────┬──────────────┐
        ▼             ▼       ▼            ▼              ▼
  ClubMembership  TeamMember  RatingHistory PartnerStat*  TournamentEntry

  * PartnerStat = vista derivada, no tabla persistida
```

```
Organizer ──N:N (vía Tournament)── Club
                     │
                     ▼
                Tournament ──1:N── TournamentCategory
                     │
                     ├──1:N── TournamentGroup ──1:N── Team (via TeamMember)
                     ├──1:N── TournamentPhase (Groups / Bracket / Consolation)
                     ├──1:N── Match
                     └──1:N── Sponsor (v3)

Match ──1:N── SetScore
Match ──N:1── Court ──N:1── Club
Match ──1:N── RatingEvent (uno por jugador afectado)
```

---

## 2. Entidades core y por qué existen

| Entidad | Naturaleza | Notas de diseño |
|---|---|---|
| **User** | Cuenta técnica | Separada de `Player` a propósito: permite que en el futuro un `User` administre varios `Player` (ej. padre gestionando el perfil de un hijo) sin romper el modelo. |
| **Player** | Identidad deportiva permanente | Nunca se duplica entre clubes. Tiene `public_profile: boolean` que controla visibilidad de campos sensibles (ver sección 5). |
| **Club** | Instalación/operador | Tiene `branding` (logo, colores, tipografía) como objeto de configuración, no columnas sueltas. |
| **Organizer** | Gestor de torneos | Puede no tener ningún `Club` propio. Relación con `Tournament` es directa; relación con `Club` es indirecta, a través de los torneos que organiza en ese club. |
| **Tournament** | Evento deportivo concreto | Máquina de estados explícita (ver sección 4). Tiene `is_published: boolean` que controla aparición en Discovery — **no** es lo mismo que el estado del torneo. |
| **TournamentCategory** | Subdivisión (ej. "4ta masculina") | Un torneo puede tener varias categorías corriendo en paralelo, cada una con su propio bracket. |
| **TournamentGroup** | Fase de grupos (opcional) | Existe solo si el torneo usa fase de grupos. |
| **Team** | Pareja **temporal**, ligada a un torneo o partido concreto | **No es una identidad.** Dos jugadores que vuelven a jugar juntos en otro torneo generan un `Team` nuevo. Ver sección 3. |
| **TeamMember** | Jugador dentro de un Team | Permite auditar quién jugó con quién sin duplicar `Player`. |
| **Match** | Partido concreto | Puede pertenecer a un `Tournament` (vía `TournamentPhase`/`TournamentGroup`) o ser un `CasualMatch` fuera de torneo. Ambos comparten el mismo modelo base de resultado. |
| **SetScore** | Un set dentro de un Match | Nunca un solo campo `score: string` — se pierde la capacidad de validar y de recalcular. |
| **Court** | Pista física | Pertenece a un `Club`. |
| **RatingEvent** | Un cambio de rating, inmutable | `player_id, match_id, old_rating, new_rating, reason, algorithm_version, timestamp`. Es la fuente de verdad. |
| **RatingHistory** | Proyección/serie temporal derivada de `RatingEvent` | Se puede reconstruir 100% desde `RatingEvent` — nunca se edita a mano. |
| **Sponsor** | Patrocinador de torneo | Modelado desde ya, no expuesto hasta v3. |
| **ContentAsset / Template** | Contenido generado | Vinculado siempre a un evento deportivo (`match_id` o `tournament_id`), nunca texto libre suelto. |

---

## 3. Decisión crítica: Team no es una identidad

El brief original (sección 34) pide mostrar "parejas habituales" en el perfil del jugador. Esto **no** requiere una tabla `Pair` o `Partnership` persistente. Si la creáramos, tendríamos dos fuentes de verdad para la misma información (el histórico de `Team`/`TeamMember` por un lado, la tabla de parejas por otro) y correríamos el riesgo de que se desincronicen.

**Solución:** "Compañero habitual" es una **consulta agregada**:

```sql
-- Conceptual, no literal
SELECT partner_id, COUNT(*) as matches_together, ...
FROM team_member tm1
JOIN team_member tm2 ON tm1.team_id = tm2.team_id AND tm1.player_id != tm2.player_id
WHERE tm1.player_id = :player_id
GROUP BY partner_id
```

Esto mantiene `Team` puramente temporal y evita modelar la "pareja" como si fuera un jugador de segundo orden.

---

## 4. Máquinas de estado (a definir con detalle en el spec de cada motor)

**Tournament.status:**
`DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → IN_PROGRESS → FINISHED`
con salidas posibles a `CANCELLED` (desde cualquier estado antes de `FINISHED`) y `ARCHIVED` (solo desde `FINISHED`/`CANCELLED`).

**Match.status:** propuesto — `SCHEDULED → IN_PROGRESS → PENDING_CONFIRMATION → CONFIRMED` con salida a `DISPUTED` (ver sección 30 del brief) y `CANCELLED`.

*(Diagrama completo de transiciones y guardas se detalla en `06_TOURNAMENT_ENGINE.md` y `08_MATCH_ENGINE.md` en la siguiente entrega.)*

---

## 5. Privacidad a nivel de dato

Cada `Player` tiene campos marcados `public` u `private` desde el modelo, no solo desde la UI:

- **Público (si `public_profile = true`):** nombre, foto, rating, estadísticas deportivas, historial de partidos.
- **Siempre privado:** teléfono, email, fecha de nacimiento exacta, datos de pago.

**Pendiente de decisión del fundador:** si un jugador tiene perfil privado pero participa en un torneo público, ¿su resultado aparece en el bracket público del torneo? (Recomendación: sí, el resultado del torneo es del torneo, no del jugador — pero el link a su perfil/estadísticas extendidas respeta su privacidad.)

---

## 6. Entidades explícitamente modeladas pero no implementadas en MVP

`CoinWallet`, `CoinTransaction`, `Payment`, `Subscription`, `Sponsor` (activo) — existen en este documento de dominio para que el modelo de datos final (`03_DATABASE_SCHEMA.md`) no requiera migraciones destructivas al activarlas, pero no se crean tablas ni endpoints para ellas en el MVP.
