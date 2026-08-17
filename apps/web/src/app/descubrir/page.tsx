import type { Metadata } from "next";
import { DiscoveryList } from "@/modules/discovery/ui/discovery-list";

export const metadata: Metadata = { title: "Descubrí torneos — Padel Platform" };

export default function DescubrirPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Descubrí torneos</h1>
        <p className="text-sm text-muted-foreground">Torneos publicados, ordenados por cercanía.</p>
      </div>
      <DiscoveryList />
    </div>
  );
}
