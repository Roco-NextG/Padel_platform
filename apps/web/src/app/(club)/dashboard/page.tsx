import type { Metadata } from "next";
import { SquaresFour } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Dashboard — Padel Platform" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Estado general de tus torneos y partidos.</p>
      </div>
      <EmptyState
        icon={SquaresFour}
        title="Todavía no hay nada que resumir acá"
        description="Este panel se arma solo con datos reales de tus torneos y partidos — creá tu primer torneo para empezar."
      />
    </div>
  );
}
