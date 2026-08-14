import type { Metadata } from "next";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export const metadata: Metadata = { title: "Revisa tu email — Padel Platform" };

export default function CheckEmailPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-muted text-accent">
        <EnvelopeSimple className="size-6" weight="fill" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Revisa tu email</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Te enviamos un enlace para confirmar tu cuenta. Ábrelo para poder iniciar sesión.
      </p>
      <Link href="/login" className="text-sm font-medium text-accent hover:underline">
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
