import type { Metadata } from "next";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Contenido — Padel Platform" };

export default function ContenidoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contenido</h1>
        <p className="text-sm text-muted-foreground">Generador de piezas para redes sociales.</p>
      </div>
      <EmptyState
        icon={ImageSquare}
        title="En construcción"
        description="El generador de contenido para resultados de partidos es lo último que se conecta en esta etapa."
      />
    </div>
  );
}
