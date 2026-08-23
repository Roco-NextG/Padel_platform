"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Trophy } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { TournamentStatusBadge } from "./tournament-status-badge";
import type { Tournament } from "../domain/tournament";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Sin fecha";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  return end && end !== start ? `${fmt(start)} - ${fmt(end)}` : fmt(start);
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  // Siempre a /editar por ahora — la vista de cuadro/standings en vivo
  // (/dashboard/torneos/[id]) todavía no existe, llega en la próxima etapa.
  const editPath = `/dashboard/torneos/${tournament.id}/editar`;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
      <Link href={editPath}>
        <Card interactive className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <Trophy className="size-5 text-accent-text" weight="fill" />
            <TournamentStatusBadge status={tournament.status} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="truncate font-display text-base font-semibold tracking-tight">{tournament.name}</h3>
            <p className="text-xs text-muted-foreground">{formatDateRange(tournament.startDate, tournament.endDate)}</p>
          </div>
          <span className="mt-auto text-xs text-muted-foreground">
            {tournament.categoryCount === 0
              ? "Sin categorías todavía"
              : `${tournament.categoryCount} ${tournament.categoryCount === 1 ? "categoría" : "categorías"}`}
          </span>
        </Card>
      </Link>
    </motion.div>
  );
}

export function NewTournamentCard() {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
      <Link href="/dashboard/torneos/nuevo">
        <Card dashed interactive className="flex h-full min-h-32 flex-col items-center justify-center gap-2 text-center">
          <Plus className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Nuevo torneo</span>
        </Card>
      </Link>
    </motion.div>
  );
}
