"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { TrendUp, TrendDown, Minus, MagnifyingGlass, Phone, EnvelopeSimple, Trophy } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { confidenceFromRD, playerName, type PlayerRankingItem, type VisiblePlayer } from "../domain/player";

type Tab = "ranking" | "jugadores";

const CONFIDENCE_TONE = { Alta: "accent", Media: "neutral", Baja: "neutral" } as const;

function CategoryFilter({
  categories,
  active,
  onChange,
}: {
  categories: number[];
  active: number | null;
  onChange: (c: number | null) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-surface-secondary p-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          active === null ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Todas
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active === c ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Cat. {c}
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
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        <span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jugador" : "jugadores"}</span>
      </div>

      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {podium.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 text-center",
                i === 0 ? "border-accent shadow-glow" : "border-border bg-surface"
              )}
            >
              <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              <Avatar name={playerName(p)} className={cn(i === 0 ? "size-14 text-base" : "size-11 text-sm")} />
              <span className="text-sm font-medium text-foreground">{playerName(p)}</span>
              <span className="text-xs text-muted-foreground">{p.category ? `Cat. ${p.category}` : "Sin categoría"}</span>
              <span className="font-display text-xl font-semibold tabular-nums text-foreground">{p.rating?.toFixed(2)}</span>
              <TrendIndicator trend={p.trend} delta={p.trendDelta} />
            </motion.div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col rounded-lg border border-border bg-surface">
          {rest.map((p, i) => {
            const confidence = confidenceFromRD(p.ratingDeviation);
            return (
              <div key={p.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="w-6 shrink-0 text-xs text-muted-foreground">{i + 4}</span>
                <Avatar name={playerName(p)} className="size-8 text-xs" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{playerName(p)}</span>
                  <span className="text-xs text-muted-foreground">{p.category ? `Cat. ${p.category}` : "Sin categoría"}</span>
                </div>
                <Sparkline values={p.ratingHistory} className="hidden shrink-0 text-muted-foreground sm:block" />
                <TrendIndicator trend={p.trend} delta={p.trendDelta} />
                <span className="w-14 shrink-0 text-right font-display text-sm font-semibold tabular-nums text-foreground">
                  {p.rating?.toFixed(2)}
                </span>
                <Badge tone={CONFIDENCE_TONE[confidence]} className="hidden shrink-0 sm:inline-flex">
                  {confidence}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function JugadoresTab({ players }: { players: VisiblePlayer[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const categories = useMemo(
    () => [...new Set(players.map((p) => p.category).filter((c): c is number => c !== null))].sort((a, b) => a - b),
    [players]
  );

  const filtered = players.filter((p) => {
    if (category !== null && p.category !== category) return false;
    if (query.trim() && !playerName(p).toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador..." className="pl-9" />
        </div>
        <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "jugador" : "jugadores"}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title={players.length === 0 ? "Todavía no hay jugadores en tu roster" : "Sin resultados"}
          description={
            players.length === 0
              ? "Los jugadores aparecen acá apenas los inscribís en un torneo."
              : "Ajustá la búsqueda o el filtro de categoría."
          }
        />
      ) : (
        <div className="flex max-h-[640px] flex-col overflow-y-auto rounded-lg border border-border bg-surface">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <Avatar name={playerName(p)} className="size-8 text-xs" />
              <div className="flex min-w-[140px] flex-col">
                <span className="text-sm font-medium text-foreground">{playerName(p)}</span>
                <span className="text-xs text-muted-foreground">{p.category ? `Cat. ${p.category}` : "Sin categoría"}</span>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {p.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {p.phone}
                  </span>
                )}
                {p.email && (
                  <span className="flex items-center gap-1.5">
                    <EnvelopeSimple className="size-3.5" />
                    {p.email}
                  </span>
                )}
                {!p.phone && !p.email && <span>Sin contacto</span>}
              </div>
            </div>
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
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "ranking" ? "Ranking" : "Jugadores"}
          </button>
        ))}
      </div>

      {tab === "ranking" ? <RankingTab players={ranking} /> : <JugadoresTab players={directory} />}
    </div>
  );
}
