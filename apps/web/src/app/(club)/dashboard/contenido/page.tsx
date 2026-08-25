import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchMyTournaments } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchContentFeed } from "@/modules/content/infrastructure/contentRepository";
import { ContentComposer } from "@/modules/content/ui/content-composer";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Contenido — Padel Platform" };

export default async function ContenidoPage({
  searchParams,
}: {
  searchParams: Promise<{ torneo?: string }>;
}) {
  const { torneo } = await searchParams;
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contenido</h1>
        </div>
        <EmptyState
          icon={ImageSquare}
          title="Esta cuenta no tiene club u organizador propio"
          description="Iniciá sesión con una cuenta Club u Organizador para generar contenido."
        />
      </div>
    );
  }

  const tournaments = await fetchMyTournaments(account);
  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contenido</h1>
          <p className="text-sm text-muted-foreground">Generador de piezas para redes sociales.</p>
        </div>
        <EmptyState
          icon={ImageSquare}
          title="Todavía no tenés torneos"
          description="Creá tu primer torneo para poder generar contenido de sus resultados."
        />
      </div>
    );
  }

  const selectedTournament = tournaments.find((t) => t.id === torneo) ?? tournaments[0];
  const feed = await fetchContentFeed(selectedTournament.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contenido</h1>
          <p className="text-sm text-muted-foreground">{feed.tournamentName}</p>
        </div>
        {tournaments.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/contenido?torneo=${t.id}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  t.id === selectedTournament.id
                    ? "border-accent bg-accent-muted text-accent-text"
                    : "border-border-strong text-muted-foreground hover:bg-surface-secondary"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <ContentComposer feed={feed} />
    </div>
  );
}
