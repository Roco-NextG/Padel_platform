"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersThree, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { AccountDetailField, PlatformAccount } from "../infrastructure/usersRepository";
import type { PlanRow } from "../infrastructure/billingRepository";
import {
  changePlanAction,
  deleteUserAction,
  fetchAccountDetailAction,
  makeAdminAction,
  setAccountActiveAction,
} from "../application/usersActions";

const ACCOUNT_TYPE_LABEL: Record<PlatformAccount["accountType"], string> = {
  JUGADOR: "Jugador",
  CLUB: "Club",
  ORGANIZADOR: "Organizador",
};

/**
 * Detalle de una cuenta — exactamente los datos que el admin cargó al
 * crearla (pedido explícito), no historial de negocio. En un portal a
 * document.body: AccountRow vive dentro de una lista con su propio
 * stacking context (Card + scroll), mismo criterio ya usado para el modal
 * de "Tabla general" del Cuadro.
 */
function AccountDetailModal({
  account,
  open,
  fields,
  loading,
  error,
  onClose,
}: {
  account: PlatformAccount;
  open: boolean;
  fields: AccountDetailField[] | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={account.displayName} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{account.displayName}</h3>
                  <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[account.accountType]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
            {error && (
              <span className="text-xs text-destructive" role="alert">
                {error}
              </span>
            )}
            {fields && (
              <dl className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">Email de la cuenta</dt>
                  <dd className="truncate font-medium text-foreground">{account.email ?? "—"}</dd>
                </div>
                {fields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
                    <dd className="truncate font-medium text-foreground">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

type FilterValue = "TODOS" | "ACTIVOS" | "JUGADOR" | "CLUB" | "ORGANIZADOR" | "INACTIVOS";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "TODOS", label: "All" },
  { value: "ACTIVOS", label: "Active" },
  { value: "JUGADOR", label: "Players" },
  { value: "CLUB", label: "Clubs" },
  { value: "ORGANIZADOR", label: "Managers" },
  { value: "INACTIVOS", label: "Inactive" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-VE", { year: "numeric", month: "short", day: "numeric" });
}

function AccountRow({
  account,
  plans,
  showManagement,
}: {
  account: PlatformAccount;
  plans: PlanRow[];
  showManagement: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canHavePlan = account.accountType === "CLUB" || account.accountType === "ORGANIZADOR";

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFields, setDetailFields] = useState<AccountDetailField[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  function handleViewDetail() {
    setDetailOpen(true);
    if (detailFields || detailLoading) return;
    setDetailLoading(true);
    setDetailError(null);
    fetchAccountDetailAction(account.accountType, account.entityId).then((result) => {
      setDetailLoading(false);
      if (result.error) setDetailError(result.error);
      else setDetailFields(result.fields);
    });
  }

  function handlePlanChange(planId: string) {
    if (!canHavePlan) return;
    setError(null);
    startTransition(async () => {
      const result = await changePlanAction(account.accountType as "CLUB" | "ORGANIZADOR", account.entityId, planId || null);
      setError(result.error);
    });
  }

  function handleMakeAdmin() {
    if (!account.userId) return;
    setError(null);
    startTransition(async () => {
      const result = await makeAdminAction(account.userId!);
      setError(result.error);
    });
  }

  function handleDelete() {
    if (!window.confirm(`¿Borrar la cuenta de "${account.displayName}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAction(account.accountType, account.entityId, account.userId);
      setError(result.error);
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setAccountActiveAction(account.accountType, account.entityId, account.userId, !account.isActive);
      setError(result.error);
    });
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleViewDetail}
          className="group flex min-w-0 items-center gap-3 rounded-md text-left"
          aria-label={`Ver detalle de ${account.displayName}`}
        >
          <Avatar name={account.displayName} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground group-hover:underline">{account.displayName}</span>
              <Badge tone="accent">{ACCOUNT_TYPE_LABEL[account.accountType]}</Badge>
              {account.isAdmin && <Badge tone="warning">Admin</Badge>}
              <Badge tone={account.isActive ? "success" : "neutral"}>{account.isActive ? "Activa" : "Inactiva"}</Badge>
            </div>
            {account.email && <span className="truncate text-xs text-muted-foreground">{account.email}</span>}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" size="sm" loading={isPending} onClick={handleToggleActive}>
            {account.isActive ? "Desactivar" : "Activar"}
          </Button>
          {showManagement && (
            <>
              {!account.isAdmin && account.userId && (
                <Button type="button" variant="secondary" size="sm" loading={isPending} onClick={handleMakeAdmin}>
                  Hacer admin
                </Button>
              )}
              {account.accountType === "JUGADOR" && (
                <Button type="button" variant="destructive" size="sm" loading={isPending} onClick={handleDelete}>
                  Borrar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {canHavePlan && (
          <div className="flex items-center gap-1.5">
            <span>Plan:</span>
            <Select
              value={account.planId ?? ""}
              onChange={(e) => handlePlanChange(e.target.value)}
              disabled={isPending}
              className="h-8 w-36 text-xs"
            >
              <option value="">Free</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <span>Última vez: {formatDate(account.lastActiveAt)}</span>
        <span>Alta: {formatDate(account.createdAt)}</span>
      </div>

      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}

      <AccountDetailModal
        account={account}
        open={detailOpen}
        fields={detailFields}
        loading={detailLoading}
        error={detailError}
        onClose={() => setDetailOpen(false)}
      />
    </Card>
  );
}

export function PlatformAccountList({
  accounts,
  plans,
  showManagement = false,
}: {
  accounts: PlatformAccount[];
  plans: PlanRow[];
  showManagement?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("TODOS");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (filter === "ACTIVOS" && !a.isActive) return false;
      if (filter === "INACTIVOS" && a.isActive) return false;
      if (["JUGADOR", "CLUB", "ORGANIZADOR"].includes(filter) && a.accountType !== filter) return false;
      if (!q) return true;
      return a.displayName.toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q);
    });
  }, [accounts, query, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
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
        <EmptyState icon={UsersThree} title="No hay cuentas" description="Ajusta el filtro o la búsqueda." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((a) => (
            <AccountRow key={`${a.accountType}-${a.entityId}`} account={a} plans={plans} showManagement={showManagement} />
          ))}
        </div>
      )}
    </div>
  );
}
