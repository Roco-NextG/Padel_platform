import type { Metadata } from "next";
import { Hammer } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Nuevo torneo — Padel Platform" };

/** Placeholder — el asistente de creación (11_UX_HANDOFF.md §3.6) es el próximo rediseño. */
export default function NewTournamentPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo torneo</h1>
      <EmptyState
        icon={Hammer}
        title="El asistente de creación llega en el próximo rediseño"
        description="Datos, patrocinadores, categorías, inscripciones y publicación — por ahora, los torneos se cargan directamente en la base de datos."
      />
    </div>
  );
}
