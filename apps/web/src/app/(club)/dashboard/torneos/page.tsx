import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getTournamentCards } from "@/modules/tournaments/application/getTournaments";
import { TournamentCard } from "@/modules/tournaments/ui/tournament-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mis torneos — Padel Platform" };

export default async function ClubTournamentsPage() {
  const tournaments = await getTournamentCards();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Mis torneos</h1>
        <Link href="/dashboard/torneos/nuevo">
          <Button>
            <Plus className="size-4" weight="bold" />
            Nuevo torneo
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}

        <Link href="/dashboard/torneos/nuevo" className="block">
          <Card
            dashed
            interactive
            className="flex min-h-[170px] flex-col items-center justify-center gap-2 text-sm font-medium text-foreground-tertiary"
          >
            <Plus className="size-6" />
            Nuevo torneo
          </Card>
        </Link>
      </div>
    </div>
  );
}
