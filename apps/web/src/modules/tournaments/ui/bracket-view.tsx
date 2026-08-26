import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { type BracketRoundView, type BracketTeamInfo } from "../domain/bracket";

function teamLabel(team: BracketTeamInfo | null): string {
  if (!team) return "Por definir";
  return team.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ");
}

function BracketTeamRow({ team, isWinner, position }: { team: BracketTeamInfo | null; isWinner: boolean; position: "top" | "bottom" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2",
        position === "top" ? "rounded-t-md border-b border-border" : "rounded-b-md",
        isWinner ? "bg-accent-muted" : "bg-surface"
      )}
    >
      {team?.seed ? (
        <span className={cn("w-4 shrink-0 text-[10px]", isWinner ? "text-accent-text/70" : "text-muted-foreground")}>{team.seed}</span>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <Avatar name={teamLabel(team)} className={cn("size-6 text-[9px]", isWinner && "bg-accent text-accent-foreground")} />
      <span className={cn("truncate text-xs", isWinner ? "font-semibold text-accent-text" : "text-muted-foreground")}>
        {teamLabel(team)}
      </span>
    </div>
  );
}

/** Anatomía calcada de .bmatch/.bteam (padel-platform.html): una sola ronda por bloque — el layout de "varias rondas lado a lado" ahora lo arma phase-flow.tsx, una ronda por sección de scroll. */
export function BracketColumn({ round }: { round: BracketRoundView }) {
  return (
    <div className="flex w-[236px] shrink-0 flex-col justify-around gap-5" style={{ minHeight: `${round.matches.length * 84}px` }}>
      {round.matches.map((m) => {
        const isLive = m.status === "IN_PROGRESS";
        const isFinalWinner = round.type === "FINAL" && m.winnerTeamId;
        return (
          <div key={`${round.phaseId}-${m.roundIndex}`} className="flex flex-col gap-3">
            <div className={cn("relative overflow-hidden rounded-md border border-border shadow-sm", isLive && "border-transparent shadow-glow")}>
              {isLive && (
                <span className="absolute -top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full border border-surface bg-accent-muted px-1.5 py-0.5 text-[8.5px] font-bold text-accent-text">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent-strong" />
                  EN VIVO
                </span>
              )}
              <BracketTeamRow team={m.teamA} isWinner={m.winnerTeamId === m.teamA?.teamId} position="top" />
              <BracketTeamRow team={m.teamB} isWinner={m.winnerTeamId === m.teamB?.teamId} position="bottom" />
            </div>
            {isFinalWinner && (
              <div className="flex items-center gap-2 rounded-md bg-inverse px-3 py-2.5 text-xs text-inverse-foreground">
                <Trophy className="size-4 text-accent-strong" weight="fill" />
                <span className="font-medium">Campeón</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
