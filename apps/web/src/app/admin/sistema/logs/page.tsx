import type { Metadata } from "next";
import { fetchSystemLogs } from "@/modules/admin/infrastructure/billingRepository";
import { EmptyState } from "@/components/ui/empty-state";
import { SystemLogRow } from "@/modules/admin/ui/system-log-row";
import { ListBullets } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "System logs — Admin" };

export default async function SystemLogsPage() {
  const events = await fetchSystemLogs();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System logs</h1>
        <p className="text-sm text-muted-foreground">
          Log real de eventos de billing — cada webhook de Stripe recibido y cada cambio de plan manual.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={ListBullets} title="Sin eventos todavía" description="Los webhooks de Stripe y los cambios de plan van a aparecer acá." />
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <SystemLogRow key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
