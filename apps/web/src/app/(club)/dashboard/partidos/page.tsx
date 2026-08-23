import type { Metadata } from "next";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Partidos — Padel Platform" };

export default function PartidosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
        <p className="text-sm text-muted-foreground">En vivo y planificación de horarios.</p>
      </div>
      <EmptyState
        icon={CalendarBlank}
        title="En construcción"
        description="La vista en vivo y la planificación de partidos llegan en la próxima etapa, una vez que puedas generar el cuadro de un torneo."
      />
    </div>
  );
}
