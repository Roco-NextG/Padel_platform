# Documento 6 — Match Engine Specification
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Alcance en MVP

El Match Engine en MVP maneja **únicamente partidos de torneo** (`match_type = TOURNAMENT`). El modelo de datos ya contempla `COMPETITIVE` y `CASUAL` (sección 27 del brief) para no requerir migración cuando se activen en v2, pero no se exponen en UI ni se pueden crear fuera de un torneo todavía.

---

## 2. Validación de resultados (formato de scoring)

El resultado de un `Match` se valida contra la configuración de scoring del torneo (`Tournament.scoring_config`), no contra una regla fija en código. Parámetros configurables:

- Sets a jugar (ej. mejor de 3)
- Juegos por set (normalmente 6, con diferencia de 2 o tie-break en 6-6)
- Tie-break normal vs. super tie-break (a 10, con diferencia de 2) en el último set

**Reglas de validación duras (no configurables):**
- Un set no puede terminar en empate de games salvo que se resuelva por tie-break registrado.
- El ganador del partido debe ser matemáticamente consistente con los sets registrados (ej. mejor de 3: ganador tiene 2 sets ganados).
- No se puede confirmar un `Match` sin al menos un `SetScore` válido por cada set jugado.

---

## 3. Flujo de registro y confirmación

```
Jugador A registra resultado
      ↓
Match.status = PENDING_CONFIRMATION
      ↓
Notificación in-app/email a los otros 3 jugadores del partido
      ↓
Cada jugador confirma (MatchConfirmation.confirmed = true)
      ↓
Cuando los 4 confirman → Match.status = CONFIRMED
      ↓
Dispara: actualización de bracket/grupo (Tournament Engine)
         actualización de rating (Rating Engine)
         evento de analytics `ResultConfirmed`
```

**Discrepancia:** si un jugador registra un resultado distinto al ya registrado por otro, o rechaza la confirmación, `Match.status = DISPUTED`. Solo el organizador/admin puede resolver un partido en `DISPUTED` (nunca los propios jugadores entre sí), y la resolución queda en `AuditLog`.

**Nota de alcance MVP:** en partidos de torneo, el organizador puede registrar el resultado directamente sin pasar por confirmación de 4 jugadores (es la fuente autorizada en el contexto de un torneo presencial con planillas/staff). El flujo de confirmación entre jugadores descrito arriba es el que aplica cuando el registro lo inicia un jugador — ambos caminos conviven.

---

## 4. Anti-fraude — nivel MVP

Según sección 31 del brief, en MVP se implementa solo el nivel básico (lo avanzado — score verification, reputación, ML — queda para v2+):

- Confirmación múltiple obligatoria para partidos que no registra el organizador.
- Límite de partidos "competitivos" que un mismo par de jugadores puede registrar entre sí en una ventana de tiempo corta (evita inflar rating jugando repetidamente contra el mismo rival débil) — **no aplica en MVP** porque solo hay partidos de torneo, donde el propio formato del torneo ya limita esto. Se activa cuando entren `COMPETITIVE`/`CASUAL` en v2.
- Todo cambio de resultado post-confirmación pasa por `AuditLog` y dispara recalculo de rating (ver `05_RATING_ENGINE.md` §8).

---

## 5. Relación con Court/Scheduling

`Match.court_id` y `scheduled_start/end` son responsabilidad del Tournament Engine al generar el calendario (no del Match Engine), pero el Match Engine valida que no haya dos `Match` `IN_PROGRESS` simultáneos en la misma pista del mismo club — conflicto que se marca como advertencia al organizador, no como bloqueo duro (puede haber overrides legítimos por retrasos).

---

## 6. Estados de Match

```
SCHEDULED → IN_PROGRESS → PENDING_CONFIRMATION → CONFIRMED
                 │                  │
                 ▼                  ▼
             CANCELLED          DISPUTED → (resuelto por admin) → CONFIRMED | CANCELLED
```

---

## 7. Matriz de pruebas obligatoria

| Caso | Verificación |
|---|---|
| Resultado válido por formato de scoring del torneo | Se acepta |
| Resultado con set en empate sin tie-break | Rechazado |
| Ganador inconsistente con sets registrados | Rechazado |
| Confirmación parcial (2 de 4 jugadores) | Permanece `PENDING_CONFIRMATION` |
| Resultados distintos entre jugadores | `DISPUTED`, requiere admin |
| Organizador registra directamente | `CONFIRMED` sin pasar por confirmación de jugadores |
| Dos partidos simultáneos en la misma pista | Advertencia, no bloqueo |
