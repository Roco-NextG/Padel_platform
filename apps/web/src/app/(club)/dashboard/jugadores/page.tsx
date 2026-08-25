import type { Metadata } from "next";
import { fetchPlayerDirectory, fetchRanking } from "@/modules/players/infrastructure/playerRepository";
import { PlayersView } from "@/modules/players/ui/players-view";

export const metadata: Metadata = { title: "Jugadores — Padel Platform" };

export default async function JugadoresPage() {
  const [ranking, directory] = await Promise.all([fetchRanking(), fetchPlayerDirectory()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jugadores</h1>
        <p className="text-sm text-muted-foreground">Ranking y roster de tu base de jugadores.</p>
      </div>
      <PlayersView ranking={ranking} directory={directory} />
    </div>
  );
}
