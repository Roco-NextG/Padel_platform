import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTournamentDiscoveryDetail } from "@/modules/discovery/application/getDiscoveryData";

export const metadata: Metadata = { title: "Torneo — Padel Platform" };

function formatEntryFee(fee: number | null, currency: string | null): string {
  if (fee == null) return "Consultar";
  return `${currency ?? "USD"} ${fee.toFixed(2)}`;
}

export default async function DiscoveryTournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const detail = await getTournamentDiscoveryDetail(tournamentId);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/descubrir" className="text-sm text-muted-foreground hover:underline">
        ← Volver
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-secondary">
          {detail.clubLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detail.clubLogoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {detail.clubName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{detail.name}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.clubName}
            {detail.clubCity ? ` · ${detail.clubCity}` : ""}
          </p>
        </div>
      </div>

      {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}

      <div className="flex flex-col gap-2 rounded-lg border border-border-strong p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Fecha</span>
          <span>
            {detail.startDate
              ? new Date(detail.startDate).toLocaleDateString("es-VE", { dateStyle: "long" })
              : "Por definir"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Categorías</span>
          <span className="text-right">
            {detail.categories.length > 0 ? detail.categories.join(" · ") : "Por definir"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Costo de inscripción</span>
          <span>{formatEntryFee(detail.entryFee, detail.entryFeeCurrency)}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Para inscribirte, contactá al club organizador — la inscripción dentro de la app todavía no
        está disponible.
      </p>
    </div>
  );
}
