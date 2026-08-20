import type { Metadata } from "next";
import { getAccounts } from "@/modules/admin/application/getAdminData";
import { UserList } from "@/modules/admin/ui/user-list";

export const metadata: Metadata = { title: "Usuarios — Admin — Padel Platform" };

export default async function AdminUsersPage() {
  const accounts = await getAccounts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Todas las cuentas de la plataforma — admin, clubes y organizadores.</p>
      </div>
      <UserList accounts={accounts} />
    </div>
  );
}
