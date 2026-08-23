import type { Metadata } from "next";
import { LoginForm } from "@/modules/auth/ui/login-form";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Iniciar sesión — Padel Platform" };

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invite_expired:
    "El link de invitación venció o ya se usó. Pedile al admin que te reenvíe una invitación nueva.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; authError?: string }>;
}) {
  const { next, authError } = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
        <p className="text-sm text-muted-foreground">Entra a tu cuenta de Padel Platform.</p>
      </div>
      {authError && AUTH_ERROR_MESSAGES[authError] && <Alert tone="error">{AUTH_ERROR_MESSAGES[authError]}</Alert>}
      <LoginForm next={next} />
    </div>
  );
}
