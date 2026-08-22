import type { Metadata } from "next";
import { fetchPlans } from "@/modules/admin/infrastructure/billingRepository";
import { CreateUserForm } from "@/modules/admin/ui/create-user-form";

export const metadata: Metadata = { title: "Nuevo usuario — Admin" };

export default async function NewUserPage() {
  const plans = await fetchPlans();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo usuario</h1>
        <p className="text-sm text-muted-foreground">Crea la cuenta y envía la invitación por email.</p>
      </div>
      <CreateUserForm plans={plans.filter((p) => p.isActive)} />
    </div>
  );
}
