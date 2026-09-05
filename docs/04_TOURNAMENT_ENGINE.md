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

Configuración almacenada en `Tournament.tiebreak_rules` (JSONB) — no editable desde UI en MVP, pero no hardcodeada en el motor.

Esta clasificación resuelve **quién es mejor dentro de un mismo grupo**. La sección 4 resuelve el problema distinto de comparar parejas de **grupos diferentes** entre sí, que es lo que hace falta para llenar el bracket.

---

## 4. De la clasificación por grupo a una lista global — y de ahí al bracket

**Corrección confirmada por el fundador:** la versión anterior de esta sección era insuficiente — describía qué factores importan, pero no el procedimiento exacto para (a) construir una única lista ordenada entre *todas* las parejas clasificadas de *todos* los grupos, ni (b) usar esa lista para llenar el cuadro de forma balanceada. Esta versión especifica ambos pasos.

### 4.1 Construir la lista global de fortaleza

Los 4 clasificados de la fase de grupos (o los que corresponda según cuántos avanzan por grupo) se ordenan en **una sola lista**, aplicando los mismos criterios de la sección 3, ahora de forma global en vez de por grupo:

1. Partidos ganados (en su fase de grupos)
2. Juegos ganados (total)
3. Diferencia de sets
4. Diferencia de games

**El criterio 4 de la sección 3 (enfrentamiento directo) no aplica acá** — parejas de grupos distintos nunca jugaron entre sí. Si el empate persiste después de los 3 criterios que sí aplican, se resuelve igual que cualquier empate sin desempate disponible: manualmente, por el organizador, registrado en `AuditLog`.

> **Supuesto que dejo explícito:** si los grupos tienen tamaños distintos entre sí (ej. un grupo de 3 equipos y otro de 4), "partidos ganados" no es directamente comparable — un equipo de un grupo de 3 jugó menos partidos posibles. Si tus grupos son siempre del mismo tamaño (el caso más común), esto no aplica y podés ignorarlo. Si vas a permitir tamaños mixtos, avisame y lo resolvemos normalizando por porcentaje de partidos ganados en vez del total absoluto.

El resultado de este paso es una lista simple: posición 1 a N, de la pareja con mejor récord global a la de peor récord global entre todas las que avanzaron.

### 4.2 Llenar el bracket de forma balanceada (regla 1 — confirmada)

Con esa lista, el bracket se llena con el método de seeding balanceado estándar (el mismo que usa el tenis profesional para sus cuadros), no en el orden literal de la lista:

- **Seed 1** (mejor de la lista global) va a la primera posición del cuadro.
- **Seed 2** va a la posición opuesta — la otra mitad del cuadro. Así, si ambas ganan todo, solo se cruzan en la **final**.
- **Seeds 3 y 4** se colocan cada uno en un cuarto distinto — uno en el cuarto opuesto a seed 1 dentro de su mitad, el otro en el cuarto opuesto a seed 2 dentro de la suya. Así, si todo avanza según el seed, solo llegarían a cruzarse con 1 o 2 en semifinal, nunca antes.
- El patrón se repite recursivamente para seeds 5-8 (octavos), 9-16, etc., duplicando la subdivisión en cada nivel.

Este método por sí solo ya logra el "balance entre parte alta y baja del cuadro" que pediste: los mejores puestos de la lista quedan repartidos matemáticamente lejos entre sí, no amontonados en una mitad.

### 4.3 Separación de grupo de origen (regla 2 — confirmada)

**Después** de la colocación por seed del punto 4.2, se revisa cada mitad del cuadro: si dos parejas marcadas con el mismo `group_id` de origen cayeron en la **misma mitad**, no pueden quedarse así.

**Resolución:** se intercambia la posición de una de las dos parejas en conflicto con la pareja de rango de seed más cercano en la mitad opuesta — el ajuste mínimo necesario para resolver el conflicto sin desordenar el resto del seeding. El resultado neto: dos parejas del mismo grupo de origen solo podrían volver a enfrentarse en la **final**, que es la máxima separación posible dada la estructura del cuadro.

