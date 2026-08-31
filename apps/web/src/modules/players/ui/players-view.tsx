"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { TrendUp, TrendDown, Minus, MagnifyingGlass, Phone, EnvelopeSimple, Trophy, PencilSimple, Plus } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { PlayerForm } from "./player-form";
import { createPlayerStandaloneAction, updatePlayerAction } from "../application/playerActions";
import { confidenceFromRD, playerName, type PlayerRankingItem, type VisiblePlayer } from "../domain/player";

type Tab = "ranking" | "jugadores";

const CONFIDENCE_TONE = { Alta: "accent", Media: "neutral", Baja: "neutral" } as const;

const GENDER_LABEL: Record<string, string> = { MALE: "Masculino", FEMALE: "Femenino", OTHER: "Otro" };

function CategoryFilter({
  categories,
  active,
  onChange,
  layoutId,
}: {
  categories: number[];
  active: number | null;
  onChange: (c: number | null) => void;
  layoutId: string;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-surface-secondary p-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          active === null ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {active === null && (
          <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
        )}
        <span className="relative">Todas</span>
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active === c ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {active === c && (
            <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          )}
          <span className="relative">Cat. {c}</span>
        </button>
      ))}
    </div>
  );
}

function TrendIndicator({ trend, delta }: { trend: PlayerRankingItem["trend"]; delta: number }) {
  if (trend === "flat") return <Minus className="size-3.5 text-muted-foreground" />;
  const Icon = trend === "up" ? TrendUp : TrendDown;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", trend === "up" ? "text-success" : "text-destructive")}>
      <Icon className="size-3.5" weight="bold" />
      {Math.abs(delta).toFixed(2)}
    </span>
  );
}

/** Orden visual del podio: 2º-izquierda, 1º-centro (elevado), 3º-derecha — igual que padel-platform.html. */
const PODIUM_ORDER = ["order-2 sm:order-1", "order-1 sm:order-2", "order-3"];

