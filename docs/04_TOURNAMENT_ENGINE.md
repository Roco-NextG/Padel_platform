# Documento 4 — Tournament Engine Specification
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Responsabilidad del motor

Dado un conjunto de `Team` inscritos en una `TournamentCategory`, el Tournament Engine:

1. Distribuye equipos en grupos (si el formato usa fase de grupos).
2. Genera los partidos de la fase de grupos (todos contra todos).
3. Calcula la clasificación de cada grupo con el orden de desempate confirmado.
4. Genera el bracket de eliminación con seeding balanceado.
5. Avanza automáticamente el bracket cuando un partido se confirma.
6. En todo momento, permite override manual del organizador (drag & drop) sobre cualquier propuesta automática, antes de que se confirme.

**Principio no negociable:** el motor **propone**, nunca **decide sin revisión**. Toda salida automática (grupos, seeds, bracket) queda en estado editable hasta que el organizador confirma explícitamente.

---

## 2. Formación de grupos

- Entrada: N equipos, tamaño de grupo objetivo (por defecto 4).
- Distribución por defecto: serpentina por seed inicial (si hay cabezas de serie declaradas) para repartir el nivel de forma pareja entre grupos; si no hay seeds previos, aleatorio controlado (semilla determinista para poder reproducir/debuggear).
- Todos los partidos de un grupo de tamaño *g* se generan automáticamente: *g*(*g*-1)/2 partidos.

---

## 3. Clasificación de grupo — orden de desempate (confirmado)

Criterio de agrupación primario: **partidos ganados**. Entre equipos empatados en partidos ganados, se aplica en orden:

1. **Juegos ganados** (total de games ganados en el grupo)
2. **Diferencia de sets**
3. **Diferencia de games**
4. **Enfrentamiento directo** (resultado del partido entre los equipos empatados)

Si tras estos 4 criterios sigue habiendo empate exacto, el organizador resuelve manualmente (sorteo/decisión registrada en `AuditLog`).

> **Supuesto que dejo explícito:** interpreto que "partidos ganados" sigue siendo el criterio de agrupación antes de estos 4 desempates (es el estándar en todo deporte por grupos — sin esto, un equipo con 3 victorias y pocos games podría quedar detrás de uno con 1 victoria y muchos games, lo cual no tendría sentido deportivo). Si tu intención era que estos 4 criterios reemplacen a "partidos ganados" como criterio principal, dímelo y lo ajusto.

Configuración almacenada en `Tournament.tiebreak_rules` (JSONB) — no editable desde UI en MVP, pero no hardcodeada en el motor.

---

## 4. Seeding balanceado

El seeding **no** es simplemente ordenar por posición de grupo (A1, B1, C1, D1...). El algoritmo pondera:

- Posición final en el grupo (1º, 2º...)
- Partidos ganados y diferencia de sets/games acumulada en el grupo (como proxy de fortaleza relativa, no solo la posición)
- Grupo de origen (para poder aplicar la regla de separación, sección 5)

Salida: una lista ordenada de "fortaleza estimada" que alimenta la construcción del bracket. El organizador puede reordenar manualmente antes de confirmar.

---

## 5. Regla de separación de grupo de origen

**Objetivo:** dos equipos que vinieron del mismo grupo no deberían enfrentarse antes de la final, siempre que la estructura matemática del bracket lo permita.

**Implementación:** al colocar equipos en el bracket, el algoritmo evita asignar a la misma mitad (o cuarto, o octavo, según la ronda en la que matemáticamente podrían cruzarse) a dos equipos marcados con el mismo `group_id` de origen, priorizando esta restricción sobre el orden estricto de seed cuando ambas cosas entran en conflicto. Si con N grupos y M plazas de bracket la separación total es imposible (caso de pocos grupos con muchos clasificados), el motor documenta qué pares no pudo separar y se lo muestra al organizador — no falla silenciosamente.

---

## 6. Bracket con soporte para cualquier tamaño (byes)

**Decisión confirmada:** el motor se construye desde el inicio para **cualquier número de equipos**, no solo potencias de 2.

Algoritmo:
1. Calcular `bracket_size = siguiente_potencia_de_2(N)`.
2. `byes = bracket_size - N`.
3. Los `byes` se asignan a los equipos mejor posicionados según el seeding (pasan directo a la siguiente ronda), distribuidos para no concentrar todos los byes en la misma mitad del cuadro.
4. A partir de ahí, el bracket se genera igual que en el caso de potencia de 2 exacta.

**Validación y testing inicial (según decisión confirmada):** los casos de prueba obligatorios para el lanzamiento son **8, 16 y 32** equipos exactos (sin bye). Los casos con bye (ej. 12, 20, 24) se implementan con el mismo algoritmo pero se marcan como **validación extendida**, no bloqueante para el primer release — así no se retrasa el MVP por un caso que no es el más común al lanzar, pero tampoco hay que reescribir el motor cuando aparezca.

---

## 7. Flujo AUTO + MANUAL

```
GENERAR CUADRO
      ↓
Sistema propone: grupos → partidos → clasificación → seeding → bracket
      ↓
Organizador revisa (vista completa, editable)
      ↓
Drag & drop: mover pareja, mover partido, mover horario, mover pista, reordenar bracket
      ↓
CONFIRMAR
      ↓
Estado pasa a definitivo; cambios posteriores quedan auditados (AuditLog)
```

Ninguna acción de "generar" es destructiva: siempre se puede regenerar la propuesta sin perder inscripciones ni resultados ya confirmados.

---

## 8. Actualización automática de fases

Cuando un `Match` pasa a `CONFIRMED`:
- Si es de fase de grupos: se recalcula la clasificación del grupo afectado.
- Si es de bracket: se genera automáticamente el/los `Match` de la siguiente ronda para ese cruce, dejando `team_a`/`team_b` pendiente hasta que ambos lados del cruce estén confirmados.
- Se dispara el evento `MatchConfirmed` (consumido por Rating Engine y Content Engine).

---

## 9. Matriz de pruebas obligatorias

| Escenario | Verificación |
|---|---|
| 4, 8, 12(bye), 16, 24(bye), 32 parejas | Bracket válido, sin equipo contra sí mismo, sin partido con dos ganadores |
| Grupos con clasificación empatada en los 4 criterios | Requiere resolución manual, queda registrado |
| Separación de grupo de origen posible | Se cumple |
| Separación de grupo de origen imposible (pocos grupos) | Se documenta el conflicto, no falla |
| Resultado inválido (score no cumple reglas de scoring) | Rechazado antes de confirmar |
| Edición manual tras propuesta automática | Se respeta y no se sobreescribe al regenerar |
