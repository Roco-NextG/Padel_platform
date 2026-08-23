import { Badge } from "@/components/ui/badge";
import { tournamentStatusLabel, type TournamentStatus } from "../domain/tournament";

const TONE: Record<TournamentStatus, "neutral" | "accent" | "success" | "warning" | "destructive"> = {
  DRAFT: "neutral",
  PUBLISHED: "accent",
  REGISTRATION_OPEN: "accent",
  REGISTRATION_CLOSED: "warning",
  IN_PROGRESS: "accent",
  FINISHED: "success",
  CANCELLED: "destructive",
  ARCHIVED: "neutral",
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  return <Badge tone={TONE[status]}>{tournamentStatusLabel(status)}</Badge>;
}
