import type { Metadata } from "next";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getManagedClub } from "@/modules/clubs/application/getManagedClub";
import { canCreateClub } from "@/modules/auth/domain/roles";
import { CreateClubForm } from "@/modules/clubs/ui/create-club-form";
import { ClubBrandingForm } from "@/modules/clubs/ui/club-branding-form";
import { getClubCourts } from "@/modules/courts/application/getCourts";
import { CourtsManager } from "@/modules/courts/ui/courts-manager";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Mi club — Padel Platform" };

function clubInitials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function ClubSettingsPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const club = await getManagedClub(context.userId);
  const courts = club ? await getClubCourts(club.id) : [];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi club</h1>
        <p className="text-sm text-muted-foreground">
          Datos, branding y pistas del club que administras.
        </p>
      </div>

      {club ? (
        <>
          <div className="flex items-center gap-3.5">
            {club.branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={club.branding.logo_url}
                alt={club.name}
                className="size-14 shrink-0 rounded-2xl border border-border-strong object-cover"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border-strong bg-surface-secondary text-sm font-semibold text-muted-foreground">
                {clubInitials(club.name)}
              </div>
            )}
            <div>
              <p className="text-base font-medium text-foreground">{club.name}</p>
              {club.city && <p className="text-sm text-muted-foreground">{club.city}</p>}
            </div>
          </div>

          <Card>
            <ClubBrandingForm club={club} />
          </Card>

          <CourtsManager courts={courts} />
        </>
      ) : canCreateClub(context.roles) ? (
        <CreateClubForm />
      ) : (
        <EmptyState
          icon={LockKey}
          title="Necesitas el rol de Dueño de Club"
          description="Un administrador de la plataforma tiene que otorgarte el rol de Dueño de Club antes de que puedas crear uno."
        />
      )}
    </div>
  );
}
