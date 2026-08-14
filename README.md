# Padel Platform

Plataforma SaaS de pádel — Tournament, Ranking & Player Network.

## Estructura

```
docs/                        Documentación de Discovery (fase pre-código)
  01_ARCHITECTURE.md
  02_DOMAIN_MODEL.md
  03_DATABASE_SCHEMA.md
  04_TOURNAMENT_ENGINE.md
  05_RATING_ENGINE.md
  06_MATCH_ENGINE.md
  07_UX_UI_ARCHITECTURE.md
  08_MVP_SCOPE.md
  09_TECHNICAL_ARCHITECTURE.md
  10_ROADMAP.md

packages/
  tournament-engine/         Lógica pura: grupos, standings, seeding, bracket con byes.
                              27 tests, ver packages/tournament-engine/README.md
```

## Stack confirmado

Next.js + TypeScript (monorepo, modular monolith) · Supabase (Postgres + Auth + Storage) ·
ver `docs/09_TECHNICAL_ARCHITECTURE.md` para el detalle completo.

## Próximos pasos (ver docs/10_ROADMAP.md)

Fase 3: Authentication (Supabase Auth + RBAC vía Row Level Security).
