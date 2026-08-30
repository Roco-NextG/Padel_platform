/**
 * Zona horaria configurable por club/organizador (columna `time_zone` en
 * `clubs`/`organizers`, migración 0021). Antes cada pantalla inferían la
 * hora a su manera — el Planificador la tomaba de la zona del NAVEGADOR,
 * el Dashboard la mostraba en la zona del SERVIDOR (Vercel, UTC), y
 * Partidos la tenía fija a mano en "America/Caracas" — así que un mismo
 * partido podía mostrar tres horas distintas según la pantalla (bug
 * reportado y corregido en vivo). Todo pasa por acá ahora, parametrizado
 * por la zona real del club donde se juega cada partido (no una constante
 * global — un torneo alojado en un club en otra zona debe verse en SU
 * hora local, no en la del club que mira el dashboard).
 */
export const DEFAULT_TIME_ZONE = "America/Caracas";

export function formatZonedTime(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function formatZonedDate(iso: string, opts?: Intl.DateTimeFormatOptions, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString("es-VE", { ...opts, timeZone });
}

/** Fecha (YYYY-MM-DD) de un instante UTC tal como se ve en `timeZone`. */
export function zonedDateKey(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Hora (HH:mm, 24h) de un instante UTC tal como se ve en `timeZone`. */
export function zonedTimeKey(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/**
 * Offset real (ms) de `timeZone` respecto a UTC en el instante `date` —
 * trick estándar sin depender de ninguna librería: formatea el mismo
 * instante en esa zona, reinterpreta ese texto como si fuera UTC, y la
 * diferencia con el instante original ES el offset. Funciona con DST
 * (a diferencia de un offset fijo hardcodeado) porque se recalcula para
 * la fecha puntual, no para la zona en abstracto.
 */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

/** Convierte una fecha+hora "de pared" en `timeZone` (lo que el usuario elige en el Planificador) al instante UTC real que hay que guardar. */
export function zonedSlotToIso(dateKey: string, time: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  const naiveUtc = new Date(`${dateKey}T${time}:00Z`);
  const offset = timeZoneOffsetMs(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offset).toISOString();
}

/** Navegar N días desde un dateKey — aritmética de calendario pura, no depende de ninguna zona horaria (un "día" es un concepto de calendario, no una duración de horas). */
export function shiftZonedDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function todayZonedDateKey(timeZone: string = DEFAULT_TIME_ZONE): string {
  return zonedDateKey(new Date().toISOString(), timeZone);
}

/** Lista de zonas horarias para el selector de Configuración — Intl.supportedValuesOf ya trae el registro IANA completo en runtimes modernos (Node 18+, navegadores actuales); si no está disponible, alcanza con las más relevantes para esta app. */
export function listTimeZones(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
    try {
      return intlWithSupportedValues.supportedValuesOf("timeZone");
    } catch {
      // sigue al fallback
    }
  }
  return [
    "America/Caracas",
    "America/Bogota",
    "America/Lima",
    "America/Santiago",
    "America/Argentina/Buenos_Aires",
    "America/Mexico_City",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/Madrid",
    "UTC",
  ];
}
