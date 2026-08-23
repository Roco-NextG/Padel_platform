import type { Metadata } from "next";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Jugadores — Padel Platform" };

export default function JugadoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jugadores</h1>
        <p className="text-sm text-muted-foreground">Ranking y roster.</p>
      </div>
      <EmptyState
        icon={UsersThree}
        title="En construcción"
        description="El ranking y el roster de jugadores llegan en la próxima etapa."
      />
    </div>
  );
}
