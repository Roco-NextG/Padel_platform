import type { Metadata } from "next";
import { SignUpForm } from "@/modules/auth/ui/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta — Padel Platform" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Tu identidad deportiva es permanente: rating, historial y torneos, en un solo perfil.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
