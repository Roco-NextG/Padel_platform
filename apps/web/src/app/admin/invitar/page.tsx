import type { Metadata } from "next";
import { InviteForm } from "@/modules/admin/ui/invite-form";

export const metadata: Metadata = { title: "Invitar — Admin — Padel Platform" };

export default function AdminInvitarPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invitar</h1>
        <p className="text-sm text-muted-foreground">
          Crea una cuenta nueva de Club u Organizador y envía la invitación por email.
        </p>
      </div>
      <InviteForm />
    </div>
  );
}
