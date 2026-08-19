"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { X } from "@phosphor-icons/react";
import {
  addSponsorAction,
  removeSponsorAction,
  type WizardActionState,
} from "../../application/wizardActions";
import type { SponsorRow } from "../../infrastructure/tournamentRepository";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: WizardActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} size="sm">
      Añadir patrocinador
    </Button>
  );
}

function SponsorRowItem({ tournamentId, sponsor }: { tournamentId: string; sponsor: SponsorRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sponsor.logoUrl} alt="" className="size-8 rounded object-cover" />
      <span className="flex-1 text-sm font-medium">{sponsor.name}</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            void removeSponsorAction(tournamentId, sponsor.id);
          })
        }
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-secondary hover:text-destructive disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function StepSponsors({
  tournamentId,
  sponsors,
}: {
  tournamentId: string;
  sponsors: SponsorRow[];
}) {
  const action = addSponsorAction.bind(null, tournamentId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Patrocinadores</h2>
        <p className="text-sm text-muted-foreground">
          Sus logos se usan en el Composer de contenido y en el cuadro del torneo.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        {sponsors.length > 0 && (
          <div className="flex flex-col gap-2">
            {sponsors.map((sponsor) => (
              <SponsorRowItem key={sponsor.id} tournamentId={tournamentId} sponsor={sponsor} />
            ))}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Field id="sponsor-name" label="Nombre" optional>
              <Input id="sponsor-name" name="name" placeholder="Nombre del patrocinador" />
            </Field>
            <SubmitButton />
          </div>
          <Field id="sponsor-logo" label="Logo" optional>
            <input
              id="sponsor-logo"
              name="logo"
              type="file"
              accept="image/*"
              className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </Field>
        </form>
      </Card>
    </div>
  );
}
