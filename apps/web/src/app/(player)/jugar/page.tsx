import type { Metadata } from "next";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Jugar — Padel Platform" };

export default function PlayPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Jugar</h1>
      <EmptyState
        icon={UsersThree}
        title="Próximamente"
        description="Partidas fuera de torneo (casuales, competitivas, abiertas) llegan en v2 — fuera del MVP."
      />
    </div>
  );
}
