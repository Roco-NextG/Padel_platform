"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  DownloadSimple,
  ShareNetwork,
  Copy,
  CaretLeft,
  CaretRight,
  UploadSimple,
  Trophy,
  CalendarBlank,
  Rows,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { GenSlide } from "./gen-slide";
import { FORMATS, type BackgroundStyle, type ContentItem, type FormatId, type ScoreStickerStyle } from "../domain/content";
import type { ContentFeedData } from "../infrastructure/contentRepository";

const BG_OPTIONS: { id: BackgroundStyle; label: string }[] = [
  { id: "court", label: "Cancha" },
  { id: "glow", label: "Glow" },
  { id: "mesh", label: "Mesh" },
  { id: "upload", label: "Foto" },
];

const SCORE_STYLE_OPTIONS: { id: ScoreStickerStyle; label: string }[] = [
  { id: "bar", label: "Franja" },
  { id: "card", label: "Tarjeta" },
  { id: "winner", label: "Ganador" },
];

/** Tamaño máximo del preview — el post (1:1) llena hasta 440px de ancho; los formatos altos (story/tiktok, 9:16) quedan acotados por la altura para no desbordar la columna. */
const PREVIEW_MAX_WIDTH = 440;
const PREVIEW_MAX_HEIGHT = 560;

function itemPreviewLabel(item: ContentItem): string {
  if (item.type === "result") return `${item.teamA.label} vs ${item.teamB.label}`;
  if (item.type === "upcoming") return `${item.teamA.label} vs ${item.teamB.label}`;
  return `Resumen · ${item.results.length} resultados`;
}

async function captureNode(node: HTMLElement, background: string | null): Promise<Blob | null> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, { backgroundColor: background, scale: 2, useCORS: true });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

