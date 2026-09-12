import { forwardRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { BackgroundStyle, ContentItem, FormatDef, ScoreStickerStyle } from "../domain/content";

const BG_PRESETS: Record<Exclude<BackgroundStyle, "upload">, string> = {
  court: "radial-gradient(circle at 30% 15%, #4c6b0f 0%, #16171a 65%)",
  glow: "radial-gradient(circle at 50% 0%, #92cc18 0%, #16171a 55%)",
  mesh: "linear-gradient(135deg, #16171a 0%, #2b3a10 45%, #16171a 100%)",
};

/**
 * Marca de agua chica dentro de la tarjeta — a pedido explícito ("en el sticker
 * debes colocar el nombre de la aplicación en pequeño"), pero SIEMPRE dentro
 * del bloque con fondo sólido, nunca flotando sobre el área transparente:
 * texto blanco sobre nada es invisible en cuanto el sticker se pega sobre un
 * fondo claro (confirmado con el screenshot de WhatsApp del usuario).
 */
function StickerWatermark({ compact, centered }: { compact?: boolean; centered?: boolean }) {
  return (
    <span
      className={cn(
        "font-medium tracking-widest text-white/45",
        centered ? "self-center" : "self-end",
        compact ? "text-[10px]" : "text-[11px]"
      )}
    >
      PADEL PLATFORM
    </span>
  );
}

/**
 * "Javier Campos / Alberto Moreno" -> "J. Campos / A. Moreno" — a pedido
 * explícito, y SOLO para el sticker aislado (nunca para el marcador
 * embebido en el post completo, que tiene mucho más ancho disponible): a
 * 640px de ancho fijo, un nombre de pareja completo empuja el texto contra
 * los círculos del marcador y termina cortado a la mitad de una letra en
 * vez de acortarse con "…" (confirmado con el PNG real: el flex del label
 * no se achica dentro de un `justify-between` sin min-width:0, así que se
 * arregla también eso, pero abreviar es lo que evita llegar a necesitarlo).
 */
function abbreviateTeamLabel(label: string): string {
  return label
    .split(" / ")
    .map((name) => {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length < 2) return name.trim();
      return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
    })
    .join(" / ");
}

