"use client";

import { useEffect, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { getFallbackDiscoveryAction, getNearbyDiscoveryAction } from "../application/actions";
import type { DiscoveryTournamentCard as Card } from "../application/getDiscoveryData";
import { TournamentDiscoveryCard } from "./tournament-discovery-card";
import { EmptyState } from "@/components/ui/empty-state";

type State =
  | { status: "loading" }
  | { status: "nearby"; nearby: Card[]; others: Card[] }
  | { status: "fallback"; tournaments: Card[] };

/**
 * Geolocation API del navegador — nativa, sin key, sin costo. Si el usuario
 * la niega o no está disponible, no rompe la pantalla: cae a la lista
 * ordenada por fecha (fetchAllPublishedTournaments) con un aviso chico.
 */
export function DiscoveryList() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    function loadFallback() {
      getFallbackDiscoveryAction().then((tournaments) => {
        if (!cancelled) setState({ status: "fallback", tournaments });
      });
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      loadFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        getNearbyDiscoveryAction(position.coords.latitude, position.coords.longitude).then(
          ({ nearby, others }) => {
            if (!cancelled) setState({ status: "nearby", nearby, others });
          }
        );
      },
      () => loadFallback(),
      { timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-sm text-muted-foreground">Buscando torneos…</p>;
  }

  if (state.status === "fallback") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Activa tu ubicación para ver los torneos más cercanos primero.
        </p>
        {state.tournaments.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Sin torneos publicados"
            description="Todavía no hay torneos publicados para mostrar."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {state.tournaments.map((t) => (
              <TournamentDiscoveryCard key={t.tournamentId} tournament={t} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { nearby, others } = state;
  if (nearby.length === 0 && others.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Sin torneos publicados"
        description="Todavía no hay torneos publicados cerca de ti."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {nearby.length > 0 && (
        <div className="flex flex-col gap-3">
          {nearby.map((t) => (
            <TournamentDiscoveryCard key={t.tournamentId} tournament={t} />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Otros torneos</h2>
          {others.map((t) => (
            <TournamentDiscoveryCard key={t.tournamentId} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
