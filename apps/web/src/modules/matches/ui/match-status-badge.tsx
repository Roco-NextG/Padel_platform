import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: "neutral" | "accent" | "success" | "warning" | "destructive" | "cancel" }
> = {
  SCHEDULED: { label: "Programado", tone: "neutral" },
  IN_PROGRESS: { label: "En juego", tone: "accent" },
  PENDING_CONFIRMATION: { label: "Por confirmar", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "success" },
  DISPUTED: { label: "Disputado", tone: "destructive" },
  CANCELLED: { label: "Cancelado", tone: "cancel" },
};

/** isPaused es un booleano aparte (0023_match_pause.sql) sobre IN_PROGRESS, no un status nuevo — este componente es el único lugar que lo traduce a un badge "Pausado" visualmente distinto de "En juego". */
export function MatchStatusBadge({ status, isPaused }: { status: string; isPaused?: boolean }) {
  if (isPaused && status === "IN_PROGRESS") {
    return <Badge tone="pause">Pausado</Badge>;
  }
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
