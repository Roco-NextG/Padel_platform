import type { Metadata } from "next";
import Link from "next/link";
import { getUsersData } from "@/modules/admin/application/getUsersData";
import { PlatformAccountList } from "@/modules/admin/ui/platform-account-list";
import { AdminList } from "@/modules/admin/ui/admin-list";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Users — Admin" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const { accounts, plans, admins } = await getUsersData();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Todas las cuentas de la plataforma.{" "}
            <Link href="/admin/invitaciones" className="text-accent-text hover:underline">
              Ver invitaciones pendientes →
            </Link>
          </p>
        </div>
        <Link href="/admin/usuarios/nuevo">
          <Button>Add new user</Button>
        </Link>
      </div>

      {created === "1" && (
        <Alert tone="success">Cuenta creada — se envió un email de invitación para que active su acceso.</Alert>
      )}

      <PlatformAccountList accounts={accounts} plans={plans} showManagement />

      <AdminList admins={admins} />
    </div>
  );
}
