import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Plus } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchManagedMatches, fetchRecentResults } from "@/modules/matches/infrastructure/matchRepository";
import { fetchMyTournaments } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchClubCourts } from "@/modules/courts/infrastructure/courtRepository";
import { LiveBand, UpcomingMatches, CourtStatusCard, RecentResultsCard } from "@/modules/dashboard/ui/dashboard-sections";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatZonedDate } from "@/lib/timezone";

export const metadata: Metadata = { title: "Dashboard — Padel Platform" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ pistaClub?: string }> }) {
  const { pistaClub } = await searchParams;
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <EmptyState
          icon={Trophy}
          title="Esta cuenta no tiene club u organizador propio"
          description="Iniciá sesión con una cuenta Club u Organizador para ver tu dashboard."
        />
      </div>
    );
  }

  const [matches, tournaments, recentResults] = await Promise.all([
    fetchManagedMatches(account),
    fetchMyTournaments(account),
    fetchRecentResults(account, 3),
  ]);

  // Un Organizador aloja torneos en clubes distintos — a diferencia de una cuenta Club (siempre su propio club), acá hace falta elegir de cuál club mirar el estado de pistas.
  const hostClubs =
    account.role === "Organizador"
      ? [...new Map(tournaments.map((t) => [t.clubId, t.clubName])).entries()].map(([clubId, clubName]) => ({ clubId, clubName }))
      : [];
  const selectedClubId = account.role === "Club" ? account.clubId! : (pistaClub ?? hostClubs[0]?.clubId ?? null);
  const courts = selectedClubId ? await fetchClubCourts(selectedClubId) : [];

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <EmptyState
          icon={Trophy}
          title="Todavía no creaste ningún torneo"
          description="Este panel se arma solo con datos reales de tus torneos y partidos — creá el primero para empezar."
          action={
            <Link href="/dashboard/torneos/nuevo">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Nuevo torneo
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const inProgress = matches.filter((m) => m.status === "IN_PROGRESS");
  const pending = matches.filter((m) => m.status === "PENDING_CONFIRMATION" || m.status === "DISPUTED");
  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const busyCourtIds = new Set(inProgress.map((m) => m.courtId).filter((id): id is string => id !== null));

  const today = formatZonedDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" });
  const firstName = account.contactName.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{account.name}</p>
        </div>
        <Link href="/dashboard/torneos/nuevo">
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Nuevo torneo
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="font-display text-[26px] font-normal tracking-tight text-foreground">
          Hola, <span className="font-medium">{firstName}</span>
        </h2>
        <p className="mt-1 text-[13px] capitalize text-muted-foreground">{today}</p>
      </div>

      <LiveBand inProgress={inProgress.length} pending={pending.length} scheduled={scheduled.length} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_360px]">
        <UpcomingMatches matches={matches} showClubName={account.role === "Organizador"} />
        <div className="flex flex-col gap-4">
          {courts.length > 0 && (
            <CourtStatusCard
              courts={courts}
              busyCourtIds={busyCourtIds}
              clubSelector={
                hostClubs.length > 1 && selectedClubId
                  ? { clubs: hostClubs, selectedClubId, basePath: "/dashboard" }
                  : undefined
              }
            />
          )}
          <RecentResultsCard results={recentResults} />
        </div>
      </div>
    </div>
  );
}
