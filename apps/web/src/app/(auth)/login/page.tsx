import type { Metadata } from "next";
import { LoginForm } from "@/modules/auth/ui/login-form";

export const metadata: Metadata = { title: "Iniciar sesión — Padel Platform" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">Entra a tu cuenta de Padel Platform.</p>
      </div>
      <LoginForm />
    </div>
  );
}
