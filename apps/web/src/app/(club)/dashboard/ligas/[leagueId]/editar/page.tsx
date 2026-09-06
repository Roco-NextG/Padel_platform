import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLeague } from "@/modules/leagues/application/getLeagues";
import { fetchLeagueCategories } from "@/modules/leagues/infrastructure/leagueRepository";
import { fetchTeamsForLeagueCategory } from "@/modules/leagues/infrastructure/leagueEnrollmentRepository";
import { LeagueCategoryGrid } from "@/modules/leagues/ui/league-category-grid";
import { LeagueEnrollmentPanel } from "@/modules/leagues/ui/league-enrollment-panel";
import { LeaguePublishPanel } from "@/modules/leagues/ui/league-publish-panel";
import { LeagueDatosForm } from "@/modules/leagues/ui/league-datos-form";
import { StepWizard, type WizardStep } from "@/modules/tournaments/ui/wizard-shell";
import { LEAGUE_WIZARD_STEP_LABELS } from "@/modules/leagues/domain/league";
import { categoryName } from "@/modules/tournaments/domain/category";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Editar liga — Padel Platform" };

export default async function EditarLigaPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const league = await getLeague(leagueId);
  if (!league) notFound();

  const categories = await fetchLeagueCategories(leagueId);
  const categoriesWithTeams = await Promise.all(categories.map(async (c) => ({ category: c, teams: await fetchTeamsForLeagueCategory(c.id) })));
  const totalTeams = categoriesWithTeams.reduce((sum, c) => sum + c.teams.length, 0);

  const steps: WizardStep[] = [
    {
      id: "datos",
      done: true,
      content: <LeagueDatosForm league={league} />,
    },
    {
      id: "categorias",
      done: categories.length > 0,
      content: (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Categorías</h2>
            <p className="text-xs text-muted-foreground">Tocá una celda para activarla o desactivarla — nivel de juego × género.</p>
          </div>
          <Card>
            <LeagueCategoryGrid leagueId={leagueId} categories={categories} />
          </Card>
        </div>
      ),
    },
    {
      id: "inscripciones",
      done: totalTeams > 0,
      content: (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Inscripciones</h2>
            <p className="text-xs text-muted-foreground">Buscá jugadores existentes o creá uno nuevo para armar cada pareja.</p>
          </div>
          {categoriesWithTeams.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">Activá al menos una categoría antes de inscribir parejas.</p>
            </Card>
          ) : (
            categoriesWithTeams.map(({ category, teams }) => (
              <Card key={category.id} className="flex flex-col gap-2">
                <LeagueEnrollmentPanel
                  leagueId={leagueId}
                  categoryId={category.id}
                  categoryGender={category.genderRestriction as "MALE" | "FEMALE" | "MIXED"}
                  categoryLabel={categoryName(Number(category.level), category.genderRestriction as "MALE" | "FEMALE" | "MIXED")}
                  teams={teams}
                />
              </Card>
            ))
          )}
        </div>
      ),
    },
    {
      id: "publicar",
      done: league.isPublished,
      content: (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Publicar</h2>
            <p className="text-xs text-muted-foreground">Última etapa — la liga queda lista para generar las jornadas.</p>
          </div>
          <LeaguePublishPanel leagueId={leagueId} isPublished={league.isPublished} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{league.name}</h1>
          <p className="text-sm text-muted-foreground">{league.clubName}</p>
        </div>
        <Badge tone={league.isPublished ? "accent" : "neutral"}>{league.isPublished ? "Publicada" : "Borrador"}</Badge>
      </div>

      <StepWizard steps={steps} stepLabels={LEAGUE_WIZARD_STEP_LABELS} />
    </div>
  );
}
