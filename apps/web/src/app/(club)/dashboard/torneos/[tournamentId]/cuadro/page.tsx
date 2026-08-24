import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { fetchCategories } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchGroupStandings, fetchBracketView } from "@/modules/tournaments/infrastructure/bracketRepository";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { GroupStandings } from "@/modules/tournaments/ui/group-standings";
import { BracketView } from "@/modules/tournaments/ui/bracket-view";
import { GenerateBracketButton, GenerateGroupStageButton } from "@/modules/tournaments/ui/bracket-generation-controls";
import { categoryName } from "@/modules/tournaments/domain/category";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Cuadro — Padel Platform" };

export default async function CuadroPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);
  if (!tournament) notFound();

  const categories = await fetchCategories(tournamentId);
  const sections = await Promise.all(
    categories.map(async (category) => ({
      category,
      groups: category.usesGroupStage ? await fetchGroupStandings(category.id) : [],
      bracket: await fetchBracketView(category.id),
    }))
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tournament.clubName} ·{" "}
            <Link href={`/dashboard/torneos/${tournamentId}/editar`} className="text-accent-text hover:underline">
              Editar torneo
            </Link>
          </p>
        </div>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      {sections.length === 0 && (
        <EmptyState icon={Trophy} title="Sin categorías todavía" description="Agregá al menos una categoría desde Editar torneo." />
      )}

      {sections.map(({ category, groups, bracket }) => (
        <div key={category.id} className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {categoryName(Number(category.level), category.genderRestriction as "MALE" | "FEMALE" | "MIXED")}
          </h2>

          {category.usesGroupStage && groups.length === 0 && bracket.length === 0 && (
            <Card>
              <GenerateGroupStageButton tournamentId={tournamentId} categoryId={category.id} />
            </Card>
          )}

          {groups.length > 0 && <GroupStandings groups={groups} />}

          {bracket.length === 0 && (groups.length > 0 || !category.usesGroupStage) && (
            <Card>
              <GenerateBracketButton tournamentId={tournamentId} categoryId={category.id} />
            </Card>
          )}

          {bracket.length > 0 && <BracketView rounds={bracket} />}
        </div>
      ))}
    </div>
  );
}
