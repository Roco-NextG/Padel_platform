export interface Sponsor {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl: string;
}

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
