import { createDraftTournamentAndRedirect } from "@/modules/tournaments/application/wizardActions";

/**
 * Sin UI propia — crea el DRAFT en el acto y redirige al editor, igual que
 * createAndOpenTournament() en padel-platform.html. Si falta club/organizer
 * configurados, createDraftTournamentAndRedirect redirige a /dashboard.
 */
export default async function NewTournamentPage() {
  await createDraftTournamentAndRedirect();
}
