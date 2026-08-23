# Match Engine

Lógica pura del motor de partidos (06_MATCH_ENGINE.md): validación de
resultados contra el scoring configurado, flujo de confirmación multi-jugador
con detección de discrepancias, máquina de estados, y advertencia (no
bloqueo) de conflicto de pista. Sin dependencias de framework, base de datos
ni HTTP.

## Contenido

- `scoreValidation.ts` — valida un set individual (juegos + tiebreak) contra `ScoringConfig`, y el super tiebreak del set decisivo.
- `matchValidation.ts` — valida la secuencia completa de sets de un partido: consistentes entre sí, sin sets de más ni de menos, ganador matemáticamente coherente.
- `confirmationFlow.ts` — `detectDiscrepancy` (¿coinciden los resultados que registraron distintos jugadores?) y `computeConfirmationStatus` (agrega las confirmaciones individuales en el estado del partido).
- `stateMachine.ts` — transiciones válidas de `Match.status`, y `detectCourtConflicts` (dos partidos en juego a la vez en la misma pista — advertencia, nunca bloqueo).

## Uso típico

```ts
import {
  validateMatchResult,
  detectDiscrepancy,
  computeConfirmationStatus,
  canTransition,
  DEFAULT_SCORING_CONFIG,
} from "@padel-platform/match-engine";

// 1. Validar el resultado antes de aceptarlo
const result = validateMatchResult(sets, tournament.scoring_config, claimedWinner);
if (!result.valid) {
  // mostrar result.errors al usuario, NO crear el Match como CONFIRMED
}

// 2. Si lo registra un jugador (no el organizador): flujo de confirmación
const status = computeConfirmationStatus(confirmationsDeLos4Jugadores);
// status: PENDING_CONFIRMATION | CONFIRMED | DISPUTED

// 3. Antes de aplicar una transición de estado en la base de datos
if (!canTransition(match.status, "CONFIRMED")) {
  throw new Error("transición de estado no permitida");
}
```

## Notas de diseño importantes

- **No decide quién puede hacer qué.** `canTransition` valida que la transición de estado sea válida en abstracto; la autorización (¿es el organizador? ¿es un jugador del partido? ¿es admin resolviendo un DISPUTED?) es responsabilidad de la capa de aplicación / RLS, no de este motor.
- **El registro directo del organizador (`SCHEDULED`/`IN_PROGRESS` → `CONFIRMED`) es una transición válida** — es el camino documentado en `06_MATCH_ENGINE.md` §3 para torneos presenciales con planillas/staff, y convive con el flujo de confirmación de 4 jugadores.
- **`validateMatchResult` es el único punto que debe llamarse antes de persistir un resultado.** Nunca insertar `SetScore`/marcar `CONFIRMED` sin pasar por aquí primero.
- Una vez `CONFIRMED`, el siguiente paso en la aplicación real es: (a) avisar al Tournament Engine para actualizar clasificación/bracket, y (b) llamar a `@padel-platform/rating-engine` con el resultado — ese wiring vive en la capa de aplicación, no aquí.

## Tests

```
npm install
npm test
```

36 tests, cubriendo la matriz obligatoria completa de `06_MATCH_ENGINE.md` §7:
resultado válido por formato de scoring, set en empate sin tiebreak
rechazado, ganador inconsistente rechazado, confirmación parcial permanece
`PENDING_CONFIRMATION`, resultados distintos entre jugadores producen
`DISPUTED`, registro directo del organizador confirma sin pasar por los 4
jugadores, y dos partidos simultáneos en la misma pista generan advertencia
sin bloquear.
