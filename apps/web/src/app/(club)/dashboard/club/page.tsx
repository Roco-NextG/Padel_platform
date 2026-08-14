import type { Metadata } from "next";
import { LockKey } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getManagedClub } from "@/modules/clubs/application/getManagedClub";
import { canCreateClub } from "@/modules/auth/domain/roles";
import { CreateClubForm } from "@/modules/clubs/ui/create-club-form";
import { ClubBrandingForm } from "@/modules/clubs/ui/club-branding-form";
import { EmptyState } from "@/components/ui/empty-state";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Mi club — Padel Platform" };

export default async function ClubSettingsPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const club = await getManagedClub(context.userId);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi club</h1>
        <p className="text-sm text-muted-foreground">
          Datos y branding del club que administras.
        </p>
      </div>

      {club ? (
        <>
          <div className="rounded-lg border border-border px-5 py-4">
            <p className="text-sm font-medium">{club.name}</p>
            {club.city && <p className="text-sm text-muted-foreground">{club.city}</p>}
          </div>
          <ClubBrandingForm club={club} />
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
