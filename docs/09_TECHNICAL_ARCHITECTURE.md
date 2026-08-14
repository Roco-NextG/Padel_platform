# Documento 9 — Technical Architecture
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Stack propuesto

| Capa | Elección | Justificación |
|---|---|---|
| **Frontend** | Next.js + TypeScript, React | Desktop-first para Club/Admin, mobile-first responsive para Player. Un único framework para ambas experiencias reduce fricción de mantenimiento. |
| **Backend** | Node.js + TypeScript, dentro del **mismo monorepo Next.js** (API routes / route handlers) para el MVP | El brief propone frontend y backend como capas separadas; para el MVP recomiendo **no separarlos como servicios distintos todavía**. Es coherente con el principio de "modular monolith, no microservicios prematuros" (sección 98 del brief) aplicado también a nivel de despliegue: un solo repo, un solo deploy, módulos internos bien separados por carpeta/dominio. Se puede extraer un backend independiente en v3+ si el equipo o la carga lo justifican. |
| **Base de datos** | PostgreSQL vía **Supabase** (decisión confirmada) | Integridad relacional crítica para bracket, rating y auditoría. Supabase da Postgres gestionado + Auth + Storage + Realtime en una sola plataforma, coherente con "no microservicios prematuros". |
| **Cache** | Redis (opcional en MVP) | Supabase Realtime (basado en logical replication de Postgres) cubre gran parte de la necesidad de "estado en vivo" (sección 120) sin añadir Redis desde el día 1. Se evalúa añadir Redis cuando haya carga real que lo justifique. |
| **Object storage** | **Supabase Storage** | Fotos, contenido generado. Nunca binarios en la base de datos (original / thumbnail / optimizado / formatos sociales). |
| **Auth** | **Supabase Auth** (decisión confirmada) | `User.id` de nuestro dominio se mapea 1:1 con `auth.users.id` de Supabase. Evita reconstruir MFA, recuperación de contraseña y sesión desde cero. RBAC (roles de la sección 64) se implementa con Postgres Row Level Security + una tabla `user_roles`, no solo en la capa de aplicación — esto es importante porque Supabase expone la base directamente vía su API, así que la seguridad tiene que vivir en la base, no solo en el backend Next.js. |
| **Payments** | Stripe SDK integrado pero **feature-flag apagado** | El dominio y los webhooks se preparan desde ya (sección 48), no se exponen en UI ni se cobra nada en MVP. |
| **Notifications** | Proveedor de email transaccional | In-app + email en MVP. Push/WhatsApp/SMS quedan como interfaz preparada, sin implementar. |
| **Deployment** | Plataforma cloud gestionada (ej. Vercel para el frontend/Next, base de datos gestionada tipo RDS/Neon/Supabase) | Prioriza velocidad de iteración sobre control de infraestructura en esta etapa. |

---

## 2. Límites de módulos (modular monolith)

Cada módulo listado en `01_ARCHITECTURE.md` §5 vive en su propia carpeta de dominio con:

```
/modules
  /tournament-engine
    domain/        ← lógica pura (seeding, brackets, desempates) — sin dependencias de framework
    application/    ← casos de uso (generar cuadro, confirmar resultado)
    infrastructure/ ← acceso a base de datos, repos
  /rating
  /matches
  /players
  ...
```

**Regla dura:** la lógica del Tournament Engine y del Rating Engine vive en `domain/`, sin dependencias de Next.js, de la base de datos ni de HTTP. Esto es lo que permite testear "12 parejas, 24 parejas, rival fuerte, rival débil" (sección 105-106 del brief) de forma aislada y rápida, y es lo que hace viable extraer estos módulos a un servicio propio más adelante sin reescribirlos.

---

## 3. Internacionalización desde el modelo, no desde el código

`Country`, `Region`, `City`, `Currency`, `Timezone`, `Language` son tablas/configuración desde el día 1, aunque el único valor activo en MVP sea Venezuela/es/VES. Ningún texto, moneda o formato de fecha se hardcodea en componentes.

---

## 4. Testing (prioridad alta desde el MVP)

| Módulo | Casos mínimos |
|---|---|
| **Tournament Engine** | 4, 8, 16, 32 parejas; nunca una pareja contra sí misma; nunca un partido con dos ganadores; separación de parejas del mismo grupo cuando sea matemáticamente posible |
| **Rating Engine** | jugador nuevo (cold start), pareja desigual, rival fuerte/débil, resultado inválido, partido no confirmado |
| **E2E crítico** | flujo completo: crear torneo → inscribir → generar cuadro → registrar resultado → rating actualizado |

---

## 5. Decisión pendiente de este documento

Confirmar proveedor de Auth (afecta modelo de `User` y tiempos de setup) — no es bloqueante para continuar con `03_DATABASE_SCHEMA.md`, se puede decidir en paralelo.
