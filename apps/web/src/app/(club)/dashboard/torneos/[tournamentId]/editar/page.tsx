import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { fetchCategories } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchTeamsForCategory } from "@/modules/tournaments/infrastructure/enrollmentRepository";
import { fetchSponsors } from "@/modules/tournaments/infrastructure/sponsorRepository";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { CategoryGrid } from "@/modules/tournaments/ui/category-grid";
import { EnrollmentPanel } from "@/modules/tournaments/ui/enrollment-panel";
import { SponsorsManager } from "@/modules/tournaments/ui/sponsors-manager";
import { PublishPanel } from "@/modules/tournaments/ui/publish-panel";
import { TournamentDatosForm } from "@/modules/tournaments/ui/tournament-datos-form";
import { TournamentWizard, type WizardStep } from "@/modules/tournaments/ui/wizard-shell";
import { categoryName } from "@/modules/tournaments/domain/category";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Editar torneo — Padel Platform" };

export default async function EditarTorneoPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);
  if (!tournament) notFound();

  const categories = await fetchCategories(tournamentId);
  const [categoriesWithTeams, sponsors] = await Promise.all([
    Promise.all(categories.map(async (c) => ({ category: c, teams: await fetchTeamsForCategory(c.id) }))),
    fetchSponsors(tournamentId),
  ]);
  const totalTeams = categoriesWithTeams.reduce((sum, c) => sum + c.teams.length, 0);

  const steps: WizardStep[] = [
    {
      id: "datos",
      done: true,
      content: <TournamentDatosForm tournament={tournament} />,
    },
    {
      id: "patrocinadores",
      done: sponsors.length > 0,
      content: (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Patrocinadores</h2>
            <p className="text-xs text-muted-foreground">Aparecen en el torneo público una vez que lo publiques.</p>
          </div>
          <Card>
            <SponsorsManager tournamentId={tournamentId} sponsors={sponsors} />
          </Card>
        </div>
      ),
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
            <CategoryGrid tournamentId={tournamentId} categories={categories} />
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
                <span className="text-sm font-medium text-foreground">
                  {categoryName(Number(category.level), category.genderRestriction as "MALE" | "FEMALE" | "MIXED")}
                </span>
                <EnrollmentPanel
                  tournamentId={tournamentId}
                  categoryId={category.id}
                  categoryGender={category.genderRestriction as "MALE" | "FEMALE" | "MIXED"}
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
      done: tournament.isPublished,
      content: (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Publicar</h2>
            <p className="text-xs text-muted-foreground">Última etapa del asistente — el torneo queda listo para jugarse.</p>
          </div>
          <PublishPanel tournamentId={tournamentId} isPublished={tournament.isPublished} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tournament.clubName} ·{" "}
            <Link href={`/dashboard/torneos/${tournamentId}/cuadro`} className="text-accent-text hover:underline">
              Ver cuadro
            </Link>
          </p>
        </div>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      <TournamentWizard steps={steps} />
    </div>
  );
}
