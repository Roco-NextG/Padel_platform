import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { belongsOnClubSurface } from "@/modules/auth/domain/roles";
import { signOutAction } from "@/modules/auth/application/actions";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { ClubSidebar } from "@/modules/shell/ui/club-sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!belongsOnClubSurface(context.roles)) redirect("/bienvenida");

  const account = await fetchClubSurfaceAccount(context.userId);

  return (
    <div className="flex min-h-screen bg-background">
      <ClubSidebar accountName={account?.name ?? "Admin"} accountRole={account?.role ?? "Club"} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-border px-6 py-3">
          <span className="text-sm text-muted-foreground">{context.email}</span>
          <ThemeToggle />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
