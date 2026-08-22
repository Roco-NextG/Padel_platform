import type { Metadata } from "next";
import { fetchPlans } from "@/modules/admin/infrastructure/billingRepository";
import { PlansList } from "@/modules/admin/ui/plans-list";

export const metadata: Metadata = { title: "Configuración — Admin" };

export default async function ConfiguracionPage() {
  const plans = await fetchPlans();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Planes de la plataforma. Después de crear el Product/Price en tu Stripe Dashboard, pegá el Price ID
          acá — sin eso no se puede generar checkout real para ese plan.
        </p>
      </div>
      <PlansList plans={plans} />
    </div>
  );
}
