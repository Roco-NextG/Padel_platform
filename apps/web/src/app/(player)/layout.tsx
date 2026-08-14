import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { BottomNav } from "@/modules/players/ui/bottom-nav";
import { PlayerTopBar } from "@/modules/players/ui/player-top-bar";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PlayerTopBar context={context} />
      <main className="flex-1 px-4 pt-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
