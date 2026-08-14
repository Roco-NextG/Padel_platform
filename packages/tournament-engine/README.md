# Tournament Engine

Lógica pura del motor de torneos (04_TOURNAMENT_ENGINE.md). Sin dependencias
de framework, base de datos ni HTTP — se importa tal cual desde el módulo
`tournament-engine` del backend (ver `09_TECHNICAL_ARCHITECTURE.md` §2).

## Contenido

- `groupStage.ts` — generación de partidos round-robin y distribución serpentina en grupos.
- `standings.ts` — clasificación de grupo con el orden de desempate confirmado: partidos ganados → juegos ganados → diferencia de sets → diferencia de games → enfrentamiento directo.
- `seeding.ts` — seeding balanceado post fase de grupos (por posición de grupo, luego por fortaleza relativa).
- `bracket.ts` — generación de bracket para **cualquier número de equipos** (bye automático cuando N no es potencia de 2) + intento de separación de equipos del mismo grupo de origen, documentando los conflictos que no puede resolver.
- `index.ts` — barrel export.

## Uso típico

```ts
import {
  distributeIntoGroups,
  generateGroupMatches,
  calculateStandings,
  balancedSeeding,
  generateBracket,
} from "@padel-platform/tournament-engine";

// 1. Distribuir equipos inscritos en grupos
const groups = distributeIntoGroups(teams, 4);

// 2. Generar partidos de cada grupo
const matchesGroupA = generateGroupMatches(groups["Grupo A"]);

// 3. Tras jugarse los partidos, calcular clasificación
const standingsA = calculateStandings(groups["Grupo A"], resultsGroupA);

// 4. Seeding balanceado con todos los grupos ya clasificados
const seeded = balancedSeeding({ "Grupo A": standingsA, "Grupo B": standingsB /* ... */ });

// 5. Generar el bracket (funciona igual con o sin fase de grupos previa)
const bracket = generateBracket(seeded);
// bracket.firstRoundMatches -> partidos a crear en la tabla Match
// bracket.unresolvedGroupConflicts -> mostrar al organizador, no bloquea nada
```

## Notas de diseño importantes

- **Nunca lanza excepción por no poder separar grupos de origen.** Si la separación total es matemáticamente imposible (pocos grupos, muchos clasificados), el bracket se genera igual y los conflictos quedan en `unresolvedGroupConflicts` para mostrárselos al organizador (decisión confirmada, ver `04_TOURNAMENT_ENGINE.md` §5).
- **El bracket soporta cualquier N desde el día 1**, no solo 8/16/32 — la validación obligatoria de lanzamiento se concentra en esos tamaños, pero 12/20/24 (y cualquier otro) ya están cubiertos por el mismo algoritmo de byes (decisión del fundador, no bloquear el motor a tamaños fijos).
- **`Team` es efímero.** Este motor no conoce "parejas habituales" ni las necesita — solo trabaja con `teamId` y `groupId` para la duración del torneo (ver `02_DOMAIN_MODEL.md` §3).

## Tests

```
npm install
npm test
```

27 tests, incluyendo la matriz de pruebas obligatoria completa: 8/16/32 exactos, 12/20/24 con bye, ningún equipo contra sí mismo, ningún partido con dos ganadores posibles, distribución de byes no concentrada en una mitad, separación de grupo cuando es posible, y documentación del conflicto cuando es matemáticamente imposible.
