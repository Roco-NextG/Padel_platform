import { forwardRef } from "react";
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
function StickerWatermark({ compact }: { compact?: boolean }) {
  return (
    <span className={cn("self-end font-medium uppercase tracking-widest text-white/45", compact ? "text-[10px]" : "text-[11px]")}>
      Padel Platform
    </span>
  );
}

export function ResultSticker({ item, style }: { item: Extract<ContentItem, { type: "result" }>; style: ScoreStickerStyle }) {
  const winnerLabel = item.winner === "a" ? item.teamA.label : item.teamB.label;
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
      <div className="flex w-full flex-col items-center gap-3 rounded-3xl bg-black/85 p-8 text-center">
        <span className="rounded-full bg-white px-5 py-1.5 text-[22px] font-semibold uppercase tracking-wide text-black">Ganador</span>
        <span className="text-[44px] font-bold leading-tight">{winnerLabel}</span>
        <span className="text-[24px] font-medium opacity-80">{scoreLine}</span>
        <StickerWatermark />
      </div>
    );
  }

  if (style === "card") {
    return (
      <div className="flex w-full flex-col gap-3 rounded-3xl bg-black/85 p-8">
        <Row label={item.teamA.label} score={item.sets.map(([a]) => a).join(" ")} win={item.winner === "a"} />
        <Row label={item.teamB.label} score={item.sets.map(([, b]) => b).join(" ")} win={item.winner === "b"} />
        <StickerWatermark />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl bg-black/85 px-6 py-4">
      <Row label={item.teamA.label} score={item.sets.map(([a]) => a).join(" ")} win={item.winner === "a"} compact />
      <Row label={item.teamB.label} score={item.sets.map(([, b]) => b).join(" ")} win={item.winner === "b"} compact />
      <StickerWatermark compact />
    </div>
  );
}

function Row({ label, score, win, compact }: { label: string; score: string; win: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`truncate ${compact ? "text-[22px]" : "text-[28px]"} font-medium ${win ? "font-bold text-white" : "text-white/70"}`}>
        {label}
      </span>
      <span className={`shrink-0 tabular-nums ${compact ? "text-[22px]" : "text-[28px]"} font-semibold`}>{score}</span>
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
      <ResultSticker item={item} style={style} />
    </div>
  );
});

function AnnounceSticker({ item }: { item: Extract<ContentItem, { type: "upcoming" }> }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl bg-white/12 p-8">
      <span className="text-[20px] font-semibold uppercase tracking-wide opacity-80">
        {item.time} {item.court ? `· ${item.court}` : ""}
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
      <span className="text-[24px] font-semibold uppercase tracking-wide">Resultados del día</span>
      <div className="flex flex-col gap-2.5">
        {item.results.slice(0, 6).map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-white/15 pb-2 text-[18px] last:border-0">
            <span className="truncate">
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
  // escale igual si algún formato futuro cambia de ancho.
  const sponsorLogoWidth = format.width * 0.16;

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

      {showLogo &&
        (tournamentLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournamentLogoUrl}
            alt={tournamentName}
            className="absolute left-12 top-12 size-14 rounded-full border-2 border-white/40 bg-white/15 object-cover"
          />
        ) : (
          <div className="absolute left-12 top-12 rounded-full bg-white/15 px-5 py-2 text-[22px] font-semibold">{tournamentName}</div>
        ))}
      <div className="absolute right-12 top-12 text-[18px] font-semibold opacity-85">{item.dateLabel}</div>

      <div className={cn("absolute inset-0 flex items-end p-12", isVerticalFormat && "pr-36")}>
        {item.type === "result" && showScore && <ResultSticker item={item} style={scoreStyle} />}
        {item.type === "upcoming" && <AnnounceSticker item={item} />}
        {item.type === "summary" && <SummarySticker item={item} />}
      </div>

      {/* Lateral izquierdo, sin caja/fondo detrás (el propio PNG del sponsor ya trae su
          transparencia) — pedido explícito, antes era una insignia circular con iniciales
          abajo a la derecha, sin usar el logo real en absoluto. */}
      {showSponsors && sponsors.length > 0 && (
        <div className="absolute left-6 top-1/2 flex -translate-y-1/2 flex-col gap-5" style={{ width: sponsorLogoWidth }}>
          {sponsors.slice(0, 4).map((s) =>
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

      <div className="absolute bottom-2 right-4 text-[11px] font-medium uppercase tracking-widest opacity-50">Padel Platform</div>
    </div>
  );
});
