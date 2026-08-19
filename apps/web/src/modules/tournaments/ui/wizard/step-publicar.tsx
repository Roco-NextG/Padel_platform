"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Rocket } from "@phosphor-icons/react";
import { publishTournamentAction, type WizardActionState } from "../../application/wizardActions";
import type { WizardData } from "../../application/getWizardData";
import { GENDER_RESTRICTION_LABEL, type CategoryGenderRestriction } from "../../domain/enrollment";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: WizardActionState = { error: null, success: false };

function PublishButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={disabled} className="w-full">
      <Rocket className="size-4" />
      Publicar torneo
    </Button>
  );
}

export function StepPublicar({ data }: { data: WizardData }) {
  const action = publishTournamentAction.bind(null, data.tournament.id);
  const [state, formAction] = useActionState(action, initialState);

  const categoriesByGender = new Map<CategoryGenderRestriction, number[]>();
  for (const c of data.categories) {
    const gender = c.genderRestriction as CategoryGenderRestriction;
    const list = categoriesByGender.get(gender) ?? [];
    list.push(c.level);
    categoriesByGender.set(gender, list);
  }

  const canPublish = data.tournament.name.trim().length > 0 && data.categories.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Revisar y publicar</h2>
        <p className="text-sm text-muted-foreground">Así se verá para los jugadores y el resto del club.</p>
      </div>

      <Card className="flex flex-col divide-y divide-border">
        <SummaryRow label="Torneo" value={data.tournament.name || "Sin nombre"} />
        <SummaryRow
          label="Fechas"
          value={
            data.tournament.start_date
              ? `${data.tournament.start_date} → ${data.tournament.end_date ?? "—"}`
              : "Sin fechas todavía"
          }
        />
        <SummaryRow label="Patrocinadores" value={String(data.sponsors.length)} />
        <SummaryRow
          label="Categorías activas"
          value={
            [...categoriesByGender.entries()]
              .map(
                ([gender, levels]) =>
                  `${GENDER_RESTRICTION_LABEL[gender]}: ${levels.sort((a, b) => a - b).join(", ")}`
              )
              .join(" · ") || "Ninguna"
          }
        />
        <SummaryRow
          label="Parejas inscritas"
          value={`${data.teams.length} — ${
            [...new Set(data.teams.map((t) => `${t.categoryLevel}.ª ${GENDER_RESTRICTION_LABEL[t.categoryGenderRestriction as CategoryGenderRestriction]}`))].join(
              " · "
            ) || "sin inscripciones"
          }`}
        />
      </Card>

      {!canPublish && (
        <Alert tone="info">Necesitas un nombre y al menos una categoría activa antes de publicar.</Alert>
      )}

      {data.tournament.is_published ? (
        <Alert tone="success">Este torneo ya está publicado.</Alert>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex items-start gap-3 rounded-lg border border-accent-strong bg-accent-muted p-4">
            <Rocket className="size-5 shrink-0 text-accent-text" />
            <div>
              <p className="text-sm font-medium text-accent-text">Listo para publicar</p>
              <p className="text-xs text-muted-foreground">
                Los jugadores podrán ver el torneo y su cuadro en cuanto lo publiques.
              </p>
            </div>
          </div>
          <PublishButton disabled={!canPublish} />
        </form>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
