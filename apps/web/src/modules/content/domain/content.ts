export interface ContentTeam {
  label: string;
  initials: string;
}

export interface ContentResultItem {
  id: string;
  type: "result";
  dateKey: string;
  dateLabel: string;
  court: string | null;
  time: string;
  category: string;
  teamA: ContentTeam;
  teamB: ContentTeam;
  sets: [number, number][];
  winner: "a" | "b";
}

export interface ContentUpcomingItem {
  id: string;
  type: "upcoming";
  dateKey: string;
  dateLabel: string;
  court: string | null;
  time: string;
  category: string;
  teamA: ContentTeam;
  teamB: ContentTeam;
}

export interface ContentSummaryItem {
  id: string;
  type: "summary";
  dateKey: string;
  dateLabel: string;
  results: { teamA: string; teamB: string; score: string }[];
}

export type ContentItem = ContentResultItem | ContentUpcomingItem | ContentSummaryItem;

export type FormatId = "post" | "story" | "carrusel" | "tiktok";

export interface FormatDef {
  id: FormatId;
  label: string;
  width: number;
  height: number;
}

export const FORMATS: FormatDef[] = [
  { id: "post", label: "Post", width: 1080, height: 1080 },
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "carrusel", label: "Carrusel", width: 1080, height: 1350 },
  { id: "tiktok", label: "TikTok", width: 1080, height: 1920 },
];

export type BackgroundStyle = "court" | "glow" | "mesh" | "upload";
export type ScoreStickerStyle = "bar" | "card" | "winner";

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