function RankingTab({ players }: { players: PlayerRankingItem[] }) {
  const [category, setCategory] = useState<number | null>(null);
  const categories = useMemo(
    () => [...new Set(players.map((p) => p.category).filter((c): c is number => c !== null))].sort((a, b) => a - b),
    [players]
  );
  const filtered = category === null ? players : players.filter((p) => p.category === category);
  const podium = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  if (players.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Todavía no hay ranking"
        description="El ranking se arma solo cuando los jugadores de tu roster confirman su primer partido."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryFilter categories={categories} active={category} onChange={setCategory} layoutId="rank-category-active" />
        <span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jugador" : "jugadores"}</span>
      </div>

      {podium.length > 0 && (
        <div className="flex flex-wrap items-end justify-center gap-3">
          {podium.map((p, i) => {
            const first = i === 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 28 }}
                className={cn(
                  "flex w-40 flex-col items-center gap-2 rounded-lg border text-center",
                  first ? "border-transparent pb-5 pt-6 shadow-glow" : "border-border bg-surface pb-4 pt-4",
                  PODIUM_ORDER[i]
                )}
              >
                <span className={cn("text-[11px] font-bold tracking-wide", first ? "text-accent-text" : "text-muted-foreground")}>#{i + 1}</span>
                <Avatar name={playerName(p)} className={cn(first ? "size-16 text-lg ring-[3px] ring-accent-tint" : "size-[52px] text-sm")} />
                <span className="text-sm font-semibold text-foreground">{playerName(p)}</span>
                <span className="text-[11px] text-muted-foreground">{p.category ? `Cat. ${p.category}` : "Sin categoría"}</span>
                <span className={cn("font-display font-semibold tabular-nums text-foreground", first ? "text-3xl" : "text-2xl")}>
                  {p.rating?.toFixed(2)}
                </span>
                <TrendIndicator trend={p.trend} delta={p.trendDelta} />
              </motion.div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col rounded-lg border border-border bg-surface">
          {rest.map((p, i) => {
            const confidence = confidenceFromRD(p.ratingDeviation);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.02 }}
                className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-secondary"
              >
                <span className="w-6 shrink-0 text-xs text-muted-foreground">{i + 4}</span>
                <Avatar name={playerName(p)} className="size-8 text-xs" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{playerName(p)}</span>
                  <span className="text-xs text-muted-foreground">{p.category ? `Cat. ${p.category}` : "Sin categoría"}</span>
                </div>
                <Sparkline values={p.ratingHistory} tone={p.trend} className="hidden shrink-0 text-muted-foreground sm:block" />
                <TrendIndicator trend={p.trend} delta={p.trendDelta} />
                <span className="w-14 shrink-0 text-right font-display text-sm font-semibold tabular-nums text-foreground">
                  {p.rating?.toFixed(2)}
                </span>
                <Badge tone={CONFIDENCE_TONE[confidence]} className="hidden w-16 shrink-0 justify-center sm:inline-flex">
                  {confidence}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, onUpdated }: { player: VisiblePlayer; onUpdated: (p: VisiblePlayer) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <PlayerForm
        action={updatePlayerAction.bind(null, player.id)}
        player={player}
        onSaved={(p) => {
          onUpdated(p);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-3.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Editar jugador"
        className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        <PencilSimple className="size-3.5" />
      </button>

      <div className="flex items-center gap-2.5 pr-8">
        <Avatar name={playerName(player)} className="size-9 shrink-0 text-xs" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{playerName(player)}</span>
          <div className="flex flex-wrap gap-1">
            <Badge tone="accent" className="px-1.5 py-0 text-[10px]">
              {player.category ? `Cat. ${player.category}` : "Sin categoría"}
            </Badge>
            <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
              {player.gender ? (GENDER_LABEL[player.gender] ?? player.gender) : "Sin género"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Phone className="size-3.5 shrink-0" />
          {player.phone ?? "Sin teléfono"}
        </span>
        <span className="flex items-center gap-1.5 truncate">
          <EnvelopeSimple className="size-3.5 shrink-0" />
          {player.email ?? "Sin email"}
        </span>
      </div>
    </div>
  );
}

function JugadoresTab({ players: initialPlayers }: { players: VisiblePlayer[] }) {
  const [players, setPlayers] = useState(initialPlayers);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const categories = useMemo(
    () => [...new Set(players.map((p) => p.category).filter((c): c is number => c !== null))].sort((a, b) => a - b),
    [players]
  );

  const filtered = players.filter((p) => {
    if (category !== null && p.category !== category) return false;
    if (query.trim() && !playerName(p).toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  function handleUpdated(updated: VisiblePlayer) {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador..." className="pl-9" />
        </div>
        <CategoryFilter categories={categories} active={category} onChange={setCategory} layoutId="jug-category-active" />
        <span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jugador" : "jugadores"}</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreate((v) => !v)} className="ml-auto gap-1.5">
          <Plus className="size-4" />
          Nuevo jugador
        </Button>
      </div>

      {showCreate && (
        <PlayerForm
          action={createPlayerStandaloneAction}
          onSaved={(p) => {
            setPlayers((prev) => [p, ...prev]);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title={players.length === 0 ? "Todavía no hay jugadores en tu roster" : "Sin resultados"}
          description={
            players.length === 0
              ? "Creá un jugador nuevo o inscribilo desde un torneo."
              : "Ajustá la búsqueda o el filtro de categoría."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayersView({ ranking, directory }: { ranking: PlayerRankingItem[]; directory: VisiblePlayer[] }) {
  const [tab, setTab] = useState<Tab>("ranking");

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex w-fit gap-1 rounded-full border border-border bg-surface-secondary p-1">
        {(["ranking", "jugadores"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === t && (
              <motion.span
                layoutId="players-tab-active"
                className="absolute inset-0 rounded-full bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{t === "ranking" ? "Ranking" : "Jugadores"}</span>
          </button>
        ))}
      </div>

      {tab === "ranking" ? <RankingTab players={ranking} /> : <JugadoresTab players={directory} />}
    </div>
  );
}
