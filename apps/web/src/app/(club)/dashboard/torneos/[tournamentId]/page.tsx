import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { getTournamentDetail } from "@/modules/tournaments/application/getTournaments";
import { getBracketView } from "@/modules/tournaments/application/getBracket";
import { getGroupStandingsForCategory } from "@/modules/tournaments/application/getGroupStandings";
import { getTournamentOverview } from "@/modules/tournaments/application/getTournamentOverview";
import type { CategorySummary } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { GenerateBracketButton } from "@/modules/tournaments/ui/generate-bracket-button";
import { FormGroupsButton } from "@/modules/tournaments/ui/form-groups-button";
import { GroupStandingsTable } from "@/modules/tournaments/ui/group-standings-table";
import { TournamentPhaseFlow } from "@/modules/tournaments/ui/tournament-phase-flow";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { CategorySwitch } from "@/modules/tournaments/ui/category-switch";
import { LiveUpcomingStrip } from "@/modules/tournaments/ui/live-upcoming-strip";
import { SponsorStrip } from "@/modules/tournaments/ui/sponsor-strip";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Torneo — Padel Platform" };

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { tournamentId } = await params;
  const { category: categoryParam } = await searchParams;
  const detail = await getTournamentDetail(tournamentId);
  if (!detail) notFound();

  const { tournament, categories } = detail;
  const selected = categories.find((c) => c.id === categoryParam) ?? categories[0] ?? null;
  const overview = await getTournamentOverview(tournamentId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
            {tournament.description && (
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{tournament.description}</p>
            )}
          </div>
          <TournamentStatusBadge status={tournament.status} />
        </div>
        <SponsorStrip sponsors={overview.sponsors} />
      </div>

      <LiveUpcomingStrip liveMatches={overview.liveMatches} upcomingMatches={overview.upcomingMatches} />

      {categories.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="Este torneo todavía no tiene categorías"
          description="Las categorías (con sus equipos inscritos) se cargan directamente en la base de datos por ahora."
        />
      ) : (
        selected && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.level ? `${selected.level} · ` : ""}
                  {selected.teamCount} {selected.teamCount === 1 ? "equipo inscrito" : "equipos inscritos"}
                  {selected.usesGroupStage ? " · Fase de grupos" : ""}
                </p>
              </div>
              <CategorySwitch categories={categories} selectedId={selected.id} />
            </div>

            {/* key=selected.id: TournamentPhaseFlow's useScrollStepper holds its
                activeStep in local state — sin el key, cambiar de categoría deja
                el mismo componente montado con props nuevas y el paso viejo
                (ej. "Semifinal") se aplica a las fases de la categoría nueva, que
                no tienen por qué coincidir. El key fuerza un remount limpio. */}
            <CategorySection
              key={selected.id}
              tournamentId={tournamentId}
              categoryId={selected.id}
              category={selected}
            />
          </div>
        )
      )}
    </div>
  );
}

async function CategorySection({
  tournamentId,
  categoryId,
  category,
}: {
  tournamentId: string;
  categoryId: string;
  category: CategorySummary;
}) {
  const rounds = category.hasBracket ? await getBracketView(categoryId) : [];
  const groupStandings =
    category.usesGroupStage && category.hasGroups ? await getGroupStandingsForCategory(categoryId) : [];

  if (category.hasBracket) {
    return <TournamentPhaseFlow groupStandings={groupStandings} rounds={rounds} />;
  }
  if (category.usesGroupStage) {
    return (
      <GroupStageSection
        tournamentId={tournamentId}
        categoryId={categoryId}
        category={category}
        groupStandings={groupStandings}
      />
    );
  }
  return <DirectBracketSection tournamentId={tournamentId} categoryId={categoryId} category={category} />;
}

function DirectBracketSection({
  tournamentId,
  categoryId,
  category,
}: {
  tournamentId: string;
  categoryId: string;
  category: CategorySummary;
}) {
  if (category.teamCount < 2) {
    return (
      <EmptyState
        icon={UsersThree}
        title="Faltan equipos"
        description="Se necesitan al menos 2 equipos inscritos en esta categoría para generar el cuadro."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <GenerateBracketButton tournamentId={tournamentId} categoryId={categoryId} />
      <EmptyState
        icon={UsersThree}
        title="Todavía no se generó el cuadro"
        description="Cuando cierres las inscripciones, generá el cuadro directo de eliminación simple para esta categoría."
      />
    </div>
  );
}

function GroupStageSection({
  tournamentId,
  categoryId,
  category,
  groupStandings,
}: {
  tournamentId: string;
  categoryId: string;
  category: CategorySummary;
  groupStandings: Awaited<ReturnType<typeof getGroupStandingsForCategory>>;
}) {
  if (!category.hasGroups) {
    if (category.teamCount < 3) {
      return (
        <EmptyState
          icon={UsersThree}
          title="Faltan equipos"
          description="Se necesitan al menos 3 equipos inscritos en esta categoría para formar grupos."
        />
      );
    }
    return <FormGroupsButton tournamentId={tournamentId} categoryId={categoryId} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {groupStandings.map((g) => (
          <GroupStandingsTable key={g.groupId} group={g} />
        ))}
      </div>
      {category.allGroupMatchesConfirmed ? (
        <GenerateBracketButton tournamentId={tournamentId} categoryId={categoryId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía hay partidos de grupo sin confirmar — el cuadro se puede generar cuando todos estén
          confirmados.
        </p>
      )}
    </div>
  );
}
