import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "destructive" }> = {
  SCHEDULED: { label: "Programado", tone: "neutral" },
  IN_PROGRESS: { label: "En juego", tone: "accent" },
  PENDING_CONFIRMATION: { label: "Por confirmar", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "success" },
  DISPUTED: { label: "Disputado", tone: "destructive" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

export function MatchStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
