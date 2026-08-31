import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { belongsOnClubSurface } from "@/modules/auth/domain/roles";
import { signOutAction } from "@/modules/auth/application/actions";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchManagedMatches } from "@/modules/matches/infrastructure/matchRepository";
import { ClubSidebar } from "@/modules/shell/ui/club-sidebar";
import { HeaderClock } from "@/modules/shell/ui/header-clock";
import { SettingsMenu } from "@/modules/shell/ui/settings-menu";
import { Button } from "@/components/ui/button";
import { DEFAULT_TIME_ZONE, listTimeZones } from "@/lib/timezone";

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!belongsOnClubSurface(context.roles)) redirect("/bienvenida");

  const account = await fetchClubSurfaceAccount(context.userId);
  const liveMatchCount = account ? (await fetchManagedMatches(account)).filter((m) => m.status === "IN_PROGRESS").length : 0;

  return (
    <div className="flex min-h-screen gap-5 bg-background p-5">
      <ClubSidebar
        workspaceName={account?.name ?? "Admin"}
        workspaceSub={account?.city ?? (account?.role ?? "Club")}
        contactName={account?.contactName ?? context.email ?? "Admin"}
        accountRole={account?.role ?? "Club"}
        liveMatchCount={liveMatchCount}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 pb-3">
          <HeaderClock timeZone={account?.timeZone ?? DEFAULT_TIME_ZONE} />
          <span className="text-sm text-muted-foreground">{context.email}</span>
          <SettingsMenu currentTimeZone={account?.timeZone ?? DEFAULT_TIME_ZONE} timeZones={listTimeZones()} />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1">{children}</main>
      </div>
    </div>
  );
}
