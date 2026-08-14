import type { Metadata } from "next";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getOrganizerForUser } from "@/modules/organizers/application/getOrganizer";
import { OrganizerForm } from "@/modules/organizers/ui/organizer-form";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Organizador — Padel Platform" };

export default async function OrganizerSettingsPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const organizer = await getOrganizerForUser(context.userId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organizador</h1>
        <p className="text-sm text-muted-foreground">
          Tu entidad organizadora — puede gestionar torneos en varios clubes.
        </p>
      </div>
      <OrganizerForm organizer={organizer} />
    </div>
  );
}
