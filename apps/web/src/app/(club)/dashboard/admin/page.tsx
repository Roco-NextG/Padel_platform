import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MagnifyingGlass, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin, roleLabel } from "@/modules/auth/domain/roles";
import {
  getAuditLog,
  getSelectedUserDetail,
  getUserSearchResults,
} from "@/modules/admin/application/getAdminData";
import { GrantRoleForm } from "@/modules/admin/ui/grant-role-form";
import { RevokeRoleButton } from "@/modules/admin/ui/revoke-role-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin — Padel Platform" };

const AUDIT_ENTITY_TYPES = ["user_role", "match", "tournament", "club", "rating_event"] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; userId?: string; entity?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!isAdmin(context.roles)) redirect("/dashboard");

  const { q, userId, entity } = await searchParams;
  const results = q ? await getUserSearchResults(q) : [];
  const selected = userId ? await getSelectedUserDetail(userId) : null;
  const selectedUser = results.find((r) => r.user_id === userId);
  const auditLog = await getAuditLog(entity ?? null);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Usuarios y roles</h2>

        <form action="/dashboard/admin" method="GET" className="flex max-w-sm gap-2">
          <Input type="text" name="q" defaultValue={q ?? ""} placeholder="Buscar por email…" />
          <Button type="submit" size="md">
            <MagnifyingGlass className="size-4" />
          </Button>
        </form>

        {q && results.length === 0 && (
          <EmptyState icon={UserCircle} title="Sin resultados" description={`Ningún usuario coincide con "${q}".`} />
        )}

        {results.length > 0 && (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
            {results.map((r) => (
              <li key={r.user_id}>
                <Link
                  href={`/dashboard/admin?q=${encodeURIComponent(q ?? "")}&userId=${r.user_id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-secondary",
                    r.user_id === userId && "bg-accent-muted"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{r.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.first_name ? `${r.first_name} ${r.last_name ?? ""}`.trim() : "Sin perfil de jugador"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {selected && selectedUser && (
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Roles actuales de {selectedUser.email}
              </h3>
              {selected.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin roles asignados.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {selected.roles.map((role) => (
                    <li key={role.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{roleLabel(role.role)}</span>
                        {(role.club_id || role.organizer_id) && (
                          <span className="text-xs text-muted-foreground">
                            {role.club_id ? `club: ${role.club_id}` : `organizador: ${role.organizer_id}`}
                          </span>
                        )}
                      </div>
                      <RevokeRoleButton roleId={role.id} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex-1">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Otorgar un rol nuevo</h3>
              <GrantRoleForm userId={selectedUser.user_id} clubs={selected.clubs} organizers={selected.organizers} />
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Registro de auditoría</h2>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              !entity ? "bg-accent-muted text-accent" : "bg-surface-secondary text-muted-foreground"
            )}
          >
            Todos
          </Link>
          {AUDIT_ENTITY_TYPES.map((type) => (
            <Link
              key={type}
              href={`/dashboard/admin?entity=${type}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                entity === type ? "bg-accent-muted text-accent" : "bg-surface-secondary text-muted-foreground"
              )}
            >
              {type}
            </Link>
          ))}
        </div>

        {auditLog.length === 0 ? (
          <EmptyState icon={UserCircle} title="Sin actividad" description="Todavía no hay filas en el registro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3">Fecha</th>
                  <th className="py-1.5 pr-3">Entidad</th>
                  <th className="py-1.5 pr-3">Acción</th>
                  <th className="py-1.5">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("es-VE")}
                    </td>
                    <td className="py-1.5 pr-3">{entry.entity_type}</td>
                    <td className="py-1.5 pr-3">{entry.action}</td>
                    <td className="py-1.5 text-xs text-muted-foreground">{entry.actor_user_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
