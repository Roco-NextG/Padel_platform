import type { Metadata } from "next";
import { ChartBar } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Ranking — Padel Platform" };

export default function ClubRankingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ranking</h1>
      <EmptyState
        icon={ChartBar}
        title="El ranking se activa con los primeros partidos confirmados"
        description="Depende del Rating Engine (Glicko-2 adaptado), próximo en el roadmap."
      />
    </div>
  );
}
