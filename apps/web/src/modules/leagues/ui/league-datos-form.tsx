"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Camera, CircleNotch, PencilSimple, Trophy } from "@phosphor-icons/react";
import { updateLeagueAction, type UpdateLeagueState } from "../application/leagueWizardActions";
import { updateLeagueCoverImageAction, updateLeagueLogoAction } from "../application/leagueBrandingActions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { League } from "../domain/league";

const initialState: UpdateLeagueState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Guardar
    </Button>
  );
}

/** Idéntico a TournamentBanner (tournament-datos-form.tsx), apuntando a las acciones de branding de Liga. */
function LeagueBanner({ league }: { league: League }) {
  const [coverImageUrl, setCoverImageUrl] = useState(league.coverImageUrl);
  const [logoUrl, setLogoUrl] = useState(league.logoUrl);
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
      const result = await updateLeagueCoverImageAction(league.id, formData);
      if (result.error) {
        setError(result.error);
        setCoverImageUrl(league.coverImageUrl);
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
      const result = await updateLeagueLogoAction(league.id, formData);
      if (result.error) {
        setError(result.error);
        setLogoUrl(league.logoUrl);
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
        {/* z-10: sin esto, el div "absolute inset-0" de más abajo (nombre/logo) pinta DESPUÉS
            en el DOM y queda arriba en el stacking pese a que este botón se ve encima — el
            click nunca le llegaba al botón (mismo bug confirmado en tournament-datos-form.tsx). */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => coverInputRef.current?.click()}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm transition-colors hover:bg-surface"
          aria-label="Subir imagen de portada"
        >
          {isPending ? <CircleNotch className="size-4 animate-spin" /> : <Camera className="size-4" />}
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
                  <img src={logoUrl} alt="Logo de la liga" className="size-full object-cover" />
                ) : (
                  <Trophy className="size-6" weight="fill" />
                )}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-inverse text-inverse-foreground"
                aria-label="Subir logo de la liga"
              >
                {isPending ? <CircleNotch className="size-2.5 animate-spin" /> : <PencilSimple className="size-2.5" />}
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
              <span className="text-sm font-medium">{league.name}</span>
              <span className="text-xs text-muted-foreground">{league.clubName}</span>
            </div>
          </div>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

export function LeagueDatosForm({ league }: { league: League }) {
  const action = updateLeagueAction.bind(null, league.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <LeagueBanner league={league} />
      <Card>
        <form action={formAction} className="flex flex-col gap-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.ok && <Alert tone="success">Guardado.</Alert>}

          <Field id="name" label="Nombre de la liga">
            <Input id="name" name="name" defaultValue={league.name} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="startDate" label="Fecha de inicio" optional>
              <Input id="startDate" name="startDate" type="date" defaultValue={league.startDate ?? ""} />
            </Field>
            <Field id="endDate" label="Fecha de fin" optional>
              <Input id="endDate" name="endDate" type="date" defaultValue={league.endDate ?? ""} />
            </Field>
          </div>

          <Field id="description" label="Descripción" optional>
            <Textarea id="description" name="description" rows={3} defaultValue={league.description ?? ""} />
          </Field>

          <div>
            <SaveButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
