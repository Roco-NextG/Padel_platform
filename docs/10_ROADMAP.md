# Documento 10 — Development Roadmap
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Fases de construcción (orden técnico, sección 104 del brief)

| Fase | Contenido | Depende de |
|---|---|---|
| **1. Architecture** | Ya entregado (`01_ARCHITECTURE.md`) | — |
| **2. Database** | Ya entregado (`03_DATABASE_SCHEMA.md`) | Fase 1 |
| **3. Authentication** | Auth, roles, RBAC | Fase 2 |
| **4. Players / Clubs** | CRUD de Player, Club, Organizer, ClubMembership | Fase 3 |
| **5. Tournament Engine** | Grupos, seeding, bracket, desempate (`04_TOURNAMENT_ENGINE.md`) | Fase 4 |
| **6. Matches** | Registro y confirmación de resultados (`06_MATCH_ENGINE.md`) | Fase 5 |
| **7. Rating Engine** | Glicko-2 adaptado con efecto compañero (`05_RATING_ENGINE.md`) | Fase 6 |
| **8. Player experience** | Home, discovery de solo lectura, perfil (`07_UX_UI_ARCHITECTURE.md`) | Fase 6-7 |
| **9. Content** | Composer básico (subir foto, template de resultado) | Fase 6 |
| **10. Payments** | Fuera del MVP — preparado, no activo | — |

**Nota:** la Fase 8 (experiencia del jugador) no necesita esperar al Rating Engine completo para arrancar en paralelo — el rating puede llegar "en vivo" a una UI ya construida. Recomiendo Fases 7 y 8 en paralelo con equipos distintos si el equipo lo permite, en vez de estrictamente secuencial.

---

## 2. Roadmap de negocio (sección 71 del brief, con hitos de validación)

### 0–3 meses — Núcleo
Auth · Players · Clubs · Tournament · Teams · Groups · Bracket · Matches · Results · Rating (con efecto compañero) · Admin básico.
**Objetivo:** organizar torneos reales de principio a fin dentro de la plataforma, sin Excel/WhatsApp para el bracket.
**Hito de salida:** al menos 1 torneo piloto completo, con resultados confirmados generando `RatingEvent` de forma consistente.

### 3–6 meses — Engagement
Tournament Discovery (guardar/compartir) · Notifications (in-app/email completo) · Content Composer · Branding avanzado · Partidas fuera de torneo (casual/competitive/open).
**Objetivo:** que la app no "muera" cuando termina un torneo — jugadores volviendo a jugar entre torneos.
**Hito de salida:** jugadores recurrentes registrando partidas fuera de torneo.

### 6–12 meses — Monetización
Payments (Stripe) · Coins · Player Premium · Sponsors · Analytics avanzado.
**Objetivo:** primeros ingresos — club SaaS y organizer SaaS antes que player premium (orden confirmado en sección 89 del brief).

### 12–24 meses — Plataforma
AI scheduling/optimización · Marketplace · Matchmaking · Internacionalización activa (Colombia, Panamá, República Dominicana, México como primeros candidatos — sección 96).
**Objetivo:** el producto deja de ser "una app de torneos" y se convierte en infraestructura de competición de pádel.

---

## 3. Prioridad de features (P0–P3, sección 127 del brief)

| Prioridad | Incluye |
|---|---|
| **P0 — Core** | Players, Clubs, Organizers, Tournament, Teams, Matches, Results, Tournament Engine, Rating |
| **P1** | Tournament Discovery, Notifications, Branding, Content, Partidas fuera de torneo |
| **P2** | Payments, Coins, Premium, Sponsors, Analytics |
| **P3** | AI, Marketplace, Matchmaking, Internacionalización activa |

**Filtro de decisión para cualquier feature nueva (sección 128 del brief):** ¿aumenta el número de torneos, jugadores, partidos, la calidad de los datos, la retención, la monetización o el efecto de red? Si la respuesta es no, se cuestiona si debe construirse ahora.

---

## 4. Estrategia de adquisición inicial (secciones 91-93 del brief)

Primeros usuarios: **organizadores de torneos**, no clubes grandes directamente — un organizador trae consigo múltiples torneos, múltiples clubes y cientos de jugadores. Primeros 100 clientes vía migración gratuita de torneos piloto + conversión de organizadores en embajadores.

---

## 5. Documentación pendiente (no bloqueante para empezar a construir)

`04_API_SPEC.md` (contratos de endpoint), `05_AUTH_RBAC.md` (matriz de permisos detallada), `10_NOTIFICATION_SYSTEM.md`, `11_PAYMENT_ARCHITECTURE.md` (activación en v3), `12_ADMIN_PANEL.md`, `14_TEST_PLAN.md` (detalle de test suite), `15_DEPLOYMENT.md`, `16_SECURITY.md`. Se recomiendan generar durante la Fase 3 (Authentication) en adelante, a medida que cada módulo entra en construcción — no todos de golpe ahora, para evitar que la documentación se desactualice antes de escribir código (sección 115 del brief).
