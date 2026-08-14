import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getPlayerProfileForUser } from "@/modules/players/application/getPlayerProfile";
import { signOutAction } from "@/modules/auth/application/actions";
import { PlayerProfileForm } from "@/modules/players/ui/player-profile-form";

export const metadata: Metadata = { title: "Tu perfil — Padel Platform" };

export default async function ProfilePage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const player = await getPlayerProfileForUser(context.userId);
  if (!player) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tu perfil</h1>
        <p className="text-sm text-muted-foreground">{context.email}</p>
      </div>

      <PlayerProfileForm player={player} />

      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border-strong py-3 text-sm font-medium text-destructive"
        >
          <SignOut className="size-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
