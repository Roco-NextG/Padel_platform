# Rating Engine

Lógica pura del motor de rating (05_RATING_ENGINE.md): Glicko-2 adaptado
con efecto del compañero desde el día 1 (decisión confirmada del fundador).
Sin dependencias de framework, base de datos ni HTTP.

## Contenido

- `teamRating.ts` — rating de equipo (ponderado por confianza/RD) y expected score.
- `delta.ts` — delta de rating a nivel de equipo (margen de victoria + multiplicador por tipo de partido + RD) y update de RD tras el partido.
- `partnerSplit.ts` — el núcleo del efecto compañero: reparte el delta de equipo de forma desigual entre los dos jugadores según su gap de rating.
- `engine.ts` — `applyMatchResult` (un partido → 4 RatingEvent) y `replayRatingHistory` (recalculo en cadena para corrección de resultados históricos).
- `config.ts` — todas las constantes de calibración en un solo lugar, documentadas como ajustables con datos reales.

## Corrección respecto al brief original

El brief especifica `expected_score = 1/(1+10^((ratingB-ratingA)/400))`, con
divisor 400 — calibrado para escalas tipo Elo (cientos de puntos). En la
escala 1-7 del rating de pádel, ese divisor deja el expected_score pegado a
0.5 casi sin importar la diferencia real de nivel. Se reemplaza por
`EXPECTED_SCORE_DIVISOR = 2.0` (configurable en `config.ts`), calibrado para
que una diferencia de ~2 puntos ya implique ~90% de probabilidad esperada.

## Uso típico

```ts
import { applyMatchResult, createColdStartRating } from "@padel-platform/rating-engine";

const events = applyMatchResult({
  matchId: "match-123",
  teamA: { players: [ratingStateA1, ratingStateA2] },
  teamB: { players: [ratingStateB1, ratingStateB2] },
  winner: "A",
  gamesWonA: 12,
  gamesWonB: 8,
  matchType: "TOURNAMENT", // o "COMPETITIVE" / "MAJOR_TOURNAMENT"
});
// events: 4 RatingEventOutput — persistir cada uno como fila de `rating_events`
// y actualizar `player.current_rating` como proyección del último evento.

// Jugador nuevo:
const newPlayerState = createColdStartRating("player-uuid");
```

## Recalculo histórico

```ts
import { replayRatingHistory } from "@padel-platform/rating-engine";

// matchesInOrder: TODOS los partidos del jugador afectado, en orden
// cronológico, a partir del partido corregido (docs/05_RATING_ENGINE.md §8).
const events = replayRatingHistory(matchesInOrder, initialStatesBeforeCorrection);
```

## Notas de diseño importantes

- **`applyMatchResult` no decide cuándo correr.** Es responsabilidad del caller
  invocarla únicamente cuando `Match.status` pasa a `CONFIRMED` — el motor no
  conoce el concepto de estado de partido.
- **Nunca escribe `player.current_rating` directamente.** Devuelve eventos;
  persistirlos y proyectar el rating actual es responsabilidad de la capa de
  aplicación (regla dura, ver `01_ARCHITECTURE.md` §6.3).
- Todas las constantes de calibración (`BASE_K`, `PARTNER_MAX_SKEW`,
  `EXPECTED_SCORE_DIVISOR`, multiplicadores por tipo de partido, etc.) están
  centralizadas en `config.ts` — se ajustan ahí, no dispersas por el código,
  cuando lleguen datos reales de los torneos piloto.

## Tests

```
npm install
npm test
```

22 tests: rating de equipo ponderado por confianza, expected_score simétrico
y sensible a la diferencia de nivel, efecto compañero (reparto desigual en
victoria y en derrota, siempre suma 1, nunca 0%/100%), cold start (jugador
nuevo se mueve más, RD baja pero respeta el piso), signo correcto del delta
en victoria/derrota, 4 resultados inválidos rechazados, y recalculo en
cadena (encadena estado entre partidos, y reproduce el mismo resultado que
un cálculo directo).
