/**
 * Zona horaria única para toda la app. Antes cada pantalla inferían la hora
 * a su manera — el Planificador la tomaba de la zona del NAVEGADOR (getters
 * locales de Date), el Dashboard la mostraba en la zona del SERVIDOR (Vercel,
 * UTC, sin timeZone explícito), y Partidos ya la fijaba a mano en
 * "America/Caracas" — así que un mismo partido podía mostrar tres horas
 * distintas según la pantalla (bug reportado en vivo). Todo pasa a usar esta
 * única fuente de verdad.
 *
 * América/Caracas no tiene horario de verano, así que el offset fijo -04:00
 * es válido siempre — no hace falta resolver DST para construir instantes.
 */
export const APP_TIME_ZONE = "America/Caracas";
const APP_UTC_OFFSET = "-04:00";

export function formatZonedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });
}

export function formatZonedDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("es-VE", { ...opts, timeZone: APP_TIME_ZONE });
}

/** Fecha (YYYY-MM-DD) de un instante UTC tal como se ve en APP_TIME_ZONE — para agrupar partidos por día sin depender de la zona del navegador ni del servidor. */
export function zonedDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Hora (HH:mm, 24h) de un instante UTC tal como se ve en APP_TIME_ZONE. */
export function zonedTimeKey(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** Convierte una fecha+hora "de pared" en APP_TIME_ZONE (lo que el usuario elige en el Planificador) al instante UTC real que hay que guardar. */
export function zonedSlotToIso(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00${APP_UTC_OFFSET}`).toISOString();
}

export function shiftZonedDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00${APP_UTC_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return zonedDateKey(d.toISOString());
}

export function todayZonedDateKey(): string {
  return zonedDateKey(new Date().toISOString());
}
