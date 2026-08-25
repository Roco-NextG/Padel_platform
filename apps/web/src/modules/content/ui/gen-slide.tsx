import { forwardRef } from "react";
import type { BackgroundStyle, ContentItem, FormatDef, ScoreStickerStyle } from "../domain/content";

const BG_PRESETS: Record<Exclude<BackgroundStyle, "upload">, string> = {
  court: "radial-gradient(circle at 30% 15%, #4c6b0f 0%, #16171a 65%)",
  glow: "radial-gradient(circle at 50% 0%, #92cc18 0%, #16171a 55%)",
  mesh: "linear-gradient(135deg, #16171a 0%, #2b3a10 45%, #16171a 100%)",
};

function ResultSticker({ item, style }: { item: Extract<ContentItem, { type: "result" }>; style: ScoreStickerStyle }) {
  const winnerLabel = item.winner === "a" ? item.teamA.label : item.teamB.label;
  const scoreLine = item.sets.map(([a, b]) => `${a}-${b}`).join("  ");

  if (style === "winner") {
    return (
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <span className="rounded-full bg-white/15 px-5 py-1.5 text-[22px] font-semibold uppercase tracking-wide">Ganador</span>
        <span className="text-[44px] font-bold leading-tight">{winnerLabel}</span>
        <span className="text-[24px] font-medium opacity-80">{scoreLine}</span>
      </div>
    );
  }

  if (style === "card") {
    return (
      <div className="flex w-full flex-col gap-3 rounded-3xl bg-white/12 p-8 backdrop-blur-sm">
        <Row label={item.teamA.label} score={item.sets.map(([a]) => a).join(" ")} win={item.winner === "a"} />
        <Row label={item.teamB.label} score={item.sets.map(([, b]) => b).join(" ")} win={item.winner === "b"} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl bg-white/12 px-6 py-4">
      <Row label={item.teamA.label} score={item.sets.map(([a]) => a).join(" ")} win={item.winner === "a"} compact />
      <Row label={item.teamB.label} score={item.sets.map(([, b]) => b).join(" ")} win={item.winner === "b"} compact />
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
  sponsors: { id: string; name: string }[];
  tiktokChrome?: boolean;
}

export const GenSlide = forwardRef<HTMLDivElement, GenSlideProps>(function GenSlide(
  { item, format, background, uploadUrl, scoreStyle, showScore, showLogo, showSponsors, tournamentName, sponsors, tiktokChrome },
  ref
) {
  const backgroundImage =
    background === "upload" ? (uploadUrl ? `url(${uploadUrl})` : BG_PRESETS.court) : BG_PRESETS[background];

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

      {showLogo && (
        <div className="absolute left-12 top-12 rounded-full bg-white/15 px-5 py-2 text-[22px] font-semibold">{tournamentName}</div>
      )}
      <div className="absolute right-12 top-12 text-[18px] font-semibold opacity-85">{item.dateLabel}</div>

      <div className="absolute inset-0 flex items-end p-12">
        {item.type === "result" && showScore && <ResultSticker item={item} style={scoreStyle} />}
        {item.type === "upcoming" && <AnnounceSticker item={item} />}
        {item.type === "summary" && <SummarySticker item={item} />}
      </div>

      {showSponsors && sponsors.length > 0 && (
        <div className="absolute bottom-6 right-6 flex gap-2">
          {sponsors.slice(0, 4).map((s) => (
            <div key={s.id} className="flex size-11 items-center justify-center rounded-full bg-white/18 text-[14px] font-bold">
              {s.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
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
