"use client";

import dynamic from "next/dynamic";
import type { MatchListItem } from "../domain/match";

/**
 * @dnd-kit genera ids internos (aria-describedby, etc.) que no coinciden entre el render
 * de servidor y el de cliente — mismatch de hidratación garantizado si este árbol se
 * server-renderiza. `ssr: false` solo es válido desde un Client Component, de ahí este
 * wrapper separado en vez de llamarlo directo desde page.tsx (Server Component).
 */
const SchedulerBoard = dynamic(() => import("./scheduler-board").then((m) => m.SchedulerBoard), {
  ssr: false,
  loading: () => <div className="h-[560px] animate-pulse rounded-lg border border-border bg-surface" />,
});

export function SchedulerBoardLoader(props: {
  tournamentId: string;
  matches: MatchListItem[];
  courts: { id: string; name: string }[];
  initialDate: string;
}) {
  // key=tournamentId fuerza el remount al cambiar de torneo — SchedulerBoard
  // guarda matches/fecha/categoría en useState propio; sin esto, cambiar de
  // torneo por el selector de pills solo cambia las props pero el
  // componente sigue montado con su estado viejo (mismo bug que
  // CategoryGrid antes de su fix: confirmado en vivo, la grilla quedaba
  // vacía y el filtro de categoría mostraba una del torneo anterior).
  return <SchedulerBoard key={props.tournamentId} {...props} />;
}
