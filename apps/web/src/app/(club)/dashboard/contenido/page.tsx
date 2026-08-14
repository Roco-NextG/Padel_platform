import type { Metadata } from "next";
import { ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Contenido — Padel Platform" };

export default function ClubContentPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Contenido</h1>
      <EmptyState
        icon={ImageSquare}
        title="El Content Composer llega más adelante"
        description="Subir fotos y generar templates de resultado está fuera del alcance de esta fase."
      />
    </div>
  );
}
