import type { Metadata } from "next";
import Link from "next/link";
import { getOverviewData } from "@/modules/admin/application/getOverviewData";
import { fetchPlans } from "@/modules/admin/infrastructure/billingRepository";
import { KpiCards } from "@/modules/admin/ui/kpi-cards";
import { PlatformAccountList } from "@/modules/admin/ui/platform-account-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Overview — Admin" };

export default async function AdminOverviewPage() {
  const [{ kpis, accounts }, plans] = await Promise.all([getOverviewData(), fetchPlans()]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Estado general de la plataforma.</p>
        </div>
        <Link href="/admin/usuarios/nuevo">
          <Button>New user</Button>
        </Link>
      </div>

      <KpiCards kpis={kpis} />

      <PlatformAccountList accounts={accounts} plans={plans.filter((p) => p.isActive)} />
    </div>
  );
}
