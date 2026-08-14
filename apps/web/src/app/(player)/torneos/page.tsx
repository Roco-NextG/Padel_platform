import type { Metadata } from "next";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Torneos — Padel Platform" };

export default function TournamentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Torneos</h1>
      <EmptyState
        icon={Trophy}
        title="Todavía no hay torneos publicados"
        description="El listado y la búsqueda de torneos llegan en la siguiente fase del producto."
      />
    </div>
  );
}
