import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Buildings, IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getManagedClub } from "@/modules/clubs/application/getManagedClub";
import { getOrganizerForUser } from "@/modules/organizers/application/getOrganizer";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "en juego", value: 0 },
  { label: "pendientes", value: 0 },
  { label: "pistas libres", value: 0 },
  { label: "próximos", value: 0 },
];

export const metadata: Metadata = { title: "Dashboard — Padel Platform" };

export default async function DashboardPage() {
  const context = await getCurrentUserContext();
  const [club, organizer] = context
    ? await Promise.all([getManagedClub(context.userId), getOrganizerForUser(context.userId)])
    : [null, null];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight">LIVE</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border px-5 py-4">
            <p className="font-display text-4xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {(!club || !organizer) && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Para empezar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {!club && (
              <Link
                href="/dashboard/club"
                className="flex items-start gap-3 rounded-lg border border-border-strong p-4 hover:bg-surface-secondary"
              >
                <Buildings className="size-5 shrink-0 text-accent" weight="duotone" />
                <span>
                  <span className="block text-sm font-medium">Configura tu club</span>
                  <span className="block text-sm text-muted-foreground">
                    Nombre, ciudad y branding.
                  </span>
                </span>
              </Link>
            )}
            {!organizer && (
              <Link
                href="/dashboard/organizador"
                className="flex items-start gap-3 rounded-lg border border-border-strong p-4 hover:bg-surface-secondary"
              >
                <IdentificationCard className="size-5 shrink-0 text-accent" weight="duotone" />
                <span>
                  <span className="block text-sm font-medium">Registra tu organizador</span>
                  <span className="block text-sm text-muted-foreground">
                    Necesario para crear torneos.
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Torneos</h2>
        <EmptyState
          icon={Trophy}
          title="Todavía no creaste ningún torneo"
          description="El módulo de torneos llega en la siguiente fase del producto."
          action={<Badge tone="accent">Próximamente</Badge>}
        />
      </div>
    </div>
  );
}
