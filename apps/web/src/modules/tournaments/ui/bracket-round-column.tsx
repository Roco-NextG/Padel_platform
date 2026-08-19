import { BracketMatchCard } from "./bracket-view";
import type { BracketDisplayRound } from "../infrastructure/tournamentRepository";

/** Una ronda, una columna — el layout "una fase por pantalla" del stepper (padel-platform.html: .bracket-col). El árbol completo con conectores sigue viviendo en BracketView. */
export function BracketRoundColumn({ round }: { round: BracketDisplayRound }) {
  return (
    <div className="flex min-h-64 flex-col justify-center gap-5">
      {round.matches.map((match) => (
        <div key={match.matchIndex} className="h-27 w-full max-w-xs">
          <BracketMatchCard match={match} />
        </div>
      ))}
    </div>
  );
}
