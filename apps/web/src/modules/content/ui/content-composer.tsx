"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  DownloadSimple,
  ShareNetwork,
  Copy,
  Eye,
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
import { GenSlide, ResultSticker, ResultStickerCapture } from "./gen-slide";
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

/**
 * Convierte un color oklab(...) a rgba() vía la fórmula de referencia de
 * Björn Ottosson (creador de OKLab) — html2canvas no entiende oklab/oklch
 * en absoluto ("Attempting to parse an unsupported color function"), y
 * Tailwind v4 genera sus utilidades de gradiente (bg-gradient-to-b, from-,
 * via-, to-) en ese espacio de color por default. getComputedStyle() en navegadores
 * modernos devuelve el color TAL CUAL se especificó (ya no lo normaliza a
 * rgb), así que no hay atajo del navegador para esto — hay que calcularlo.
 */
function oklabToRgba(match: string): string {
  // oklch(L C H / alpha) es el mismo espacio en coordenadas polares — se
  // convierte primero a (L, a, b) cartesiano y de ahí sigue la misma cuenta.
  const asOklch = match.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
  let L: number, a: number, b: number, alpha: number;
  if (asOklch) {
    L = parseFloat(asOklch[1]);
    const c = parseFloat(asOklch[2]);
    const h = (parseFloat(asOklch[3]) * Math.PI) / 180;
    a = c * Math.cos(h);
    b = c * Math.sin(h);
    alpha = asOklch[4] !== undefined ? parseFloat(asOklch[4]) : 1;
  } else {
    const m = match.match(/oklab\(\s*([\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
    if (!m) return match;
    L = parseFloat(m[1]);
    a = parseFloat(m[2]);
    b = parseFloat(m[3]);
    alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
  }

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;

  let r = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;
  const toSrgb = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  r = toSrgb(r);
  g = toSrgb(g);
  bl = toSrgb(bl);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(bl * 255)}, ${alpha})`;
}

/**
 * Copia el estilo YA COMPUTADO de cada elemento del nodo real como inline
 * style en su correspondiente nodo clonado — necesario porque html2canvas
 * lee document.styleSheets con su propio parser (viejo, sin soporte de
 * @layer), y el CSS de Tailwind v4 viene envuelto en @layer base/@layer
 * utilities: confirmado en vivo que html2canvas no aplicaba NINGUNA clase
 * de Tailwind al capturar (todo el texto salía sin estilo, apilado arriba a
 * la izquierda, aunque el fondo — que es un style inline, no una clase —
 * sí se veía bien). Con todo ya inline, html2canvas no necesita entender el
 * stylesheet para nada. Los valores que salgan en oklab() se sanean aparte
 * (ver oklabToRgba) porque ESE parser sí throwea con ellos en vez de
 * ignorarlos en silencio.
 */
function inlineComputedStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source);
  let cssText = "";
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    let value = computed.getPropertyValue(prop);
    if (value.includes("oklab") || value.includes("oklch")) {
      value = value.replace(/okl(?:ab|ch)\([^)]*\)/g, oklabToRgba);
    }
    cssText += `${prop}:${value};`;
  }
  (target as HTMLElement).style.cssText = cssText;
  for (let i = 0; i < source.children.length; i++) {
    if (target.children[i]) inlineComputedStyles(source.children[i], target.children[i]);
  }
}

/**
 * Correcciones que existen SOLO para el clon que arma html2canvas antes de
 * rasterizar — nunca deben tocar el árbol en vivo (gen-slide.tsx), porque el
 * bug que corrigen es exclusivo de cómo html2canvas mide/pinta texto, no de
 * cómo lo layoutea el navegador real. Un intento anterior aplicó estas mismas
 * correcciones directamente en los componentes en vivo y terminó rompiendo el
 * visualizador (que nunca tuvo el bug) para arreglar solo la exportación.
 * Se corre DESPUÉS de inlineComputedStyles, que si no pisa cualquier cambio
 * hecho antes con su propio cssText calculado del nodo original.
 *
 * `[data-cc-label-fix]`: nombres de equipo largos, con `truncate` (que trae
 * `overflow:hidden` + `text-overflow:ellipsis` para abreviar con "…" cuando
 * no entran). Confirmado descargando el PNG real, probando cada variable por
 * separado: `text-overflow:ellipsis` es lo que dispara el bug de html2canvas
 * — no el alto del lienzo, no el line-height, no la posición del elemento
 * (los tres se probaron y descartaron por separado). Se reproduce solo
 * cuando el texto está cerca o pasado el ancho disponible (por eso Story/
 * TikTok lo mostraban y Post/Carrusel no: esos formatos reservan una franja
 * extra a la derecha — pr-36 en gen-slide.tsx — que angosta la tarjeta lo
 * suficiente). El apaño es sacar el `text-overflow` de la ecuación en la
 * exportación: `overflow:visible` + `white-space:nowrap` — un nombre
 * larguísimo puede asomar un poco por el borde de la tarjeta en vez de
 * cortarse con "…", pero eso es infinitamente mejor que texto ilegible. El
 * sticker aislado abrevia los nombres aparte (abbreviateTeamLabel en
 * gen-slide.tsx) así que ahí casi nunca se llega a ese límite.
 *
 * `[data-cc-text-nudge]`: valor en px (string, puede ser negativo) medido
 * pixel a pixel contra el PNG real — html2canvas rasteriza texto corto y
 * centrado (el número dentro del círculo del marcador, la palabra del badge
 * "GANADOR") sistemáticamente más abajo del centro real de su caja, sin
 * importar si esa caja centra por flexbox o por padding simétrico. Si cambia
 * el font-size de alguno de estos textos hay que volver a medir contra una
 * descarga real, no alcanza con mirar la pantalla (ver ScoreRow y el badge
 * de estilo "winner" en gen-slide.tsx).
 */
function applyExportOnlyFixups(clonedRoot: Element) {
  clonedRoot.querySelectorAll<HTMLElement>("[data-cc-label-fix]").forEach((el) => {
    el.style.overflow = "visible";
    el.style.whiteSpace = "nowrap";
    const fontSize = parseFloat(el.style.fontSize) || 16;
    el.style.lineHeight = `${fontSize}px`;
  });
  clonedRoot.querySelectorAll<HTMLElement>("[data-cc-text-nudge]").forEach((el) => {
    const dy = el.getAttribute("data-cc-text-nudge");
    if (dy) el.style.transform = `translateY(${dy}px)`;
  });
}

async function captureNode(node: HTMLElement, background: string | null): Promise<Blob | null> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, {
    backgroundColor: background,
    scale: 2,
    useCORS: true,
    // Por default html2canvas clona el <html> ENTERO antes de renderizar (para preservar
    // cascada/CSS con precisión) — en esta app eso significa clonar y calcularle estilos a todo
    // el sidebar, el header, y el resto del panel de Contenido, no solo el slide de 1080x1080
    // que en realidad hace falta. Confirmado en vivo contra producción: ese paso completo tomó
    // desde ~150ms hasta varios MINUTOS según cuánto more contenido tuviera la página — el
    // usuario lo veía como "no se pudo descargar". ignoreElements poda todo lo que no sea
    // ancestro/descendiente del nodo a exportar, sin tocar la cascada real (los ancestros se
    // preservan intactos para que herencia/variables CSS sigan resolviendo bien).
    ignoreElements: (el) => !(node.contains(el) || el.contains(node)),
    onclone: (_doc, clonedNode) => {
      inlineComputedStyles(node, clonedNode);
      applyExportOnlyFixups(clonedNode);
    },
  });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/** "Torneo Rommel #7" -> "torneo-rommel-7" — nombre de archivo, sin acentos ni caracteres que algunos SO rechazan. */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Nombre del torneo + nombre de la app + fecha + número de secuencia — a
 * pedido explícito, para poder identificar y ordenar los PNG descargados sin
 * tener que abrir cada uno (antes era solo "padel-platform-{formato}-{id}",
 * ilegible apenas se descargaban dos o tres). La secuencia (`seq`) es un
 * contador por sesión del composer, no por día ni por torneo — arranca en 1
 * cada vez que se abre/recarga la página y sube con cada exportación
 * (descarga o compartir) para que nunca se pisen dos archivos entre sí.
 */
function buildExportFilename(tournamentName: string, seq: number): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seqStr = String(seq).padStart(2, "0");
  return `padel-platform-${slugify(tournamentName)}-${y}${m}${d}-${seqStr}`;
}

/**
 * El logo que sube el club para un sponsor casi nunca viene ya preparado
 * para pegarse sobre un fondo de color (cancha/glow/mesh/foto) — trae su
 * propio fondo blanco (JPG, o PNG "transparente" solo de nombre). Se
 * convierte automáticamente a una silueta blanca: cualquier píxel
 * blanco/casi blanco pasa a alpha 0 (el fondo desaparece), y el resto se
 * repinta blanco puro conservando su alpha original (el trazo del logo
 * queda). Si la imagen no es CORS-friendly esto tira SecurityError al leer
 * el canvas — se cae al logo original tal cual en vez de romper el slide.
 */
async function whitenizeLogo(url: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar el logo"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return url;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // ya transparente, no tocar
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (luminance > 235) {
      data[i + 3] = 0; // fondo blanco/casi blanco -> transparente
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255; // resto del logo -> blanco puro
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
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
  const [showStickerPreview, setShowStickerPreview] = useState(false);
  const [whiteSponsorLogos, setWhiteSponsorLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    for (const s of feed.sponsors) {
      if (whiteSponsorLogos[s.logoUrl]) continue;
      whitenizeLogo(s.logoUrl)
        .then((dataUrl) => {
          if (!cancelled) setWhiteSponsorLogos((prev) => ({ ...prev, [s.logoUrl]: dataUrl }));
        })
        .catch(() => {
          // CORS u otro error de carga: se sigue usando el logo original (ver sponsorsForSlide).
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.sponsors]);

  const sponsorsForSlide = useMemo(
    () => feed.sponsors.map((s) => ({ ...s, logoUrl: whiteSponsorLogos[s.logoUrl] ?? s.logoUrl })),
    [feed.sponsors, whiteSponsorLogos]
  );

  const slideRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Contador de exportaciones (descargar/compartir) de esta sesión — ver buildExportFilename. */
  const exportSeqRef = useRef(0);

  const results = dayItems.filter((i): i is Extract<ContentItem, { type: "result" }> => i.type === "result");
  const carruselItems = results.length > 0 ? results : dayItems;
  const slideItems = format === "carrusel" ? carruselItems : activeItem ? [activeItem] : [];
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlideItem = slideItems[Math.min(slideIndex, slideItems.length - 1)] ?? null;

  // Tamaño REAL (sin escalar) del nodo que "Copiar sticker" captura — antes la
  // vista previa metía el mismo markup (pensado para un ancho de 640px) forzado
  // dentro de una caja de 220px sin ningún transform, así que el texto salía
  // enorme y se recortaba. Con el tamaño real medido acá se puede escalar el
  // preview igual que el slide grande (mismo truco: wrapper del tamaño visual
  // final + transform:scale en el hijo), quedando proporcional a como se ve
  // embebido en el post.
  const [stickerNaturalSize, setStickerNaturalSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const node = stickerRef.current;
    if (!node) return;
    const measure = () => setStickerNaturalSize({ width: node.offsetWidth, height: node.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [currentSlideItem, scoreStyle]);

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
      exportSeqRef.current += 1;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${buildExportFilename(feed.tournamentName, exportSeqRef.current)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleShare() {
    withNode(async (node) => {
      const blob = await captureNode(node, "#16171a");
      if (!blob) return;
      exportSeqRef.current += 1;
      const file = new File([blob], `${buildExportFilename(feed.tournamentName, exportSeqRef.current)}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: feed.tournamentName });
      } else {
        setToast("Tu navegador no soporta compartir nativo — descargá la imagen.");
      }
    });
  }

  function handleCopySticker() {
    if (!stickerRef.current) return;
    // navigator.clipboard.write() tiene que llamarse de forma SÍNCRONA dentro del handler del
    // click para que el navegador todavía lo cuente como "gesto del usuario" (confirmado: la
    // versión anterior hacía `await captureNode(...)` ANTES de llamar a .write(), y para
    // cuando esa promesa resolvía el navegador ya había perdido esa ventana — .write() fallaba
    // silenciosamente, o el catch mostraba "no soporta copiar imágenes" aunque sí soporte). El
    // Blob en sí puede seguir generándose async — ClipboardItem acepta una Promise<Blob> como
    // valor exactamente para este caso.
    // Captura stickerRef (ResultStickerCapture), NO slideRef: ese es el slide completo (fondo,
    // logo, fecha, sponsors, watermark "Padel Platform") — un sticker pensado para pegarse sobre
    // cualquier fondo no puede traer nada de eso, solo la franja/tarjeta/ganador en sí.
    const node = stickerRef.current;
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
                    tournamentLogoUrl={feed.tournamentLogoUrl}
                    sponsors={sponsorsForSlide}
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
                  tournamentLogoUrl={feed.tournamentLogoUrl}
                  sponsors={sponsorsForSlide}
                  tiktokChrome={format === "tiktok"}
                />
              </div>

              {/* Sticker aislado (franja/tarjeta/ganador solo, sin fondo ni logo ni watermark) —
                  fuera de pantalla igual que el slide de exportación; es lo que captura
                  "Copiar sticker" y lo que se muestra al abrir la vista previa con el ícono de ojo. */}
              {currentSlideItem?.type === "result" && (
                <div aria-hidden="true" className="pointer-events-none fixed left-[-9999px] top-0">
                  <ResultStickerCapture ref={stickerRef} item={currentSlideItem} style={scoreStyle} />
                </div>
              )}

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
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={handleCopySticker} loading={isExporting} className="gap-1.5">
                  <Copy className="size-3.5" />
                  Copiar sticker
                </Button>
                <button
                  type="button"
                  onClick={() => setShowStickerPreview((v) => !v)}
                  aria-pressed={showStickerPreview}
                  aria-label={showStickerPreview ? "Ocultar vista previa del sticker" : "Ver el sticker que se va a copiar"}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                    showStickerPreview
                      ? "border-accent bg-accent-muted text-accent-text"
                      : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                  )}
                >
                  <Eye className="size-3.5" />
                </button>
              </div>

              {/* Fondo a cuadros clásico de "esto es transparente" — para que el usuario vea,
                  antes de copiar, que alrededor de la franja/tarjeta/ganador no viaja nada más
                  (ni fondo, ni logo, ni el nombre de la app). */}
              {showStickerPreview && stickerNaturalSize && (
                <div
                  className="flex items-center justify-center rounded-md border border-border p-3"
                  style={{
                    backgroundImage:
                      "conic-gradient(#00000022 90deg, transparent 90deg 180deg, #00000022 180deg 270deg, transparent 270deg)",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {(() => {
                    const previewW = 200;
                    const scale = previewW / stickerNaturalSize.width;
                    return (
                      <div style={{ width: previewW, height: stickerNaturalSize.height * scale, overflow: "hidden" }}>
                        <div style={{ width: stickerNaturalSize.width, transform: `scale(${scale})`, transformOrigin: "top left" }} className="text-white">
                          <ResultSticker item={currentSlideItem} style={scoreStyle} sticker />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
