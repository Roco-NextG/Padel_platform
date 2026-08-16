import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { getTournamentDetail } from "@/modules/tournaments/application/getTournaments";
import { getBracketView } from "@/modules/tournaments/application/getBracket";
import { getGroupStandingsForCategory } from "@/modules/tournaments/application/getGroupStandings";
import type { CategorySummary } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { GenerateBracketButton } from "@/modules/tournaments/ui/generate-bracket-button";
import { FormGroupsButton } from "@/modules/tournaments/ui/form-groups-button";
import { GroupStandingsTable } from "@/modules/tournaments/ui/group-standings-table";
import { BracketView } from "@/modules/tournaments/ui/bracket-view";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Torneo — Padel Platform" };

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const detail = await getTournamentDetail(tournamentId);
  if (!detail) notFound();

  const { tournament, categories } = detail;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          {tournament.description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{tournament.description}</p>
          )}
        </div>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="Este torneo todavía no tiene categorías"
          description="Las categorías (con sus equipos inscritos) se cargan directamente en la base de datos por ahora."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {categories.map((category) => (
            <CategorySection key={category.id} tournamentId={tournamentId} categoryId={category.id} category={category} />
          ))}
        </div>
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{category.name}</h2>
          <p className="text-sm text-muted-foreground">
            {category.level ? `${category.level} · ` : ""}
            {category.teamCount} {category.teamCount === 1 ? "equipo inscrito" : "equipos inscritos"}
            {category.usesGroupStage ? " · Fase de grupos" : ""}
          </p>
        </div>
      </div>

      {category.hasBracket ? (
        <div className="flex flex-col gap-6">
          {groupStandings.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Ver clasificación de grupos
              </summary>
              <div className="mt-3 flex flex-col gap-6">
                {groupStandings.map((g) => (
                  <GroupStandingsTable key={g.groupId} group={g} />
                ))}
              </div>
            </details>
          )}
          <BracketView rounds={rounds} />
        </div>
      ) : category.usesGroupStage ? (
        <GroupStageSection tournamentId={tournamentId} categoryId={categoryId} category={category} groupStandings={groupStandings} />
      ) : (
        <DirectBracketSection tournamentId={tournamentId} categoryId={categoryId} category={category} />
      )}
    </section>
  );
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
      <div className="flex flex-col gap-6">
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
