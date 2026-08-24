import type { GenderType } from "@/lib/supabase/database.types";

export interface PlayerSearchResult {
  playerId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  gender: GenderType | null;
  category: number | null;
}

export interface TeamWithPlayers {
  teamId: string;
  players: { playerId: string; firstName: string; lastName: string }[];
}

/**
 * Una pareja de padel: mismo género que la categoría (MALE/FEMALE), o
 * exactamente un hombre y una mujer si la categoría es Mixta. No hay RPC ni
 * constraint de DB para esto (el esquema viejo tampoco la tenía — la
 * inscripción de teams siempre fue un insert directo del cliente) así que
 * se valida acá antes de insertar.
 */
export function validateTeamGender(
  categoryGender: "MALE" | "FEMALE" | "MIXED",
  playerGenders: (GenderType | null)[]
): string | null {
  if (playerGenders.some((g) => !g)) {
    return "Ambos jugadores necesitan un género asignado antes de inscribirse.";
  }
  const genders = playerGenders as GenderType[];

  if (categoryGender === "MIXED") {
    const hasMale = genders.includes("MALE");
    const hasFemale = genders.includes("FEMALE");
    if (!hasMale || !hasFemale) {
      return "La categoría Mixta requiere un jugador y una jugadora.";
    }
    return null;
  }

  if (genders.some((g) => g !== categoryGender)) {
    return `Esta categoría es ${categoryGender === "MALE" ? "masculina" : "femenina"} — ambos jugadores deben serlo.`;
  }
  return null;
}