export function ResultSticker({
  item,
  style,
  sticker,
}: {
  item: Extract<ContentItem, { type: "result" }>;
  style: ScoreStickerStyle;
  /** true SOLO en el sticker aislado (ResultStickerCapture y sus previews) — abrevia nombres largos. */
  sticker?: boolean;
}) {
  const label = (l: string) => (sticker ? abbreviateTeamLabel(l) : l);
  const winnerLabel = label(item.winner === "a" ? item.teamA.label : item.teamB.label);
  const scoreLine = item.sets.map(([a, b]) => `${a}-${b}`).join("  ");

  // Antes estas tarjetas usaban bg-white/12-15 (translúcido) — se veían bien
  // en el visualizador porque quedaban sobre el fondo oscuro del propio slide,
  // pero al pegar el sticker (fondo REALMENTE transparente) sobre un chat
  // claro de WhatsApp, blanco translúcido + texto blanco queda blanco sobre
  // blanco: prácticamente invisible (confirmado con el screenshot adjuntado
  // por el usuario). bg-black/85 garantiza contraste sin importar qué haya
  // detrás — claro u oscuro.
  if (style === "winner") {
    return (
      <div className="flex w-full flex-col items-center gap-3 overflow-hidden rounded-3xl bg-black/85 p-8 text-center">
        <span
          className="rounded-full px-5 py-1.5 text-[22px] font-semibold tracking-wide text-black"
          style={{ backgroundColor: ACCENT_GREEN }}
        >
          GANADOR
        </span>
        <span className="max-w-full text-[44px] font-bold leading-normal" style={ELLIPSIS_NO_VCLIP}>
          {winnerLabel}
        </span>
        <span className="text-[24px] font-medium opacity-80">{scoreLine}</span>
        <StickerWatermark />
      </div>
    );
  }

  if (style === "card") {
    return (
      <div
        className="flex w-full flex-col gap-4 overflow-hidden rounded-[28px] p-8 shadow-2xl"
        style={{
          background:
            "radial-gradient(circle at 12% 0%, rgba(146,204,24,0.28), transparent 55%), linear-gradient(160deg, #10230f 0%, #0b1a0a 55%, #0a1509 100%)",
        }}
      >
        <ScoreRow label={label(item.teamA.label)} scores={item.sets.map(([a]) => a)} win={item.winner === "a"} />
        <ScoreRow label={label(item.teamB.label)} scores={item.sets.map(([, b]) => b)} win={item.winner === "b"} />
        <div className="mt-1 flex items-center justify-center">
          <StickerWatermark centered />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 overflow-hidden rounded-xl bg-black/85 px-6 py-4">
      <Row label={label(item.teamA.label)} score={item.sets.map(([a]) => a).join(" ")} win={item.winner === "a"} compact />
      <Row label={label(item.teamB.label)} score={item.sets.map(([, b]) => b).join(" ")} win={item.winner === "b"} compact />
      <StickerWatermark compact />
    </div>
  );
}

/** Verde de marca ya usado en BG_PRESETS.glow — mismo tono en todo el archivo. */
const ACCENT_GREEN = "#c8ef5a";

/**
 * Caja de 36x36 para un solo dígito — SOLO tamaño/centrado horizontal y de
 * fondo (círculo o no). No lleva ningún ajuste vertical: eso vive aparte en
 * `DIGIT_NUDGE`, sobre un span interno propio, porque aplicar el ajuste acá
 * mueve el círculo entero (fondo incluido) en vez de mover el dígito DENTRO
 * del círculo — confirmado con el PNG real cuando probé exactamente eso.
 */
const DIGIT_CENTER_BOX: CSSProperties = {
  display: "flex",
  width: 36,
  height: 36,
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Empuja el dígito hacia arriba DENTRO de su caja ya centrada. Medido pixel
 * a pixel sobre el PNG real exportado (en el visualizador del navegador
 * siempre se ve centrado, ahí no se nota nada): html2canvas rasteriza este
 * texto más abajo del centro real de la caja, sin importar si esa caja
 * centra por flexbox o por line-height — mismo desfasaje con los dos
 * mecanismos, así que no es un problema de CSS sino de cómo html2canvas
 * ubica el baseline del texto al rasterizar. El desfasaje crece con el
 * font-size (18px necesitó -8px, 22px necesitó -14px — no es la misma
 * proporción, así que hay un valor por tamaño, no una sola constante).
 * Valores medidos, no estéticos: si cambia el font-size de estos dígitos hay
 * que volver a medir contra un PNG descargado de verdad, no alcanza con
 * mirar la pantalla.
 */
const DIGIT_NUDGE_18: CSSProperties = { display: "inline-block", transform: "translateY(-8px)" };
const DIGIT_NUDGE_22: CSSProperties = { display: "inline-block", transform: "translateY(-14px)" };

/**
 * Reemplaza a mano la clase `truncate` de Tailwind (`overflow:hidden;
 * text-overflow:ellipsis; white-space:nowrap`) para un nombre de equipo
 * largo, que necesita abreviarse con "…" en ANCHO pero no debe recortarse en
 * ALTO. `overflow:hidden` de `truncate` clipea ambos ejes, y confirmado
 * descargando el PNG real (no alcanza con ver el visualizador: ahí siempre
 * se veía bien) — html2canvas pinta este texto extrabold un poco más alto de
 * lo que él mismo calculó para la caja de línea, y con overflow:hidden en el
 * mismo span eso se traduce en la parte de arriba de cada letra recortada.
 * Subir el line-height (`leading-normal`) no alcanzó para eliminarlo del
 * todo. `overflow-y: visible` dejar pasar ese margen de más sin afectar el
 * recorte horizontal, que sigue haciendo `overflow-x: hidden` +
 * `text-overflow: ellipsis`.
 */
const ELLIPSIS_NO_VCLIP: CSSProperties = {
  overflowX: "hidden",
  overflowY: "visible",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/**
 * Fila de marcador estilo "cobertura deportiva" (pedido explícito: replicar
 * un sticker de referencia) — el ganador se resalta en verde con cada set
 * dentro de un círculo relleno; el perdedor queda en blanco liso, sin
 * círculo, para que la jerarquía visual sea obvia de un vistazo.
 *
 * El nombre va en mayúsculas vía .toUpperCase() del string (no con la clase
 * `uppercase` de Tailwind, aunque eso resultó no ser la causa del recorte —
 * se mantiene igual porque es más explícito para el lector).
 */
function ScoreRow({ label, scores, win }: { label: string; scores: number[]; win: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className="min-w-0 text-[26px] font-extrabold leading-normal tracking-tight"
        style={{ color: win ? ACCENT_GREEN : "#ffffff", ...ELLIPSIS_NO_VCLIP }}
      >
        {label.toUpperCase()}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {scores.map((s, i) =>
          win ? (
            <span
              key={i}
              className="shrink-0 text-[18px] font-extrabold text-black"
              style={{ ...DIGIT_CENTER_BOX, backgroundColor: ACCENT_GREEN, borderRadius: 9999 }}
            >
              <span style={DIGIT_NUDGE_18}>{s}</span>
            </span>
          ) : (
            <span key={i} className="shrink-0 text-[22px] font-semibold text-white" style={DIGIT_CENTER_BOX}>
              <span style={DIGIT_NUDGE_22}>{s}</span>
            </span>
          )
        )}
      </div>
    </div>
  );
}

function Row({ label, score, win, compact }: { label: string; score: string; win: boolean; compact?: boolean }) {
  const winStyle = win ? { color: ACCENT_GREEN } : undefined;
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`min-w-0 leading-normal ${compact ? "text-[22px]" : "text-[28px]"} font-medium ${win ? "font-bold" : "text-white/70"}`}
        style={{ ...winStyle, ...ELLIPSIS_NO_VCLIP }}
      >
        {label}
      </span>
      <span className={`shrink-0 tabular-nums ${compact ? "text-[22px]" : "text-[28px]"} font-semibold ${win ? "" : "text-white"}`} style={winStyle}>
        {score}
      </span>
    </div>
  );
}

/**
 * Nodo AISLADO para "Copiar sticker" — a diferencia del slide completo
 * (GenSlide, usado por Descargar/Compartir), este nodo no tiene fondo,
 * logo del torneo, fecha, sponsors, chrome de TikTok ni el watermark "Padel
 * Platform": nada de eso debe viajar en un sticker pensado para pegarse
 * sobre CUALQUIER fondo (WhatsApp, Instagram, etc.) con el resto
 * transparente. Ancho fijo (no depende del formato del slide) porque este
 * nodo se captura solo, sin canvas de referencia detrás.
 */
export const ResultStickerCapture = forwardRef<
  HTMLDivElement,
  { item: Extract<ContentItem, { type: "result" }>; style: ScoreStickerStyle }
>(function ResultStickerCapture({ item, style }, ref) {
  return (
    <div ref={ref} style={{ width: 640 }} className="inline-block text-white">
      <ResultSticker item={item} style={style} sticker />
    </div>
  );
});

function AnnounceSticker({ item }: { item: Extract<ContentItem, { type: "upcoming" }> }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl bg-white/12 p-8">
      <span className="text-[20px] font-semibold tracking-wide opacity-80">
        {`${item.time}${item.court ? ` · ${item.court}` : ""}`.toUpperCase()}
      </span>
      <span className="text-[30px] font-semibold leading-snug">
        {item.teamA.label} <span className="opacity-60">vs</span> {item.teamB.label}
      </span>
      <span className="text-[18px] opacity-70">{item.category}</span>
    </div>
  );
}

