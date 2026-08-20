import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { SetPasswordForm } from "@/modules/invites/ui/set-password-form";

export const metadata: Metadata = { title: "Activar cuenta — Padel Platform" };

export default async function InvitacionPage() {
  const { user } = await fetchAuthenticatedUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Activa tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Ya tienes acceso — elige una contraseña para {user.email} y empieza.
        </p>
      </div>
      <SetPasswordForm />
    </div>
  );
}
