import { redirect } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { belongsOnClubSurface, isAdmin } from "@/modules/auth/domain/roles";
import { signOutAction } from "@/modules/auth/application/actions";
import { Sidebar } from "@/modules/clubs/ui/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!belongsOnClubSurface(context.roles)) redirect("/");

  return (
    <div className="flex">
      <Sidebar isAdmin={isAdmin(context.roles)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{context.email}</span>
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-secondary hover:text-destructive"
              >
                <SignOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
