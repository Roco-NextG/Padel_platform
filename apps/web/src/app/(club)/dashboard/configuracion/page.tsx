import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchClubCourts } from "@/modules/courts/infrastructure/courtRepository";
import { CourtsManager } from "@/modules/courts/ui/courts-manager";
import { TimeZoneSelector } from "@/modules/shell/ui/timezone-selector";
import { ProfileForm } from "@/modules/shell/ui/profile-form";
import { listTimeZones } from "@/lib/timezone";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Configuración — Padel Platform" };

export default async function ConfiguracionPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Esta cuenta no tiene un club u organizador asociado todavía.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          {account.name} · {account.role}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">{account.role === "Club" ? "Datos del club" : "Datos del organizador"}</h2>
          <p className="text-xs text-muted-foreground">
            {account.role === "Club"
              ? "Esta información aparece en tus torneos y es la que usan los jugadores para contactarte."
              : "Tus datos de contacto — visibles para los clubes que te alojen un torneo."}
          </p>
        </div>
        <Card>
          <ProfileForm account={account} />
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Zona horaria</h2>
          <p className="text-xs text-muted-foreground">
            {account.role === "Club"
              ? "La zona horaria de tu club — así se calculan las horas de tus partidos."
              : "Tu zona horaria personal, para el reloj del panel. Cada partido igual se muestra en la hora del club donde se juega."}
          </p>
        </div>
        <Card>
          <TimeZoneSelector currentTimeZone={account.timeZone} timeZones={listTimeZones()} />
        </Card>
      </div>

      {account.role === "Club" && account.clubId && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Pistas del club</h2>
            <p className="text-xs text-muted-foreground">
              Un Organizador que aloje un torneo en tu club va a ver esta lista al elegir dónde jugarlo.
            </p>
          </div>
          <CourtsManager clubId={account.clubId} courts={await fetchClubCourts(account.clubId)} />
        </div>
      )}
    </div>
  );
}