**Si el conflicto no se puede resolver** (por ejemplo, más de la mitad de los clasificados de un `TournamentCategory` salieron del mismo grupo — matemáticamente no entran todos separados en dos mitades), el motor documenta exactamente qué pares no pudo separar y se lo muestra al organizador antes de confirmar. No fallar silenciosamente sigue siendo la regla — ver también sección 9.

**Ejemplo completo (4 grupos de 4 parejas, clasifican los 2 primeros de cada uno → 8 a Cuartos):**

| Cuartos de Final | Mitad del cuadro |
|---|---|
| Cuarto 1: 1º Grupo A vs 2º Grupo B | Mitad superior |
| Cuarto 2: 1º Grupo C vs 2º Grupo D | Mitad superior |
| Cuarto 3: 1º Grupo B vs 2º Grupo C | Mitad inferior |
| Cuarto 4: 1º Grupo D vs 2º Grupo A | Mitad inferior |

El 1º y el 2º de un mismo grupo (ej. 1ºA y 2ºA) quedan en mitades opuestas — cumpliendo la regla 2 — mientras que la colocación de *qué* 1º cruza con *qué* 2º dentro de cada mitad sigue determinada por la lista global de fortaleza del punto 4.1, no por una asignación fija A→B, C→D.

El organizador puede reordenar manualmente (drag & drop) el resultado de todo este proceso antes de confirmar — el motor propone, nunca decide sin revisión.

---

## 5. Bracket con soporte para cualquier tamaño (byes)

**Decisión confirmada:** el motor se construye desde el inicio para **cualquier número de equipos**, no solo potencias de 2.

Algoritmo:
1. Calcular `bracket_size = siguiente_potencia_de_2(N)`.
2. `byes = bracket_size - N`.
3. Los `byes` se asignan a los equipos mejor posicionados según la lista global de la sección 4.1 (pasan directo a la siguiente ronda), distribuidos para no concentrar todos los byes en la misma mitad del cuadro.
4. A partir de ahí, el bracket se genera igual que en el caso de potencia de 2 exacta.

**Validación y testing inicial (según decisión confirmada):** los casos de prueba obligatorios para el lanzamiento son **8, 16 y 32** equipos exactos (sin bye). Los casos con bye (ej. 12, 20, 24) se implementan con el mismo algoritmo pero se marcan como **validación extendida**, no bloqueante para el primer release.

---

## 6. Flujo AUTO + MANUAL

```
GENERAR CUADRO
      ↓
Sistema propone: grupos → partidos → clasificación → lista global → seeding balanceado → separación de grupo → bracket
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

## 7. Actualización automática de fases

Cuando un `Match` pasa a `CONFIRMED`:
- Si es de fase de grupos: se recalcula la clasificación del grupo afectado.
- Si es de bracket: se genera automáticamente el/los `Match` de la siguiente ronda para ese cruce, dejando `team_a`/`team_b` pendiente hasta que ambos lados del cruce estén confirmados.
- Se dispara el evento `MatchConfirmed` (consumido por Rating Engine y Content Engine).

---

## 8. Matriz de pruebas obligatorias

| Escenario | Verificación |
|---|---|
| 4, 8, 12(bye), 16, 24(bye), 32 parejas | Bracket válido, sin equipo contra sí mismo, sin partido con dos ganadores |
| Grupos con clasificación empatada en los 4 criterios | Requiere resolución manual, queda registrado |
| Lista global con empate entre parejas de distinto grupo (sin enfrentamiento directo posible) | Requiere resolución manual, queda registrado |
| Seed 1 y Seed 2 en mitades opuestas | Se cumple siempre que haya al menos 2 clasificados |
| Separación de grupo de origen posible | Se cumple — mismo grupo nunca en la misma mitad |
| Separación de grupo de origen imposible (un grupo aporta más de la mitad de los clasificados) | Se documenta el conflicto, no falla |
| Resultado inválido (score no cumple reglas de scoring) | Rechazado antes de confirmar |
| Edición manual tras propuesta automática | Se respeta y no se sobreescribe al regenerar |
