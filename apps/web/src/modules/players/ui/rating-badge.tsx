import { ratingConfidence } from "../domain/player";
import { Badge } from "@/components/ui/badge";

const confidenceTone = {
  Baja: "warning",
  Media: "accent",
  Alta: "success",
} as const;

export function RatingBadge({
  rating,
  rd,
}: {
  rating: number | null;
  rd: number | null;
}) {
  const confidence = ratingConfidence(rd);

  if (rating == null) {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-display text-5xl font-semibold tracking-tight text-muted-foreground">
          —
        </span>
        <p className="text-sm text-muted-foreground">Aún sin rating. Juega tu primer torneo.</p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <span className="font-display text-6xl leading-none font-semibold tracking-tight text-foreground">
        {rating.toFixed(1)}
      </span>
      {confidence && (
        <Badge tone={confidenceTone[confidence]} className="mb-1.5">
          Confianza: {confidence}
        </Badge>
      )}
    </div>
  );
}
