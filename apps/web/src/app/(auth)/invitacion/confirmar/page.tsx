import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfirmInviteForm } from "@/modules/invites/ui/confirm-invite-form";

export const metadata: Metadata = { title: "Aceptar invitación — Padel Platform" };

export default async function ConfirmarInvitacionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const { code, next } = await searchParams;
  if (!code) redirect("/login?authError=invite_expired");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Aceptar invitación</h1>
        <p className="text-sm text-muted-foreground">
          Tocá el botón para activar tu cuenta — este paso confirma que sos vos quien abrió el correo, no un
          escáner automático.
        </p>
      </div>
      <ConfirmInviteForm code={code} next={next ?? "/invitacion"} />
    </div>
  );
}
