"use client";

import { useMemo, useState, useTransition } from "react";
import { Lock, ShieldCheck, UserPlus, X } from "@phosphor-icons/react";
import { enrollPairAction, removeTeamAction } from "../../application/wizardActions";
import type { EnrolledTeam, WizardCategory } from "../../infrastructure/tournamentRepository";
import {
  categoriesForCertification,
  certifyPair,
  GENDER_RESTRICTION_LABEL,
  type CategoryGenderRestriction,
} from "../../domain/enrollment";
import { PlayerSlot, type ReadyPlayer } from "./player-slot";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function StepInscripciones({
  tournamentId,
  categories,
  teams,
}: {
  tournamentId: string;
  categories: WizardCategory[];
  teams: EnrolledTeam[];
}) {
  const [playerA, setPlayerA] = useState<ReadyPlayer | null>(null);
  const [playerB, setPlayerB] = useState<ReadyPlayer | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("todas");
  const [isPending, startTransition] = useTransition();

  const certification = playerA && playerB ? certifyPair(playerA, playerB) : null;

  const eligibleCategories = useMemo(() => {
    if (!certification) return [];
    const availableCategories: { id: string; level: number; genderRestriction: CategoryGenderRestriction }[] =
      categories.map((c) => ({
        id: c.id,
        level: c.level,
        genderRestriction: c.genderRestriction as CategoryGenderRestriction,
      }));
    return categoriesForCertification(availableCategories, certification);
  }, [categories, certification]);

  // Default a la mejor categoría que la pareja realmente alcanza (nunca la más exigente), igual que el HTML de referencia.
  const effectiveSelectedId = useMemo(() => {
    if (!certification) return null;
    const unlocked = eligibleCategories.filter((c) => !c.locked);
    if (selectedCategoryId && unlocked.some((c) => c.category.id === selectedCategoryId)) {
      return selectedCategoryId;
    }
    return unlocked.at(-1)?.category.id ?? null;
  }, [certification, eligibleCategories, selectedCategoryId]);

  function clearSlots() {
    setPlayerA(null);
    setPlayerB(null);
    setSelectedCategoryId(null);
  }

  function enroll() {
    if (!playerA || !playerB || !effectiveSelectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await enrollPairAction(tournamentId, effectiveSelectedId, playerA.id, playerB.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      clearSlots();
    });
  }

  const filterOptions = useMemo(() => {
    const keys = new Set(teams.map((t) => `${t.categoryLevel}-${t.categoryGenderRestriction}`));
    return Array.from(keys);
  }, [teams]);

  const visibleTeams = filter === "todas" ? teams : teams.filter((t) => `${t.categoryLevel}-${t.categoryGenderRestriction}` === filter);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Inscripción de parejas</h2>
        <p className="text-sm text-muted-foreground">
          Cada pareja queda certificada para jugar en la categoría de su jugador de mayor nivel, o
          categorías superiores — nunca en una inferior.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <PlayerSlot
              label="Jugador 1"
              excludePlayerId={playerB?.id ?? null}
              selected={playerA}
              onSelect={setPlayerA}
              onClear={() => setPlayerA(null)}
            />
            <PlayerSlot
              label="Jugador 2"
              excludePlayerId={playerA?.id ?? null}
              selected={playerB}
              onSelect={setPlayerB}
              onClear={() => setPlayerB(null)}
            />
          </div>

          {certification && (
            <div className="flex items-start gap-3 rounded-md bg-accent-muted p-3">
              <ShieldCheck className="size-5 shrink-0 text-accent-text" />
              <div>
                <p className="text-sm font-medium text-accent-text">
                  Nivel certificado: Categoría {certification.certifiedLevel}{" "}
                  {GENDER_RESTRICTION_LABEL[certification.genderRestriction]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Determinado por {certification.determiningPlayer.firstName} (categoría{" "}
                  {certification.determiningPlayer.category}) — {certification.otherPlayer.firstName} es
                  categoría {certification.otherPlayer.category}
                  {certification.genderRestriction === "MIXED" ? " · Pareja mixta" : ""}
                </p>
              </div>
            </div>
          )}

          {error && <Alert tone="error">{error}</Alert>}

          {certification && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Inscribir en categoría</p>
              {eligibleCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay categorías {GENDER_RESTRICTION_LABEL[certification.genderRestriction].toLowerCase()}s
                  activas en este torneo — actívalas en el paso 3.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {eligibleCategories.map(({ category, locked }) => (
                    <button
                      key={category.id}
                      type="button"
                      disabled={locked}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60",
                        effectiveSelectedId === category.id
                          ? "border-accent-strong bg-accent-muted text-accent-text"
                          : "border-border-strong text-muted-foreground hover:bg-surface-secondary"
                      )}
                    >
                      {locked && <Lock className="size-3" />}
                      {category.level}.ª {GENDER_RESTRICTION_LABEL[category.genderRestriction]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            loading={isPending}
            disabled={!playerA || !playerB || !effectiveSelectedId}
            onClick={enroll}
          >
            <UserPlus className="size-4" />
            Inscribir pareja
          </Button>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Parejas inscritas</h3>
            <span className="text-xs text-muted-foreground">
              {teams.length} pareja{teams.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filterOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilter("todas")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  filter === "todas" ? "bg-accent-muted text-accent-text" : "bg-surface-secondary text-muted-foreground"
                )}
              >
                Todas
              </button>
              {filterOptions.map((key) => {
                const [level, gender] = key.split("-") as [string, CategoryGenderRestriction];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      filter === key ? "bg-accent-muted text-accent-text" : "bg-surface-secondary text-muted-foreground"
                    )}
                  >
                    {level}.ª {GENDER_RESTRICTION_LABEL[gender]}
                  </button>
                );
              })}
            </div>
          )}

          {visibleTeams.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Sin parejas todavía"
              description="Las parejas inscritas van a aparecer acá."
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              {visibleTeams.map((team) => (
                <RosterRow key={team.teamId} tournamentId={tournamentId} team={team} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RosterRow({ tournamentId, team }: { tournamentId: string; team: EnrolledTeam }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2">
      <span className="flex-1 text-sm">
        {team.playerAName} / {team.playerBName}
      </span>
      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted-foreground">
        Cat. {team.categoryLevel} {GENDER_RESTRICTION_LABEL[team.categoryGenderRestriction as CategoryGenderRestriction]}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            void removeTeamAction(tournamentId, team.teamId);
          })
        }
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-secondary hover:text-destructive disabled:opacity-50"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
