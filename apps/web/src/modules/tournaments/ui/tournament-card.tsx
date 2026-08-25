"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Trophy, SquaresFour, UsersThree } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cardStatus, CARD_STATUS_LABELS, type Tournament } from "../domain/tournament";

const CARD_STATUS_TONE = {
  borrador: "neutral",
  configurado: "warning",
  publicado: "accent",
} as const;

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "Sin fechas todavía";
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  return end && end !== start ? `${fmt(start)} - ${fmt(end)}` : fmt(start);
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  // Siempre a /editar por ahora — la vista de cuadro/standings en vivo
  // (/dashboard/torneos/[id]) todavía no existe, llega en la próxima etapa.
  const editPath = `/dashboard/torneos/${tournament.id}/editar`;
  const status = cardStatus(tournament);

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
      <Link href={editPath}>
        <Card interactive className="flex h-full flex-col gap-3 overflow-hidden !p-0">
          <div className="relative h-[76px] shrink-0 bg-inverse bg-[radial-gradient(circle_at_30%_0%,var(--color-accent-muted),transparent_70%)]">
            <Badge tone={CARD_STATUS_TONE[status]} className="absolute right-2.5 top-2.5">
              {CARD_STATUS_LABELS[status]}
            </Badge>
            <Trophy className="absolute bottom-2.5 left-3 size-5 text-inverse-foreground/70" weight="fill" />
          </div>
          <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
            <div className="flex flex-col gap-1">
              <h3 className="truncate font-display text-sm font-semibold tracking-tight">{tournament.name}</h3>
              <p className="text-xs text-muted-foreground">{formatDateRange(tournament.startDate, tournament.endDate)}</p>
            </div>
            <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <SquaresFour className="size-3.5" />
                {tournament.categoryCount} {tournament.categoryCount === 1 ? "categoría" : "categorías"}
              </span>
              <span className="flex items-center gap-1.5">
                <UsersThree className="size-3.5" />
                {tournament.teamCount} {tournament.teamCount === 1 ? "pareja" : "parejas"}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function NewTournamentCard() {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
      <Link href="/dashboard/torneos/nuevo">
        <Card dashed interactive className="flex h-full min-h-[170px] flex-col items-center justify-center gap-2 text-center">
          <Plus className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Nuevo torneo</span>
        </Card>
      </Link>
    </motion.div>
  );
}
