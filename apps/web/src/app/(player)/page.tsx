import Link from "next/link";
import {
  CalendarBlank,
  Trophy,
  ClockCounterClockwise,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getPlayerProfileForUser } from "@/modules/players/application/getPlayerProfile";
import { getPendingConfirmationsForPlayer } from "@/modules/matches/application/getMatches";
import { PendingConfirmationCard } from "@/modules/matches/ui/pending-confirmation-card";
import { RatingBadge } from "@/modules/players/ui/rating-badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PlayerHomePage() {
  const context = await getCurrentUserContext();
  const player = context ? await getPlayerProfileForUser(context.userId) : null;
  const pendingConfirmations = player ? await getPendingConfirmationsForPlayer(player.id) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">Hola,</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {player?.firstName ?? "Jugador"}
        </h1>
      </div>

      <section aria-labelledby="proximo-partido">
        <h2 id="proximo-partido" className="mb-2 text-sm font-medium text-muted-foreground">
          Próximo partido
        </h2>
        <EmptyState
          icon={CalendarBlank}
          title="Sin partidos programados"
          description="Cuando te inscribas en un torneo, tu próximo partido va a aparecer aquí con hora, pista y rival."
        />
      </section>

      {pendingConfirmations.length > 0 && (
        <section aria-labelledby="resultados-por-confirmar">
          <h2 id="resultados-por-confirmar" className="mb-2 text-sm font-medium text-muted-foreground">
            Resultados por confirmar
          </h2>
          <div className="flex flex-col gap-3">
            {pendingConfirmations.map((match) => (
              <PendingConfirmationCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="torneo-actual">
        <h2 id="torneo-actual" className="mb-2 text-sm font-medium text-muted-foreground">
          Torneo actual
        </h2>
        <EmptyState
          icon={Trophy}
          title="No estás en ningún torneo"
          description="Explora los torneos disponibles cerca de ti para inscribirte."
        />
      </section>

      <section aria-labelledby="rating">
        <h2 id="rating" className="mb-2 text-sm font-medium text-muted-foreground">
          Rating
        </h2>
        <RatingBadge rating={player?.currentRating ?? null} rd={player?.currentRatingDeviation ?? null} />
      </section>

      <section aria-labelledby="ultimos-resultados">
        <h2 id="ultimos-resultados" className="mb-2 text-sm font-medium text-muted-foreground">
          Últimos resultados
        </h2>
        <EmptyState
          icon={ClockCounterClockwise}
          title="Todavía no jugaste ningún partido"
          description="Tu historial de resultados confirmados va a aparecer aquí."
        />
      </section>

      <section aria-labelledby="torneos-cerca">
        <h2 id="torneos-cerca" className="mb-2 text-sm font-medium text-muted-foreground">
          Torneos cerca
        </h2>
        <EmptyState
          icon={MapPin}
          title="Próximamente"
          description="El listado de torneos publicados cerca de ti está en camino."
        />
      </section>

      <section aria-labelledby="partidas-disponibles">
        <h2 id="partidas-disponibles" className="mb-2 text-sm font-medium text-muted-foreground">
          Partidas disponibles
        </h2>
        <EmptyState
          icon={UsersThree}
          title="Próximamente"
          description="Vas a poder crear y sumarte a partidas fuera de torneo."
        />
      </section>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/perfil" className="hover:underline">
          Completa tu perfil
        </Link>{" "}
        para que otros jugadores te encuentren.
      </p>
    </div>
  );
}
