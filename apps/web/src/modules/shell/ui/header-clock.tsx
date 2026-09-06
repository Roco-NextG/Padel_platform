"use client";

import { useSyncExternalStore } from "react";
import { useHourFormat } from "@/components/theme/hour-format-provider";

/**
 * Date.now() cacheado acá y solo refrescado dentro del callback de
 * subscribe — devolverlo directo desde getSnapshot() (como antes) rompe el
 * contrato de useSyncExternalStore: React puede llamar a getSnapshot más de
 * una vez por render para chequear consistencia, y dos milisegundos
 * distintos entre esas llamadas dispara "The result of getSnapshot should
 * be cached to avoid an infinite loop". Con el valor cacheado, getSnapshot
 * siempre devuelve lo mismo entre un tick del interval y el siguiente.
 */
let cachedNow = Date.now();

function subscribe(callback: () => void) {
  const id = setInterval(() => {
    cachedNow = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(id);
}

function getSnapshot(): number {
  return cachedNow;
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
  const { hourFormat } = useHourFormat();

  if (now == null) return <span className="w-16 text-sm tabular-nums text-muted-foreground" />;

  return (
    <span className="text-sm font-medium tabular-nums text-foreground">
      {new Date(now).toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone,
        hour12: hourFormat === "12h",
      })}
    </span>
  );
}
