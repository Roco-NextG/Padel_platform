/**
 * WCAG 2.x contrast ratio utilities.
 *
 * Enforces docs/07_UX_UI_ARCHITECTURE.md §4: club branding colors can never
 * compromise contrast/legibility. Validated automatically when a club saves
 * its branding, not just documented as a guideline.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [channel(r), channel(g), channel(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two colors, from 1 (no contrast) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)];
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;

export interface BrandingContrastIssue {
  pair: "primary-on-white" | "primary-on-black" | "secondary-on-white" | "accent-on-white";
  ratio: number;
  required: number;
}

/**
 * Validates a club's chosen colors against the two surfaces they realistically
 * render on (card/button fills on light and dark backgrounds). Returns every
 * pair that fails AA — empty array means the palette is safe to save.
 */
export function validateBrandingContrast(colors: {
  primaryColor: string;
  secondaryColor?: string | null;
  accentColor?: string | null;
}): BrandingContrastIssue[] {
  const issues: BrandingContrastIssue[] = [];
  const checks: { pair: BrandingContrastIssue["pair"]; fg: string; bg: string }[] = [
    { pair: "primary-on-white", fg: colors.primaryColor, bg: "#ffffff" },
    { pair: "primary-on-black", fg: colors.primaryColor, bg: "#0c0a09" },
  ];
  if (colors.secondaryColor) {
    checks.push({ pair: "secondary-on-white", fg: colors.secondaryColor, bg: "#ffffff" });
  }
  if (colors.accentColor) {
    checks.push({ pair: "accent-on-white", fg: colors.accentColor, bg: "#ffffff" });
  }

  for (const check of checks) {
    const ratio = contrastRatio(check.fg, check.bg);
    if (ratio == null) continue;
    if (ratio < WCAG_AA_LARGE_TEXT) {
      issues.push({ pair: check.pair, ratio, required: WCAG_AA_LARGE_TEXT });
    }
  }
  return issues;
}
