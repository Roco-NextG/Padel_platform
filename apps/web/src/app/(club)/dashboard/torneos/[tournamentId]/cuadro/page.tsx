import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { fetchCategories } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchGroupStandings, fetchBracketView } from "@/modules/tournaments/infrastructure/bracketRepository";
import { fetchMatchesForCategory } from "@/modules/matches/infrastructure/matchRepository";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { PhaseFlow } from "@/modules/tournaments/ui/phase-flow";
import { LiveUpcomingStrip } from "@/modules/tournaments/ui/live-upcoming-strip";
import { GenerateBracketButton, GenerateGroupStageButton } from "@/modules/tournaments/ui/bracket-generation-controls";
import { categoryName } from "@/modules/tournaments/domain/category";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Cuadro — Padel Platform" };

export default async function CuadroPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { tournamentId } = await params;
  const { categoria } = await searchParams;
  const tournament = await getTournament(tournamentId);
  if (!tournament) notFound();

  const categories = await fetchCategories(tournamentId);
  const selected = categories.find((c) => c.id === categoria) ?? categories[0] ?? null;

  const [groups, bracket, matches] = selected
    ? await Promise.all([
        selected.usesGroupStage ? fetchGroupStandings(selected.id) : Promise.resolve([]),
        fetchBracketView(selected.id),
        fetchMatchesForCategory(selected.id),
      ])
    : [[], [], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tournament.clubName} ·{" "}
            <Link href={`/dashboard/torneos/${tournamentId}/editar`} className="text-accent-text hover:underline">
              Editar torneo
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TournamentStatusBadge status={tournament.status} />
          {categories.length > 1 && (
            <div className="flex gap-1 rounded-full border border-border-strong bg-surface p-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/torneos/${tournamentId}/cuadro?categoria=${c.id}`}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    selected?.id === c.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-secondary"
                  )}
                >
                  {categoryName(Number(c.level), c.genderRestriction as "MALE" | "FEMALE" | "MIXED")}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {categories.length === 0 && (
        <EmptyState icon={Trophy} title="Sin categorías todavía" description="Agregá al menos una categoría desde Editar torneo." />
      )}

      {selected && (
        <div className="flex flex-col gap-5">
          <LiveUpcomingStrip matches={matches} />

          {selected.usesGroupStage && groups.length === 0 && bracket.length === 0 && (
            <Card>
              <GenerateGroupStageButton tournamentId={tournamentId} categoryId={selected.id} />
            </Card>
          )}

          {bracket.length === 0 && (groups.length > 0 || !selected.usesGroupStage) && (
            <Card>
              <GenerateBracketButton tournamentId={tournamentId} categoryId={selected.id} />
            </Card>
          )}

          {(groups.length > 0 || bracket.length > 0) && <PhaseFlow groups={groups} bracket={bracket} />}
        </div>
      )}
    </div>
  );
}
