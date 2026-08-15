import { Badge } from "@/components/ui/badge";
import type { TournamentStatus } from "@/lib/supabase/database.types";

const STATUS_CONFIG: Record<TournamentStatus, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "destructive" }> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  PUBLISHED: { label: "Publicado", tone: "accent" },
  REGISTRATION_OPEN: { label: "Inscripciones abiertas", tone: "accent" },
  REGISTRATION_CLOSED: { label: "Inscripciones cerradas", tone: "warning" },
  IN_PROGRESS: { label: "En juego", tone: "accent" },
  FINISHED: { label: "Finalizado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "destructive" },
  ARCHIVED: { label: "Archivado", tone: "neutral" },
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
