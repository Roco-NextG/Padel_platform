import { confidenceLabel } from "@padel-platform/rating-engine";
import { Badge } from "@/components/ui/badge";

const confidenceTone = {
  Baja: "warning",
  Alta: "success",
} as const;

export function RatingBadge({
  rating,
  rd,
}: {
  rating: number | null;
  rd: number | null;
}) {
  if (rating == null || rd == null) {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-display text-5xl font-semibold tracking-tight text-muted-foreground">
          —
        </span>
        <p className="text-sm text-muted-foreground">Aún sin rating. Juega tu primer torneo.</p>
      </div>
    );
  }

  const confidence = confidenceLabel(rd);

  return (
    <div className="flex items-end gap-3">
      <span className="font-display text-6xl leading-none font-semibold tracking-tight text-foreground">
        {rating.toFixed(1)}
      </span>
      <Badge tone={confidenceTone[confidence]} className="mb-1.5">
        Confianza: {confidence}
      </Badge>
    </div>
  );
}
