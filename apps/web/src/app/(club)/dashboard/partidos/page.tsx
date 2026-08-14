import type { Metadata } from "next";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Partidos — Padel Platform" };

export default function ClubMatchesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
      <EmptyState
        icon={CalendarBlank}
        title="El Match Engine llega en la siguiente fase"
        description="Programación, pistas y confirmación de resultados aparecen aquí una vez creado un torneo."
      />
    </div>
  );
}