function SummarySticker({ item }: { item: Extract<ContentItem, { type: "summary" }> }) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-3xl bg-white/12 p-8">
      <span className="text-[24px] font-semibold tracking-wide">RESULTADOS DEL DÍA</span>
      <div className="flex flex-col gap-2.5">
        {item.results.slice(0, 6).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-white/15 pb-2 text-[18px] last:border-0">
            <span className="leading-normal" style={ELLIPSIS_NO_VCLIP}>
              {r.teamA} <span className="opacity-50">vs</span> {r.teamB}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface GenSlideProps {
  item: ContentItem;
  format: FormatDef;
  background: BackgroundStyle;
  uploadUrl: string | null;
  scoreStyle: ScoreStickerStyle;
  showScore: boolean;
  showLogo: boolean;
  showSponsors: boolean;
  tournamentName: string;
  tournamentLogoUrl: string | null;
  sponsors: { id: string; name: string; logoUrl: string }[];
  tiktokChrome?: boolean;
}

export const GenSlide = forwardRef<HTMLDivElement, GenSlideProps>(function GenSlide(
  { item, format, background, uploadUrl, scoreStyle, showScore, showLogo, showSponsors, tournamentName, tournamentLogoUrl, sponsors, tiktokChrome },
  ref
) {
  const backgroundImage =
    background === "upload" ? (uploadUrl ? `url(${uploadUrl})` : BG_PRESETS.court) : BG_PRESETS[background];
  // Story/TikTok comparten el ancho (1080) de post/carrusel pero, al publicarse, quedan detrás
  // de la columna de íconos (like/comentar/compartir) que esas apps dibujan pegada al borde
  // derecho — la franja/tarjeta/ganador necesita ceder ese margen ahí, no en post/carrusel.
  const isVerticalFormat = format.id === "story" || format.id === "tiktok";
  // Ancho "grande" pero proporcional: reservado como % del lienzo, no un px fijo, para que
  // escale igual si algún formato futuro cambia de ancho. 0.8 = 20% más chico (pedido explícito).
  const sponsorLogoWidth = format.width * 0.16 * 0.8;

  return (
    <div
      ref={ref}
      style={{
        width: format.width,
        height: format.height,
        backgroundImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="relative shrink-0 overflow-hidden text-white"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" />

      <div className="absolute right-12 top-12 text-[18px] font-semibold opacity-85">{item.dateLabel}</div>

      <div className={cn("absolute inset-0 flex items-end p-12", isVerticalFormat && "pr-36")}>
        {item.type === "result" && showScore && <ResultSticker item={item} style={scoreStyle} />}
        {item.type === "upcoming" && <AnnounceSticker item={item} />}
        {item.type === "summary" && <SummarySticker item={item} />}
      </div>

      {/* Esquina superior izquierda, un solo stack con el logo del torneo primero y
          los sponsors debajo — mismo tamaño para todos, sin caja/fondo detrás (el
          propio PNG ya trae su transparencia, y el del torneo se procesa igual
          que los de sponsors). Pedido explícito: dejaron de ser dos elementos
          sueltos de tamaño y posición distinta. */}
      {(showLogo || (showSponsors && sponsors.length > 0)) && (
        <div className="absolute left-6 top-6 flex flex-col gap-4" style={{ width: sponsorLogoWidth }}>
          {showLogo &&
            (tournamentLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tournamentLogoUrl} alt={tournamentName} className="w-full object-contain drop-shadow-lg" />
            ) : (
              <div className="rounded-full bg-white/18 px-4 py-2 text-center text-[14px] font-semibold">{tournamentName}</div>
            ))}
          {showSponsors &&
            sponsors.slice(0, 4).map((s) =>
              s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={s.id} src={s.logoUrl} alt={s.name} className="w-full object-contain drop-shadow-lg" />
              ) : (
                <div key={s.id} className="flex aspect-square w-full items-center justify-center rounded-full bg-white/18 text-[14px] font-bold">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
              )
            )}
        </div>
      )}

      {tiktokChrome && (
        <div className="absolute bottom-24 right-4 flex flex-col items-center gap-5 text-[14px] font-semibold">
          <span className="flex flex-col items-center gap-1">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/20">♥</span>
            2.4k
          </span>
          <span className="flex flex-col items-center gap-1">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/20">💬</span>
            84
          </span>
          <span className="flex flex-col items-center gap-1">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/20">↗</span>
            Compartir
          </span>
        </div>
      )}

      {/* El nombre de la app debe aparecer UNA sola vez en el slide — si el marcador
          está habilitado, ya lo trae él mismo (StickerWatermark, dentro de su propia
          tarjeta); acá solo se muestra cuando no hay marcador para no duplicarlo. */}
      {!(item.type === "result" && showScore) && (
        <div className="absolute bottom-2 right-4 text-[11px] font-medium tracking-widest opacity-50">PADEL PLATFORM</div>
      )}
    </div>
  );
});
