"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return Date.now();
}

/**
 * null en el servidor (no "ahora", que sería un instante distinto al de la
 * hidratación en el cliente y causaría el mismo error de hidratación #418
 * ya visto con la hora de los partidos) — useSyncExternalStore es la forma
 * correcta de React 18+ de suscribirse a un valor externo que cambia solo,
 * sin el patrón setState-en-efecto.
 */
function getServerSnapshot(): number | null {
  return null;
}

export function HeaderClock({ timeZone }: { timeZone: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (now == null) return <span className="w-16 text-sm tabular-nums text-muted-foreground" />;

  return (
    <span className="text-sm font-medium tabular-nums text-foreground">
      {new Date(now).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone })}
    </span>
  );
}
