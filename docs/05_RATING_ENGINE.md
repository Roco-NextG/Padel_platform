# Documento 5 — Padel Rating Engine Specification
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

> **Decisión confirmada del fundador:** el efecto del compañero se incluye desde el día 1 del MVP, no se pospone a v1.1. Este documento diseña esa versión ampliada.

---

## 1. Principio base

El rating pertenece **individualmente** a cada jugador, nunca a la pareja (sección 20-21 del brief). Pero como el pádel se juega 2v2, el algoritmo necesita un paso intermedio: estimar el "rating de equipo" a partir de los dos individuales, calcular el resultado esperado del partido, y luego **repartir el ajuste de vuelta a cada jugador de forma desigual**, según cuánto contribuyó cada uno relativo a su nivel previo.

---

## 2. Algoritmo base: Glicko-2 adaptado

Se elige Glicko-2 (no Elo puro) porque incorpora nativamente:
- **Rating (`r`)**: nivel estimado del jugador.
- **Rating Deviation (`RD`)**: confianza en ese rating — clave para el cold start (sección 33 del brief).
- **Volatility (`σ`)**: qué tan consistente es el jugador.

No se implementa el algoritmo UTR ni se copia literalmente (explícitamente descartado en el brief, sección 23). Es una adaptación propia versionada (`algorithm_version`).

---

## 3. Paso 1 — Rating de equipo esperado

Para el partido `Team A (jugador A1, A2)` vs `Team B (jugador B1, B2)`:

```
team_rating(A) = promedio_ponderado(r_A1, r_A2)   -- ponderado por RD: jugador con más confianza pesa más
team_rating(B) = promedio_ponderado(r_B1, r_B2)

expected_score(A) = 1 / (1 + 10^((team_rating(B) - team_rating(A)) / D))
```

> **Corrección hecha durante la implementación:** el divisor original (400) está calibrado para escalas tipo Elo (cientos de puntos). En la escala 1-7 de este producto, un divisor de 400 deja `expected_score` pegado a ~0.5 casi sin importar la diferencia real de nivel entre equipos. Se usa `D = 2.0` (configurable en `packages/rating-engine/src/config.ts`), calibrado para que una diferencia de ~2 puntos de rating ya implique ~90% de probabilidad esperada. Mismo criterio que el resto del documento: coeficiente ajustable, no congelado.

---

## 4. Paso 2 — Ajuste a nivel de equipo

Se calcula el delta de rating "de equipo" con la fórmula estándar de Glicko-2 en función de: resultado real (victoria/derrota), `expected_score`, diferencia de sets/games (como señal de margen, no solo victoria binaria — sección 24), y el multiplicador por tipo de partido (sección 32: Competitive=1.0, Tournament=1.2, Major Tournament=1.5 — **configurables**, no fijos).

---

## 5. Paso 3 — Reparto individual (efecto del compañero)

Este es el núcleo de la decisión confirmada. El delta de equipo **no se reparte igual** entre los dos jugadores:

```
Para cada jugador X del equipo con compañero Y:

  gap = r_X - r_Y   -- diferencia de nivel con su compañero (puede ser + o -)

  peso_X = 1 - (gap / (gap_A + gap_B_normalizado))   -- el jugador de menor rating
                                                        recibe una porción mayor del delta positivo
                                                        (tiene más "margen de sorpresa"),
                                                        y una porción menor del delta negativo
                                                        (se le penaliza menos por perder
                                                        acompañado de alguien más fuerte)

  new_r_X = r_X + (team_delta * peso_X)
```

**Ejemplo del brief (sección 25):** A (5.0) + B (3.5) ganan contra C/D (4.5 cada uno). El sistema evalúa que A tuvo un resultado por encima de lo esperado y B también, pero no en la misma magnitud — B, al ser el jugador más débil de su pareja, absorbe una porción mayor de la ganancia; A, al ser el más fuerte, una porción menor. Si el resultado hubiera sido una derrota, la lógica se invierte: A (el más fuerte) absorbe más penalización relativa por "se esperaba que su pareja ganara".

**Nota de calibración:** los pesos exactos de esta fórmula (`peso_X`) se calibran con datos reales de los primeros torneos piloto — el diseño conceptual queda fijado aquí, los coeficientes numéricos no se congelan hasta tener partidos reales para validarlos. Esto es coherente con no fijar valores definitivos sin datos (sección 32 del brief).

---

## 6. Cold start (jugador nuevo)

- Rating inicial provisional: valor por defecto configurable (ej. 4.0 en escala 1-7, a definir con el negocio) con `RD` alto ("Confidence: Low").
- El rating se muestra con su nivel de confianza explícito en la UI (sección 33): `Rating: 4.2 · Confianza: Baja` hasta superar un umbral mínimo de partidos confirmados, momento en el que `RD` baja y pasa a `Confianza: Alta`.

---

## 7. RatingEvent — trazabilidad obligatoria

Cada actualización genera un `RatingEvent` por jugador afectado (2 por partido, 4 en total contando ambos equipos):

```
player_id, match_id, partner_id,
old_rating, new_rating, old_rd, new_rd,
reason (TOURNAMENT_MATCH | COMPETITIVE_MATCH),
algorithm_version,
timestamp
```

`player.current_rating` es siempre una proyección del último `RatingEvent` — nunca se escribe directamente (regla dura, `01_ARCHITECTURE.md` §6.3).

---

## 8. Recalculo ante corrección de resultado histórico

Si se corrige un resultado ya confirmado (sección 107 del brief):
1. Se marca el `Match` original y su cadena de `RatingEvent` posteriores como `superseded`.
2. Se recalculan en orden cronológico todos los `RatingEvent` de los jugadores afectados **a partir de ese partido en adelante** (no solo ese partido — el error se propaga a todos los partidos posteriores de esos jugadores).
3. Operación asíncrona (puede tardar), con estado visible al admin (`RECALCULATING` → `DONE`).

---

## 9. Matriz de pruebas obligatoria (sección 105-106 del brief)

| Caso | Verificación |
|---|---|
| Jugador nuevo (cold start) | RD alto, rating no se dispara con 1 solo partido |
| Pareja desigual (gap grande) | El jugador más débil recibe mayor variación relativa que el más fuerte |
| Rival fuerte / rival débil | `expected_score` refleja correctamente la diferencia, delta se ajusta en consecuencia |
| Victoria / derrota | Signo correcto del delta |
| Resultado inválido | Rechazado antes de generar `RatingEvent` |
| Partido no confirmado | No genera `RatingEvent` (solo `CONFIRMED` dispara rating) |
| Corrección de resultado histórico | Recalculo en cadena, versión de algoritmo preservada por evento histórico |

---

## 10. Fuera de alcance en v1 (aunque el efecto compañero sí entra)

- Recomendaciones automáticas de rival/compañero (matchmaking) — sección 110, queda para v4.
- Comparativas avanzadas / analytics de rating como feature premium — sección 56, queda para v3.
