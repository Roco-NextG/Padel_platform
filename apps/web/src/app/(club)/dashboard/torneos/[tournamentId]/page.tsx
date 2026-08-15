import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { getTournamentDetail } from "@/modules/tournaments/application/getTournaments";
import { getBracketView } from "@/modules/tournaments/application/getBracket";
import { GenerateBracketButton } from "@/modules/tournaments/ui/generate-bracket-button";
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
  category: { name: string; level: string | null; teamCount: number; hasBracket: boolean };
}) {
  const rounds = category.hasBracket ? await getBracketView(categoryId) : [];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{category.name}</h2>
          <p className="text-sm text-muted-foreground">
            {category.level ? `${category.level} · ` : ""}
            {category.teamCount} {category.teamCount === 1 ? "equipo inscrito" : "equipos inscritos"}
          </p>
        </div>
        {!category.hasBracket && category.teamCount >= 2 && (
          <GenerateBracketButton tournamentId={tournamentId} categoryId={categoryId} />
        )}
      </div>

      {category.hasBracket ? (
        <BracketView rounds={rounds} />
      ) : category.teamCount < 2 ? (
        <EmptyState
          icon={UsersThree}
          title="Faltan equipos"
          description="Se necesitan al menos 2 equipos inscritos en esta categoría para generar el cuadro."
        />
      ) : (
        <EmptyState
          icon={UsersThree}
          title="Todavía no se generó el cuadro"
          description="Cuando cierres las inscripciones, generá el cuadro directo de eliminación simple para esta categoría."
        />
      )}
    </section>
  );
}
