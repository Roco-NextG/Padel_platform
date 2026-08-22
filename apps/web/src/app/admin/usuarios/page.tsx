import type { Metadata } from "next";
import Link from "next/link";
import { getUsersData } from "@/modules/admin/application/getUsersData";
import { PlatformAccountList } from "@/modules/admin/ui/platform-account-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  const { accounts, plans } = await getUsersData();

  return (
    <div className="flex flex-col gap-6">
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

      <PlatformAccountList accounts={accounts} plans={plans} showManagement />
    </div>
  );
}
