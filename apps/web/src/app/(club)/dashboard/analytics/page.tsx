import type { Metadata } from "next";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Analytics — Padel Platform" };

export default function ClubAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <EmptyState
        icon={ChartLineUp}
        title="Sin datos todavía"
        description="Las métricas de producto (torneos, partidos, retención) aparecen cuando haya actividad real."
      />
    </div>
  );
}
