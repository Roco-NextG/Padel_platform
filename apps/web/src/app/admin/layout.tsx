import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin } from "@/modules/auth/domain/roles";
import { signOutAction } from "@/modules/auth/application/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!isAdmin(context.roles)) redirect("/bienvenida");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <nav className="flex items-center gap-5">
          <span className="font-display text-lg font-semibold tracking-tight">Padel Platform — Admin</span>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Usuarios
          </Link>
          <Link href="/admin/invitar" className="text-sm text-muted-foreground hover:text-foreground">
            Invitar
          </Link>
          <Link href="/admin/invitaciones" className="text-sm text-muted-foreground hover:text-foreground">
            Invitaciones
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{context.email}</span>
          <ThemeToggle />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
