import type { Metadata } from "next";
import { getPendingInvites } from "@/modules/admin/application/getAdminData";
import { PendingInvitesList } from "@/modules/admin/ui/pending-invites-list";

export const metadata: Metadata = { title: "Invitaciones — Admin — Padel Platform" };

export default async function AdminInvitacionesPage() {
  const invites = await getPendingInvites();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invitaciones</h1>
        <p className="text-sm text-muted-foreground">
          Seguimiento de cada invitación enviada — útil para detectar clubes/organizadores creados sin
          que la invitación llegara a aceptarse.
        </p>
      </div>
      <PendingInvitesList invites={invites} />
    </div>
  );
}
