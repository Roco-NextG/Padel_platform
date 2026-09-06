import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/modules/leagues/application/getLeagues";
import { fetchLeagueCategories } from "@/modules/leagues/infrastructure/leagueRepository";
import { fetchTeamsForLeagueCategory } from "@/modules/leagues/infrastructure/leagueEnrollmentRepository";
import { fetchLeagueRounds, fetchLeagueStandings } from "@/modules/leagues/infrastructure/leagueStandingsRepository";
import { fetchLeagueMatchesForCategory } from "@/modules/leagues/infrastructure/leagueScheduleRepository";
import { LeagueScreen, type LeagueCategoryData } from "@/modules/leagues/ui/league-screen";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Liga — Padel Platform" };

export default async function LigaPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const league = await getLeague(leagueId);
  if (!league) notFound();

  const categories = await fetchLeagueCategories(leagueId);
  const categoriesData: LeagueCategoryData[] = await Promise.all(
    categories.map(async (category) => {
      const [teams, standings, rounds, matches] = await Promise.all([
        fetchTeamsForLeagueCategory(category.id),
        fetchLeagueStandings(category.id),
        fetchLeagueRounds(category.id),
        fetchLeagueMatchesForCategory(category.id),
      ]);
      return { category, standings, rounds, matches, teamCount: teams.length };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{league.name}</h1>
          <p className="text-sm text-muted-foreground">
            {league.clubName} ·{" "}
            <Link href={`/dashboard/ligas/${leagueId}/editar`} className="text-accent-text hover:underline">
              Editar liga
            </Link>
          </p>
        </div>
        <Badge tone={league.isPublished ? "accent" : "neutral"}>{league.isPublished ? "Publicada" : "Borrador"}</Badge>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={Trophy} title="Sin categorías todavía" description="Agregá al menos una categoría desde Editar liga." />
      ) : (
        <Card>
          <LeagueScreen leagueId={leagueId} categoriesData={categoriesData} />
        </Card>
      )}
    </div>
  );
}
