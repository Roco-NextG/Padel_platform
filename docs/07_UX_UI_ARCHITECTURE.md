# Documento 7 — UX/UI Architecture
### Plataforma SaaS de Pádel
**Estado:** Borrador para aprobación del fundador · **Fase:** Discovery (pre-código)

---

## 1. Principios visuales

Premium · Visual-first · Moderno · Rápido · Minimalista · Intuitivo. Evitar deliberadamente: formularios interminables, tablas excesivas, interfaces "de gestión antigua", menús complejos (secciones 42, 117 del brief).

**Regla de diseño central (sección 118):** la información más importante se muestra visualmente, no en filas de texto.

No:
```
Match status: Scheduled
Court: 4
Time: 19:30
```

Sí:
```
19:30 · PISTA 4
Carlos / Juan  vs  Pedro / Miguel
● Próximo partido
```

---

## 2. Superficie Club/Organizador — desktop-first

**Sidebar:** Dashboard · Torneos · Partidos · Jugadores · Ranking · Contenido · Sponsors (oculto hasta v3) · Analytics · Configuración.

**Dashboard — principio "qué está pasando ahora mismo" (sección 120):**
```
LIVE
8 partidos en juego · 3 resultados pendientes
2 pistas libres · 1 retraso · 4 partidos próximos
```

**Vista de Torneo — se siente como una app independiente (sección 73):**
Header: nombre, estado, fecha, club. Tabs: Overview · Players · Teams · Groups · Bracket · Matches · Schedule · Ranking · Content.

**Bracket (sección 74) — experiencia visual central:**
- Cards de equipo con nombres y score.
- Interacciones: drag, drop, hover, zoom, filtros, indicador de estado (en juego / confirmado / disputado).
- Debe ser usable en tablet (el organizador in situ trabaja frecuentemente desde tablet — sección 80).

---

## 3. Superficie Jugador — mobile-first

**Bottom navigation:** Inicio · Torneos · Jugar · Ranking · Perfil.

**Home del jugador (sección 76), en este orden de prioridad visual:**
```
Próximo partido (hora, pista, rival)
   ↓
Torneo actual
   ↓
Rating
   ↓
Últimos resultados
   ↓
Torneos cerca
   ↓
Partidas disponibles (v2 — placeholder/CTA "próximamente" en MVP)
```

**Principio mobile (sección 119):** el jugador debe poder abrir la app 30 segundos antes de su partido y entender de inmediato dónde tiene que ir. Criterio de aceptación concreto: desde que abre la app hasta ver "pista + hora + rival", máximo 1 pantalla, 0 taps.

---

## 4. Theming y branding de club

- Modos: Light · Dark · System (sección 78).
- Cada club personaliza logo, color primario/secundario, accent, tipografía (sección 79) — vía **design tokens**, nunca estilos sueltos hardcodeados por pantalla.
- **Regla dura:** el branding del club nunca puede comprometer contraste ni legibilidad. Se implementa con validación automática de contraste mínimo (WCAG AA) al guardar la configuración de branding — si el club sube colores que no cumplen, el sistema ajusta o advierte, no lo aplica ciegamente.

---

## 5. Responsive por actor (sección 80)

| Actor | Dispositivo principal |
|---|---|
| Club / Admin | Desktop |
| Organizador | Tablet (uso in situ durante el torneo) |
| Jugador | Mobile |

El Tournament Engine (generación de bracket, drag & drop) debe ser completamente usable en tablet, no solo "no roto".

---

## 6. Estados de interfaz obligatorios (Definition of Done, sección 116)

Toda pantalla de datos reales necesita: estado de carga, estado vacío (ej. "aún no hay torneos publicados"), estado de error, y estado con datos — diseñados desde el inicio, no como un afterthought.

---

## 7. Fuera de alcance visual en MVP

Pantalla de TV para clubes (sección 122), live scores en tiempo real, templates premium de contenido — quedan para v2+.
