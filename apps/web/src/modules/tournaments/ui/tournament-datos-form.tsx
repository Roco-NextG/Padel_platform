"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Camera, PencilSimple, Trophy } from "@phosphor-icons/react";
import { updateTournamentAction, type UpdateTournamentState } from "../application/wizardActions";
import { updateTournamentCoverImageAction, updateTournamentLogoAction } from "../application/brandingActions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { Tournament } from "../domain/tournament";

const initialState: UpdateTournamentState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Guardar
    </Button>
  );
}

function TournamentBanner({ tournament }: { tournament: Tournament }) {
  const [coverImageUrl, setCoverImageUrl] = useState(tournament.coverImageUrl);
  const [logoUrl, setLogoUrl] = useState(tournament.logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const optimisticUrl = URL.createObjectURL(file);
    setCoverImageUrl(optimisticUrl);
    const formData = new FormData();
    formData.set("cover", file);
    startTransition(async () => {
      const result = await updateTournamentCoverImageAction(tournament.id, formData);
      if (result.error) {
        setError(result.error);
        setCoverImageUrl(tournament.coverImageUrl);
        return;
      }
      setCoverImageUrl(result.url);
    });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const optimisticUrl = URL.createObjectURL(file);
    setLogoUrl(optimisticUrl);
    const formData = new FormData();
    formData.set("logo", file);
    startTransition(async () => {
      const result = await updateTournamentLogoAction(tournament.id, formData);
      if (result.error) {
        setError(result.error);
        setLogoUrl(tournament.logoUrl);
        return;
      }
      setLogoUrl(result.url);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative h-[150px] overflow-hidden rounded-lg bg-surface-secondary bg-[radial-gradient(circle_at_20%_100%,var(--color-accent-muted),transparent_65%)] bg-cover bg-center"
        style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : undefined}
      >
        <button
          type="button"
          disabled={isPending}
          onClick={() => coverInputRef.current?.click()}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm transition-colors hover:bg-surface"
          aria-label="Subir imagen de portada"
        >
          <Camera className="size-4" />
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />

        <div className="absolute inset-0 flex items-end p-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-accent text-accent-foreground shadow-md">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo del torneo" className="size-full object-cover" />
                ) : (
                  <Trophy className="size-6" weight="fill" />
                )}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-inverse text-inverse-foreground"
                aria-label="Subir logo del torneo"
              >
                <PencilSimple className="size-2.5" />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
            <div className="flex flex-col text-foreground">
              <span className="text-sm font-medium">{tournament.name}</span>
              <span className="text-xs text-muted-foreground">{tournament.clubName}</span>
            </div>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function TournamentDatosForm({ tournament }: { tournament: Tournament }) {
  const action = updateTournamentAction.bind(null, tournament.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <TournamentBanner tournament={tournament} />

      <Card>
        <form action={formAction} className="flex flex-col gap-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.ok && <Alert tone="success">Guardado.</Alert>}

          <Field id="name" label="Nombre del torneo">
            <Input id="name" name="name" defaultValue={tournament.name} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="startDate" label="Fecha de inicio" optional>
              <Input id="startDate" name="startDate" type="date" defaultValue={tournament.startDate ?? ""} />
            </Field>
            <Field id="endDate" label="Fecha de fin" optional>
              <Input id="endDate" name="endDate" type="date" defaultValue={tournament.endDate ?? ""} />
            </Field>
          </div>

          <Field id="description" label="Descripción" optional>
            <Textarea id="description" name="description" rows={3} defaultValue={tournament.description ?? ""} />
          </Field>

          <div>
            <SaveButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
