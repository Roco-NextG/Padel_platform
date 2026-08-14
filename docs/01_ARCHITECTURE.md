# Documento 1 — Product Architecture
### Plataforma SaaS de Pádel — Tournament, Ranking & Player Network
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Visión resumida

No construimos "un software de torneos". Construimos la **capa de datos, competición e identidad deportiva** sobre la que funciona el pádel amateur y competitivo, empezando por Venezuela con arquitectura preparada para expansión internacional.

El activo estratégico no es la UI ni el generador de cuadros (ambos son copiables). El activo es:

```
DATOS + RED + RATING
```

Miles de jugadores, histórico de partidos, rating individual, clubes y torneos conectados entre sí.

---

## 2. Los tres motores del producto

```
┌───────────────────────────────┐
│       TOURNAMENT ENGINE       │   Groups / Brackets / Seeding
│                                │   Scheduling / Results
└───────────────┬────────────────┘
                 ▼
┌───────────────────────────────┐
│         MATCH ENGINE           │   Tournament matches
│                                │   Competitive / Casual / Open matches
└───────────────┬────────────────┘
                 ▼
┌───────────────────────────────┐
│       PADEL RATING ENGINE      │   Individual rating (no de pareja)
│                                │   Partner performance
│                                │   Opponent strength / Rating history
└───────────────────────────────┘
```

Estos tres motores son el corazón tecnológico. Todo lo demás (contenido, pagos, discovery, notificaciones) es periférico a ellos y depende de que generen datos limpios.

---

## 3. Los dos loops del producto

**Loop del jugador (B2C):**
```
Descubrir torneo → Jugar → Registrar resultado → Actualizar rating
→ Ver estadísticas → Encontrar rivales → Crear partida → Volver a jugar
```

**Loop del organizador/club (B2B):**
```
Crear torneo → Publicar → Captar jugadores → Organizar
→ Registrar resultados → Generar contenido → Generar datos
→ Fidelizar jugadores → Organizar otro torneo
```

Cada torneo jugado alimenta ambos loops simultáneamente. Este es el efecto de red que sostiene el negocio (ver sección 8, moat).

---

## 4. Actores del sistema

| Actor | Es | Puede |
|---|---|---|
| **Player** | Identidad deportiva permanente, independiente del club | Jugar, ver su historial/rating, crear partidas, unirse a torneos |
| **Club** | Entidad propietaria/operadora de instalaciones (pistas) | Gestionar pistas, alojar torneos, tener su propio branding y jugadores asociados |
| **Organizer** | Persona/empresa que crea y gestiona torneos, en uno o varios clubes | Crear y publicar torneos, gestionar inscripciones, cuadros y resultados |
| **Admin** | Super usuario de plataforma | Auditoría, resolución de disputas, gestión global |

**Decisión de diseño clave:** `Club` y `Organizer` son entidades independientes con relación **N:N a través de `Tournament`**. Un torneo tiene un Club (dónde se juega) y un Organizer (quién lo gestiona) — pueden ser la misma persona/entidad o no. Esto no estaba explícito como relación en la sección 62 del brief original; lo hago explícito aquí porque afecta el modelo de permisos y el modelo de datos.

---

## 5. Módulos (Modular Monolith — no microservicios en MVP)

| Módulo | Responsabilidad |
|---|---|
| `auth` | Autenticación, sesiones, roles |
| `users` | Cuentas de usuario (capa técnica, separada de `players`) |
| `players` | Identidad deportiva del jugador |
| `clubs` | Clubes, pistas, branding |
| `organizers` | Organizadores y su relación con clubes/torneos |
| `tournaments` | Ciclo de vida del torneo, categorías, fases |
| `tournament-engine` | Grupos, seeding, brackets, scheduling |
| `matches` | Partidos (de torneo, competitivos, casuales, abiertos) |
| `rating` | Rating individual, historial, eventos de rating |
| `notifications` | In-app, email (v1); push/WhatsApp (v2+) |
| `content` | Composer de contenido para redes sociales |
| `payments` | Stripe (preparado, apagado en MVP) |
| `subscriptions` | Planes de club/organizador (v3) |
| `coins` | Wallet interno (v3) |
| `admin` | Panel de administración global |
| `analytics` | Eventos de producto, KPIs |

Cada módulo tiene límites claros de responsabilidad y su propio conjunto de tablas. No se extraen a microservicios hasta que haya una razón de escala real — hacerlo antes es sobre-ingeniería.

---

## 6. Principios arquitectónicos no negociables

1. **`Player` es una identidad permanente.** Nunca se duplica por participar en distintos clubes o torneos.
2. **`Team` es una entidad competitiva temporal**, no una identidad. No existe una tabla de "parejas fijas"; una pareja habitual es una **vista derivada** calculada sobre el histórico, nunca una entidad almacenada como tal.
3. **`player.rating` nunca se modifica directamente.** Todo cambio pasa por un `RatingEvent` inmutable. El rating actual es una proyección, no la fuente de verdad.
4. **AUTO + MANUAL siempre conviven** en el Tournament Engine: el sistema propone (grupos, seeding, bracket), el organizador confirma o ajusta con drag & drop. Nunca hay una acción irreversible sin paso de revisión humana.
5. **Arquitectura internacionalizable desde el día 1** (país, moneda, timezone, idioma como configuración, nunca hardcodeado), aunque la experiencia inicial esté optimizada 100% para Venezuela.
6. **Todo dato regulatorio/financiero (Coins, Payments, Subscriptions) se modela en el dominio desde ahora**, aunque no se implemente ni se exponga en el MVP — evita migraciones destructivas después.
7. **Auditoría obligatoria** en resultados, ranking, bracket, pagos y jugadores. Nunca se borra historial deportivo sin trazabilidad.

---

## 7. Explícitamente fuera de alcance en MVP

Marketplace · Integración WhatsApp · IA/predicción de resultados · Sponsors marketplace · Coins · Stripe activo · Motor de suscripciones completo · Gamificación avanzada · Live streaming · Video analytics · Red social tradicional · Matchmaking automático.

(Detalle completo de alcance en `08_MVP_SCOPE.md`.)
