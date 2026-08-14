import type { Metadata } from "next";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Torneos — Padel Platform" };

export default function ClubTournamentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Torneos</h1>
      <EmptyState
        icon={Trophy}
        title="El Tournament Engine llega en la siguiente fase"
        description="Crear, publicar y gestionar torneos (grupos, bracket, resultados) es la próxima entrega del roadmap."
      />
    </div>
  );
}
