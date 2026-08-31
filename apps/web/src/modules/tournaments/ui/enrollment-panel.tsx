"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserPlus, X, MagnifyingGlass, Users, PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlayerForm } from "@/modules/players/ui/player-form";
import { getPlayerAction, updatePlayerAction } from "@/modules/players/application/playerActions";
import type { VisiblePlayer } from "@/modules/players/domain/player";
import {
  assignCategoryAction,
  createPlayerAction,
  enrollTeamAction,
  removeTeamAction,
  searchPlayersAction,
} from "../application/enrollmentActions";
import type { PlayerSearchResult } from "../domain/enrollment";
import type { TeamWithPlayers } from "../domain/enrollment";
import type { GenderType } from "@/lib/supabase/database.types";

const CATEGORY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function playerLabel(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

function SelectedPlayerChip({
  player,
  tournamentId,
  onRemove,
  onCategoryAssigned,
}: {
  player: PlayerSearchResult;
  tournamentId: string;
  onRemove: () => void;
  onCategoryAssigned: (category: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("");

  function handleAssign() {
    if (!category) return;
    startTransition(async () => {
      const result = await assignCategoryAction(tournamentId, player.playerId, Number(category));
      if (!result.error) onCategoryAssigned(Number(category));
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-2 rounded-md border border-border-strong bg-surface-secondary px-3 py-2"
    >
      <span className="text-sm font-medium text-foreground">{playerLabel(player)}</span>
      {player.category === null ? (
        <div className="flex items-center gap-1.5">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 w-20 text-xs">
            <option value="">Cat.</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" variant="secondary" loading={isPending} disabled={!category} onClick={handleAssign}>
            Asignar
          </Button>
        </div>
      ) : (
        <Badge tone="accent">Cat. {player.category}</Badge>
      )}
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

function AddTeamForm({
  tournamentId,
  categoryId,
  categoryGender,
  onEnrolled,
}: {
  tournamentId: string;
  categoryId: string;
  categoryGender: "MALE" | "FEMALE" | "MIXED";
  onEnrolled: (team: TeamWithPlayers) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [selected, setSelected] = useState<PlayerSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchPlayersAction(tournamentId, query);
        setResults(result.error ? [] : result.results.filter((r) => !selected.some((s) => s.playerId === r.playerId)));
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tournamentId]);

  const visibleResults = query.trim().length < 2 ? [] : results;

  function selectPlayer(p: PlayerSearchResult) {
    if (selected.length >= 2) return;
    setSelected((prev) => [...prev, p]);
    setResults((prev) => prev.filter((r) => r.playerId !== p.playerId));
    setQuery("");
  }

  function updateSelectedCategory(playerId: string, category: number) {
    setSelected((prev) => prev.map((p) => (p.playerId === playerId ? { ...p, category } : p)));
  }

  function handleEnroll() {
    if (selected.length !== 2) return;
    setError(null);
    startTransition(async () => {
      const [a, b] = selected;
      const result = await enrollTeamAction(tournamentId, categoryId, categoryGender, [a.playerId, b.playerId]);
      if (result.error || !result.teamId) {
        setError(result.error ?? "No se pudo inscribir la pareja.");
        return;
      }
      onEnrolled({ teamId: result.teamId, players: [a, b] });
      setSelected([]);
    });
  }

  const canEnroll = selected.length === 2 && selected.every((p) => p.category !== null);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border-strong p-3">
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {selected.map((p) => (
            <SelectedPlayerChip
              key={p.playerId}
              player={p}
              tournamentId={tournamentId}
              onRemove={() => setSelected((prev) => prev.filter((s) => s.playerId !== p.playerId))}
              onCategoryAssigned={(cat) => updateSelectedCategory(p.playerId, cat)}
            />
          ))}
        </AnimatePresence>
      </div>

      {selected.length < 2 && !showCreate && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jugador por nombre o email..."
              className="pl-9"
            />
          </div>
          {visibleResults.length > 0 && (
            <div className="flex flex-col gap-1">
              {visibleResults.map((r) => (
                <button
                  key={r.playerId}
                  type="button"
                  onClick={() => selectPlayer(r)}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-secondary"
                >
                  <span>{playerLabel(r)}</span>
                  <span className="text-xs text-muted-foreground">{r.email ?? "sin cuenta"}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="self-start text-xs font-medium text-accent-text hover:underline"
          >
            + Crear jugador nuevo
          </button>
        </div>
      )}

      {showCreate && selected.length < 2 && (
        <CreatePlayerInlineForm
          tournamentId={tournamentId}
          onCreated={(p) => {
            selectPlayer(p);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="button" size="sm" loading={isPending} disabled={!canEnroll} onClick={handleEnroll} className="self-start">
        Inscribir pareja
      </Button>
    </div>
  );
}

function CreatePlayerInlineForm({
  tournamentId,
  onCreated,
  onCancel,
}: {
  tournamentId: string;
  onCreated: (p: PlayerSearchResult) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<GenderType>("MALE");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && category;

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createPlayerAction(tournamentId, firstName, lastName, gender, Number(category) || 0, phone, email);
      if (result.error || !result.player) {
        setError(result.error ?? "No se pudo crear el jugador.");
        return;
      }
      onCreated(result.player);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-secondary p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field id="firstName" label="Nombre">
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field id="lastName" label="Apellidos">
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field id="email" label="Email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="phone" label="Teléfono">
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field id="category" label="Categoría">
          <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Elegir...</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="gender" label="Género" optional>
          <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value as GenderType)}>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Femenino</option>
            <option value="OTHER">Otro</option>
          </Select>
        </Field>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={isPending} disabled={!canCreate} onClick={handleCreate}>
          Crear y seleccionar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function PlayerEditSlot({
  playerId,
  onUpdated,
  onDone,
}: {
  playerId: string;
  onUpdated: (patch: { firstName: string; lastName: string }) => void;
  onDone: () => void;
}) {
  const [player, setPlayer] = useState<VisiblePlayer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlayerAction(playerId).then((result) => {
      if (cancelled) return;
      if (result.player) setPlayer(result.player);
      else setError(result.error ?? "No se pudo cargar el jugador.");
    });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (!player) return <p className="text-xs text-muted-foreground">Cargando jugador...</p>;

  return (
    <PlayerForm
      action={updatePlayerAction.bind(null, playerId)}
      player={player}
      onSaved={(p) => {
        onUpdated({ firstName: p.firstName, lastName: p.lastName });
        onDone();
      }}
      onCancel={onDone}
    />
  );
}

export function EnrollmentPanel({
  tournamentId,
  categoryId,
  categoryGender,
  teams: initialTeams,
}: {
  tournamentId: string;
  categoryId: string;
  categoryGender: "MALE" | "FEMALE" | "MIXED";
  teams: TeamWithPlayers[];
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  function handleRemove(teamId: string) {
    startTransition(async () => {
      const result = await removeTeamAction(tournamentId, teamId);
      if (!result.error) setTeams((prev) => prev.filter((t) => t.teamId !== teamId));
    });
  }

  function handlePlayerUpdated(playerId: string, patch: { firstName: string; lastName: string }) {
    setTeams((prev) =>
      prev.map((t) => ({ ...t, players: t.players.map((p) => (p.playerId === playerId ? { ...p, ...patch } : p)) }))
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {teams.map((team) => (
          <motion.div
            key={team.teamId}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-foreground">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                {team.players.map((p, i) => (
                  <span key={p.playerId} className="flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground">/</span>}
                    {playerLabel(p)}
                    <button
                      type="button"
                      onClick={() => setEditingPlayerId(p.playerId)}
                      aria-label="Editar jugador"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <PencilSimple className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRemove(team.teamId)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
            {team.players.some((p) => p.playerId === editingPlayerId) && (
              <PlayerEditSlot
                playerId={editingPlayerId!}
                onUpdated={(patch) => handlePlayerUpdated(editingPlayerId!, patch)}
                onDone={() => setEditingPlayerId(null)}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {teams.length === 0 && <p className="text-xs text-muted-foreground">Sin parejas inscritas todavía.</p>}

      {showAdd ? (
        <AddTeamForm
          tournamentId={tournamentId}
          categoryId={categoryId}
          categoryGender={categoryGender}
          onEnrolled={(team) => {
            setTeams((prev) => [...prev, team]);
            setShowAdd(false);
          }}
        />
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowAdd(true)} className="self-start gap-1.5">
          <UserPlus className="size-4" />
          Agregar pareja
        </Button>
      )}
    </div>
  );
}
