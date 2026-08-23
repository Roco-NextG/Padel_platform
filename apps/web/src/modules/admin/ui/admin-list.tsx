"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { revokeAdminAction } from "../application/usersActions";
import type { AdminAccount } from "../infrastructure/usersRepository";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { year: "numeric", month: "short", day: "numeric" });
}

function AdminRow({ admin }: { admin: AdminAccount }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    if (!window.confirm(`¿Revocar el rol de admin de "${admin.email ?? admin.userId}"? Pierde acceso a este panel.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await revokeAdminAction(admin.userId);
      setError(result.error);
    });
  }

  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={admin.email ?? "?"} />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{admin.email ?? "(sin email)"}</span>
              <Badge tone="warning">Admin</Badge>
            </div>
            <span className="text-xs text-muted-foreground">Admin desde {formatDate(admin.createdAt)}</span>
          </div>
        </div>
        <Button type="button" variant="destructive" size="sm" loading={isPending} onClick={handleRevoke}>
          Revocar
        </Button>
      </div>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </Card>
  );
}

/**
 * Los admins no aparecen en PlatformAccountList (no son clubs/organizers/
 * players, y a propósito no cuentan en ningún KPI de ingresos) — esta es
 * la única forma de verlos y revocarles el rol.
 */
export function AdminList({ admins }: { admins: AdminAccount[] }) {
  if (admins.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Administradores</h2>
      <div className="flex flex-col gap-2">
        {admins.map((a) => (
          <AdminRow key={a.userId} admin={a} />
        ))}
      </div>
    </div>
  );
}
