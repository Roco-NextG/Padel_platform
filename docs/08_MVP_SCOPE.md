# Documento 8 — MVP Scope
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Objetivo del MVP

Permitir que **organizadores reales gestionen torneos reales de principio a fin dentro de la plataforma**, y que cada partido jugado genere un rating individual verificable. Todo lo demás es secundario hasta validar esto.

**North Star Metric:** `Verified Matches Played` — partidos con resultado confirmado registrado en la plataforma. Es la métrica que conecta datos → rating → engagement → valor de red.

---

## 2. Incluido en MVP (P0)

| Área | Alcance |
|---|---|
| **Auth** | Registro, login, roles (Super Admin, Admin, Club Owner, Club Manager, Organizer, Tournament Staff, Player) |
| **Club** | Crear club, configurar branding básico (logo, color primario/secundario) |
| **Player** | Crear/editar perfil, datos deportivos, perfil público/privado |
| **Organizer** | Entidad independiente, puede gestionar torneos en múltiples clubes |
| **Tournament** | Crear, publicar, inscribir jugadores, crear parejas (teams), estados DRAFT→...→FINISHED |
| **Tournament Engine** | Grupos, clasificación con desempate fijo (ver decisión pendiente #3), bracket, seeding balanceado, actualización automática de fases |
| **Match** | Crear, programar, asignar pista, registrar resultado, flujo de confirmación |
| **Rating** | Rating individual inicial (Elo/Glicko simple — ver decisión pendiente #2), actualización tras partidos oficiales, `RatingEvent` desde el día 1 |
| **Discovery** | Listado y búsqueda de torneos públicos (solo lectura, sin guardar/compartir todavía) |
| **Content** | Versión básica: subir foto, adaptar formato, template de resultado |
| **Admin** | Panel mínimo: usuarios, clubes, torneos, resolución de disputas de resultado |

---

## 3. Explícitamente fuera del MVP

- Partidas fuera de torneo (casuales/abiertas/desafíos) → v2
- Notificaciones push / WhatsApp / SMS → v2+ (in-app y email sí entran)
- Templates premium de contenido, branding avanzado → v2
- Payments (Stripe), Coins, Subscriptions → v3
- Player Premium, Sponsors activos → v3
- IA, matchmaking, marketplace, white label, i18n activa (más allá de arquitectura preparada) → v4

Esto reduce el riesgo de construir infraestructura de monetización antes de validar que organizadores y jugadores usan el producto para lo esencial: organizar, jugar, medir.

---

## 4. Definition of Done (aplica a toda funcionalidad P0)

Una funcionalidad no se considera terminada hasta tener: UI · Backend · Modelo de datos · Validación · Manejo de errores · Permisos (RBAC) · Tests · Estados de carga y vacíos · Responsive mobile · Accesibilidad básica · Audit trail cuando corresponda (resultados, ranking, bracket, jugadores).

---

## 5. Decisiones confirmadas (fundador) para Tournament Engine y Rating Engine en MVP

- **Tamaños de cuadro:** el motor se diseña desde el inicio para soportar **cualquier número de parejas** (bracket con byes, no limitado a potencias de 2), pero el testing y la validación inicial se concentran en 8/16/32 parejas, que son los tamaños reales esperados al lanzar. Ver `04_TOURNAMENT_ENGINE.md`.
- **Desempate de grupo (orden fijo confirmado):** 1) partidos ganados (criterio de agrupación primario) → 2) juegos ganados → 3) diferencia de sets → 4) diferencia de games → 5) enfrentamiento directo. Configurable recién en v2.
- **Rating v1:** Elo/Glicko individual **con efecto del compañero incluido desde el día 1** (no se pospone). Esto amplía el alcance del Rating Engine en el MVP respecto a la propuesta inicial de simplificarlo — ver diseño en `05_RATING_ENGINE.md`.

---

## 6. Criterio de salida del MVP

El MVP se considera validado cuando exista evidencia de:

- Torneos organizados de principio a fin sin salir de la plataforma (sin Excel/WhatsApp para el bracket).
- Jugadores volviendo a inscribirse en un segundo torneo.
- Resultados confirmados generando `RatingEvent` de forma consistente y sin intervención manual del admin.

Esto marca el punto de entrada a v2 (partidas fuera de torneo + discovery social).
