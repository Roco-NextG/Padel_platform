import type { SponsorRow } from "../infrastructure/tournamentRepository";

/** Junto a la fecha del torneo, sutil (padel-platform.html: .tourn-sponsors) — logos reales de Sponsor, subidos en el paso 2 de Crear Torneo. */
export function SponsorStrip({ sponsors }: { sponsors: SponsorRow[] }) {
  if (sponsors.length === 0) return null;

  return (
    <div className="flex items-center gap-1 opacity-70" title="Patrocinadores del torneo">
      {sponsors.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.id}
          src={s.logoUrl}
          alt={s.name}
          className="size-4 rounded-full border border-border bg-surface-secondary object-cover"
        />
      ))}
    </div>
  );
}