export function ContentComposer({ feed }: { feed: ContentFeedData }) {
  const days = useMemo(() => [...new Set(feed.items.map((i) => i.dateKey))].sort().reverse(), [feed.items]);
  const [activeDay, setActiveDay] = useState<string | null>(days[0] ?? null);
  const dayItems = useMemo(() => feed.items.filter((i) => i.dateKey === activeDay), [feed.items, activeDay]);

  const [activeItemId, setActiveItemId] = useState<string | null>(dayItems[0]?.id ?? null);
  const activeItem = dayItems.find((i) => i.id === activeItemId) ?? dayItems[0] ?? null;

  const [format, setFormat] = useState<FormatId>("post");
  const formatDef = FORMATS.find((f) => f.id === format)!;
  const previewScale = Math.min(PREVIEW_MAX_WIDTH / formatDef.width, PREVIEW_MAX_HEIGHT / formatDef.height);
  const previewWidth = formatDef.width * previewScale;
  const previewHeight = formatDef.height * previewScale;
  const [background, setBackground] = useState<BackgroundStyle>("court");
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [scoreStyle, setScoreStyle] = useState<ScoreStickerStyle>("bar");
  const [showScore, setShowScore] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showSponsors, setShowSponsors] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const slideRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const results = dayItems.filter((i): i is Extract<ContentItem, { type: "result" }> => i.type === "result");
  const carruselItems = results.length > 0 ? results : dayItems;
  const slideItems = format === "carrusel" ? carruselItems : activeItem ? [activeItem] : [];
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlideItem = slideItems[Math.min(slideIndex, slideItems.length - 1)] ?? null;

  function selectItem(item: ContentItem) {
    setActiveItemId(item.id);
    setSlideIndex(0);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // data: URL, no un blob: object URL — html2canvas se queda colgado indefinidamente
    // tratando de re-fetchear una imagen blob: (confirmado en vivo: el log se detiene en
    // "Added image blob:..." y el export nunca resuelve), porque su loader interno intenta
    // pasarla por el mismo camino de proxy/CORS que usa para imágenes remotas. Un data: URL
    // ya viene embebido, sin fetch de por medio, así que ese camino nunca se dispara.
    const reader = new FileReader();
    reader.onload = () => setUploadUrl(reader.result as string);
    reader.readAsDataURL(file);
    setBackground("upload");
  }

  async function withNode(action: (node: HTMLElement) => Promise<void>) {
    if (!slideRef.current) return;
    setIsExporting(true);
    try {
      await action(slideRef.current);
    } catch {
      setToast("No se pudo exportar la imagen en este navegador.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  function handleDownload() {
    withNode(async (node) => {
      const blob = await captureNode(node, "#16171a");
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `padel-platform-${format}-${currentSlideItem?.id ?? "post"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleShare() {
    withNode(async (node) => {
      const blob = await captureNode(node, "#16171a");
      if (!blob) return;
      const file = new File([blob], "padel-platform.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: feed.tournamentName });
      } else {
        setToast("Tu navegador no soporta compartir nativo — descargá la imagen.");
      }
    });
  }

  function handleCopySticker() {
    if (!slideRef.current) return;
    // navigator.clipboard.write() tiene que llamarse de forma SÍNCRONA dentro del handler del
    // click para que el navegador todavía lo cuente como "gesto del usuario" (confirmado: la
    // versión anterior hacía `await captureNode(...)` ANTES de llamar a .write(), y para
    // cuando esa promesa resolvía el navegador ya había perdido esa ventana — .write() fallaba
    // silenciosamente, o el catch mostraba "no soporta copiar imágenes" aunque sí soporte). El
    // Blob en sí puede seguir generándose async — ClipboardItem acepta una Promise<Blob> como
    // valor exactamente para este caso.
    const node = slideRef.current;
    setIsExporting(true);
    const blobPromise = captureNode(node, null).then((blob) => {
      if (!blob) throw new Error("No se pudo generar la imagen.");
      return blob;
    });
    navigator.clipboard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .write([new (window as any).ClipboardItem({ "image/png": blobPromise })])
      .then(() => setToast("Sticker copiado al portapapeles."))
      .catch(() => setToast("Tu navegador no soporta copiar imágenes — probá descargar."))
      .finally(() => {
        setIsExporting(false);
        setTimeout(() => setToast(null), 3000);
      });
  }

  if (feed.items.length === 0) {
    return (
      <EmptyState
        icon={Rows}
        title="Todavía no hay contenido para generar"
        description="Apenas confirmes un resultado o programes un partido de este torneo, vas a poder generar piezas acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {days.length > 1 && (
        <div className="inline-flex w-fit gap-1 rounded-full border border-border bg-surface-secondary p-1">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setActiveDay(d);
                const first = feed.items.find((i) => i.dateKey === d);
                setActiveItemId(first?.id ?? null);
                setSlideIndex(0);
              }}
              className={cn(
                "relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeDay === d ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeDay === d && (
                <motion.span
                  layoutId="content-day-active"
                  className="absolute inset-0 rounded-full bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{feed.items.find((i) => i.dateKey === d)?.dateLabel}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1">
        {dayItems.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => selectItem(item)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "flex w-28 shrink-0 flex-col gap-1.5 rounded-md border p-2 text-left transition-colors",
              activeItem?.id === item.id ? "border-accent" : "border-border hover:border-border-strong"
            )}
          >
            <div className="flex h-16 items-center justify-center rounded bg-inverse text-[10px] font-medium text-inverse-foreground/70">
              {item.type === "result" ? <Trophy className="size-4" weight="fill" /> : item.type === "upcoming" ? <CalendarBlank className="size-4" /> : <Rows className="size-4" />}
            </div>
            <span className="truncate text-[11px] font-medium text-foreground">{itemPreviewLabel(item)}</span>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div ref={previewBoxRef} className="flex items-center justify-center rounded-lg border border-border bg-surface-secondary p-6">
          {currentSlideItem ? (
            <div className="relative">
              <div
                style={{
                  width: previewWidth,
                  height: previewHeight,
                  overflow: "hidden",
                  borderRadius: 12,
                }}
              >
                {/* Preview: visualmente escalado, NUNCA es el target de html2canvas —
                    getBoundingClientRect() de un nodo con transform:scale() devuelve el
                    tamaño YA escalado (previewWidth), no el real (1080px+), así que capturar
                    este nodo exportaría una imagen diminuta. Confirmado en vivo con el
                    log de debug de html2canvas ("size 300x533" en vez de 1080x1920)
                    antes de separar preview/export en dos nodos distintos. */}
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                  <GenSlide
                    item={currentSlideItem}
                    format={formatDef}
                    background={background}
                    uploadUrl={uploadUrl}
                    scoreStyle={scoreStyle}
                    showScore={showScore}
                    showLogo={showLogo}
                    showSponsors={showSponsors}
                    tournamentName={feed.tournamentName}
                    sponsors={feed.sponsors}
                    tiktokChrome={format === "tiktok"}
                  />
                </div>
              </div>

              {/* Export: tamaño real (1080px+), fuera de pantalla — este es el nodo que
                  captura html2canvas, sin ningún transform ancestro que lo afecte. */}
              <div aria-hidden="true" className="pointer-events-none fixed left-[-9999px] top-0">
                <GenSlide
                  ref={slideRef}
                  item={currentSlideItem}
                  format={formatDef}
                  background={background}
                  uploadUrl={uploadUrl}
                  scoreStyle={scoreStyle}
                  showScore={showScore}
                  showLogo={showLogo}
                  showSponsors={showSponsors}
                  tournamentName={feed.tournamentName}
                  sponsors={feed.sponsors}
                  tiktokChrome={format === "tiktok"}
                />
              </div>

              {format === "carrusel" && slideItems.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                    disabled={slideIndex === 0}
                    className="rounded-full border border-border p-1.5 disabled:opacity-30"
                  >
                    <CaretLeft className="size-3.5" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {slideIndex + 1} / {slideItems.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.min(slideItems.length - 1, i + 1))}
                    disabled={slideIndex === slideItems.length - 1}
                    className="rounded-full border border-border p-1.5 disabled:opacity-30"
                  >
                    <CaretRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Elegí un resultado o partido arriba.</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Formato</span>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMATS.map((f) => (
                <motion.button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFormat(f.id);
                    setSlideIndex(0);
                  }}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "rounded-md border px-2.5 py-2 text-xs font-medium transition-colors",
                    format === f.id ? "border-accent bg-accent-muted text-accent-text" : "border-border text-muted-foreground hover:border-border-strong"
                  )}
                >
                  {f.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Fondo</span>
            <div className="grid grid-cols-2 gap-1.5">
              {BG_OPTIONS.map((b) => (
                <motion.button
                  key={b.id}
                  type="button"
                  onClick={() => (b.id === "upload" ? fileInputRef.current?.click() : setBackground(b.id))}
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors",
                    background === b.id ? "border-accent bg-accent-muted text-accent-text" : "border-border text-muted-foreground hover:border-border-strong"
                  )}
                >
                  {b.id === "upload" && <UploadSimple className="size-3.5" />}
                  {b.label}
                </motion.button>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </div>

          {currentSlideItem?.type === "result" && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Marcador</span>
              <div className="grid grid-cols-3 gap-1.5">
                {SCORE_STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScoreStyle(s.id)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                      scoreStyle === s.id ? "border-accent bg-accent-muted text-accent-text" : "border-border text-muted-foreground hover:border-border-strong"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleCopySticker} loading={isExporting} className="gap-1.5 self-start">
                <Copy className="size-3.5" />
                Copiar sticker
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <ToggleRow
              label="Mostrar marcador"
              checked={showScore}
              onChange={setShowScore}
              disabled={currentSlideItem?.type !== "result"}
            />
            <ToggleRow label="Logo del torneo" checked={showLogo} onChange={setShowLogo} />
            <ToggleRow label="Patrocinadores" checked={showSponsors} onChange={setShowSponsors} disabled={feed.sponsors.length === 0} />
          </div>

          <div className="flex flex-col gap-2">
            <Button type="button" loading={isExporting} onClick={handleDownload} disabled={!currentSlideItem} className="gap-1.5">
              <DownloadSimple className="size-4" />
              Descargar
            </Button>
            <Button type="button" variant="secondary" loading={isExporting} onClick={handleShare} disabled={!currentSlideItem} className="gap-1.5">
              <ShareNetwork className="size-4" />
              Compartir
            </Button>
          </div>

          {toast && <p className="text-xs text-muted-foreground">{toast}</p>}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-3 text-xs font-medium", disabled ? "opacity-40" : "text-foreground")}>
      {label}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={cn(
          "relative h-[22px] w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-transparent bg-accent-strong" : "border-border-strong bg-surface-secondary"
        )}
      >
        <motion.span
          animate={{ x: checked ? 14 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-md"
        />
      </button>
    </label>
  );
}
