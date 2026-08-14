import type { Metadata } from "next";
import { Users } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Jugadores — Padel Platform" };

export default function ClubPlayersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Jugadores</h1>
      <EmptyState
        icon={Users}
        title="Todavía no hay jugadores asociados a tu club"
        description="El listado de miembros del club (club_memberships) se activa cuando jugadores se inscriban a un torneo tuyo."
      />
    </div>
  );
}
