"use client";

import { useEffect, useState, useTransition } from "react";
import { MagnifyingGlass, UserPlus, X } from "@phosphor-icons/react";
import type { EnrollmentPlayerResult, GenderType } from "@/lib/supabase/database.types";
import {
  assignPlayerCategoryInlineAction,
  createPlayerInlineAction,
  searchPlayersAction,
} from "../../application/wizardActions";
import { CATEGORY_LEVELS } from "../../domain/enrollment";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Alert } from "@/components/ui/alert";

/** Un jugador ya con gender/category — lo único que certifyPair necesita, ver domain/enrollment.ts. */
export interface ReadyPlayer {
  id: string;
  firstName: string;
  lastName: string;
  gender: GenderType;
  category: number;
}

export function PlayerSlot({
  label,
  excludePlayerId,
  selected,
  onSelect,
  onClear,
}: {
  label: string;
  excludePlayerId: string | null;
  selected: ReadyPlayer | null;
  onSelect: (player: ReadyPlayer) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EnrollmentPlayerResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assigningCategoryFor, setAssigningCategoryFor] = useState<EnrollmentPlayerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // El padre limpia `selected` a null después de inscribir (no solo cuando el
  // usuario aprieta la X) — sin esto, un slot que quedó en medio de "crear
  // jugador nuevo" o "asignar categoría" reaparecía con esos datos viejos en
  // vez de volver a la búsqueda limpia.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting this slot's local UI state (search/create/assign-category) back to a clean search box whenever the parent clears `selected` (both the explicit "X" and the post-enroll reset) — a prop-driven reset, not state derived from other state. */
  useEffect(() => {
    if (selected === null) {
      setQuery("");
      setResults([]);
      setShowResults(false);
      setCreating(false);
      setAssigningCategoryFor(null);
      setError(null);
    }
  }, [selected]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleQueryChange(value: string) {
    setQuery(value);
    setError(null);
    if (!value.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    startTransition(async () => {
      const found = await searchPlayersAction(value);
      setResults(found.filter((p) => p.player_id !== excludePlayerId));
      setShowResults(true);
    });
  }

  function pick(player: EnrollmentPlayerResult) {
    if (!player.category) {
      setAssigningCategoryFor(player);
      setShowResults(false);
      return;
    }
    if (!player.gender) {
      setError(
        `${player.first_name} no tiene género declarado — pedile que complete su perfil, o creá un jugador nuevo en su lugar.`
      );
      setShowResults(false);
      return;
    }
    onSelect({
      id: player.player_id,
      firstName: player.first_name,
      lastName: player.last_name,
      gender: player.gender,
      category: player.category,
    });
    setShowResults(false);
    setQuery("");
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-surface-secondary px-3 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium">
            {(selected.firstName[0] ?? "") + (selected.lastName[0] ?? "")}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {selected.firstName} {selected.lastName}
            </p>
            <p className="text-xs text-muted-foreground">Categoría {selected.category}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (assigningCategoryFor) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex flex-col gap-2 rounded-md border border-border-strong p-3">
          <p className="text-sm">
            <span className="font-medium">
              {assigningCategoryFor.first_name} {assigningCategoryFor.last_name}
            </span>{" "}
            todavía no tiene categoría asignada.
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex gap-2">
            <Select
              className="flex-1"
              defaultValue=""
              onChange={(e) => {
                const category = Number(e.target.value);
                if (!category) return;
                setError(null);
                startTransition(async () => {
                  const result = await assignPlayerCategoryInlineAction(
                    assigningCategoryFor.player_id,
                    category
                  );
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  // La búsqueda ya lo hubiera desviado a "sin categoría" si le faltaba
                  // eso, pero gender es un campo aparte y puede faltar igual (jugadores
                  // de antes de esta migración) — nunca certificar con un gender inventado.
                  if (!assigningCategoryFor.gender) {
                    setError(
                      `${assigningCategoryFor.first_name} tampoco tiene género declarado — pedile que complete su perfil, o creá un jugador nuevo en su lugar.`
                    );
                    setAssigningCategoryFor(null);
                    return;
                  }
                  onSelect({
                    id: assigningCategoryFor.player_id,
                    firstName: assigningCategoryFor.first_name,
                    lastName: assigningCategoryFor.last_name,
                    gender: assigningCategoryFor.gender,
                    category: result.category!,
                  });
                  setAssigningCategoryFor(null);
                  setQuery("");
                });
              }}
            >
              <option value="" disabled>
                Asignar categoría
              </option>
              {CATEGORY_LEVELS.map((l) => (
                <option key={l} value={l}>
                  Categoría {l}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAssigningCategoryFor(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (creating) {
    return <CreatePlayerForm label={label} prefillName={query} onCreated={onSelect} onCancel={() => setCreating(false)} />;
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="relative">
        <MagnifyingGlass className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={isPending ? "Buscando..." : "Buscar por nombre o email..."}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {showResults && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-md border border-border-strong bg-surface shadow-lg">
          {results.map((p) => (
            <button
              key={p.player_id}
              type="button"
              onClick={() => pick(p)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-secondary"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-medium">
                {(p.first_name[0] ?? "") + (p.last_name[0] ?? "")}
              </div>
              <span className="flex-1 text-sm">
                {p.first_name} {p.last_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.category ? `Cat. ${p.category}` : "Sin categoría"}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-accent-text hover:bg-surface-secondary"
          >
            <UserPlus className="size-3.5" />
            Crear jugador nuevo{query.trim() ? `: "${query.trim()}"` : ""}
          </button>
        </div>
      )}
    </div>
  );
}

function CreatePlayerForm({
  label,
  prefillName,
  onCreated,
  onCancel,
}: {
  label: string;
  prefillName: string;
  onCreated: (player: ReadyPlayer) => void;
  onCancel: () => void;
}) {
  const [first, ...rest] = prefillName.trim().split(" ");
  const [firstName, setFirstName] = useState(first ?? "");
  const [lastName, setLastName] = useState(rest.join(" "));
  const [gender, setGender] = useState<GenderType>("MALE");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createPlayerInlineAction({
        firstName,
        lastName,
        gender,
        category: Number(category),
      });
      if (result.error || !result.player) {
        setError(result.error ?? "No se pudo crear el jugador.");
        return;
      }
      onCreated({
        id: result.player.player_id,
        firstName: result.player.first_name,
        lastName: result.player.last_name,
        gender: result.player.gender!,
        category: result.player.category!,
      });
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2 rounded-md border border-border-strong p-3">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <ChoiceGroup
          name="gender"
          defaultValue={gender}
          onChange={(value) => setGender(value as GenderType)}
          options={[
            { value: "MALE", label: "Masculino" },
            { value: "FEMALE", label: "Femenino" },
          ]}
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="" disabled>
            Categoría
          </option>
          {CATEGORY_LEVELS.map((l) => (
            <option key={l} value={l}>
              Categoría {l}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            loading={isPending}
            disabled={!firstName.trim() || !category}
            onClick={submit}
          >
            <UserPlus className="size-3.5" />
            Crear y seleccionar
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
