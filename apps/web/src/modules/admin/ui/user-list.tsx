"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusToggleButton } from "./status-toggle-button";
import type { AccountRow } from "../infrastructure/adminRepository";
import { roleLabel } from "@/modules/auth/domain/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { UsersThree } from "@phosphor-icons/react";

const FILTERS: { value: AppRole | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "ADMIN", label: "Admin" },
  { value: "CLUB", label: "Club" },
  { value: "ORGANIZADOR", label: "Organizador" },
];

export function UserList({ accounts }: { accounts: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "TODOS">("TODOS");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "TODOS" && a.role !== roleFilter) return false;
      if (!q) return true;
      return (a.email ?? "").toLowerCase().includes(q) || (a.scopeName ?? "").toLowerCase().includes(q);
    });
  }, [accounts, query, roleFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por email o nombre..."
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setRoleFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                roleFilter === f.value
                  ? "border-accent bg-accent-muted text-accent-text"
                  : "border-border-strong text-muted-foreground hover:bg-surface-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="No hay cuentas todavía"
          description="Las cuentas que invites desde 'Invitar' van a aparecer acá."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <Card key={`${a.userId}-${a.role}-${a.scopeId ?? "none"}`} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{a.email ?? "(sin email)"}</span>
                  <Badge tone="accent">{roleLabel(a.role)}</Badge>
                  <Badge tone={a.isActive ? "success" : "neutral"}>{a.isActive ? "Activa" : "Inactiva"}</Badge>
                </div>
                {a.scopeName && <span className="text-xs text-muted-foreground">{a.scopeName}</span>}
              </div>
              {(a.role === "CLUB" || a.role === "ORGANIZADOR") && (
                <StatusToggleButton userId={a.userId} role={a.role} scopeId={a.scopeId} isActive={a.isActive} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
