"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown, UsersThree } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { AccountDetail, PlatformAccount } from "../infrastructure/usersRepository";
import type { PlanRow } from "../infrastructure/billingRepository";
import {
  changePlanAction,
  deleteUserAction,
  fetchAccountDetailAction,
  makeAdminAction,
  setAccountActiveAction,
  updateAccountDetailAction,
} from "../application/usersActions";

const ACCOUNT_TYPE_LABEL: Record<PlatformAccount["accountType"], string> = {
  JUGADOR: "Jugador",
  CLUB: "Club",
  ORGANIZADOR: "Organizador",
};

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

/**
 * Datos que el admin cargó al crear la cuenta, editables acá por si hubo un
 * error al cargarlos — pedido explícito: desplegable en el lugar, no modal.
 * Se pide bajo demanda (lazy) al abrir por primera vez, y cada campo se
 * guarda solo al perder foco (mismo criterio ya usado en CourtsManager /
 * OrganizerClubEditor).
 */
function AccountDetailFields({
  account,
  detail,
  onChange,
  onBlurSave,
}: {
  account: PlatformAccount;
  detail: AccountDetail;
  onChange: (patch: Partial<AccountDetail>) => void;
  onBlurSave: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
      <Field id={`acc-email-${account.entityId}`} label="Email de la cuenta">
        <Input id={`acc-email-${account.entityId}`} value={account.email ?? "—"} disabled />
      </Field>
      {account.accountType === "CLUB" && (
        <>
          <Field id={`acc-clubname-${account.entityId}`} label="Nombre del club">
            <Input
              id={`acc-clubname-${account.entityId}`}
              value={detail.clubName ?? ""}
              onChange={(e) => onChange({ clubName: e.target.value })}
              onBlur={onBlurSave}
            />
          </Field>
          <Field id={`acc-city-${account.entityId}`} label="Ciudad" optional>
            <Input
              id={`acc-city-${account.entityId}`}
              value={detail.city ?? ""}
              onChange={(e) => onChange({ city: e.target.value })}
              onBlur={onBlurSave}
            />
          </Field>
        </>
      )}
      <Field id={`acc-first-${account.entityId}`} label={account.accountType === "CLUB" ? "Nombre de contacto" : "Nombre"}>
        <Input
          id={`acc-first-${account.entityId}`}
          value={detail.firstName ?? ""}
          onChange={(e) => onChange({ firstName: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
      <Field id={`acc-last-${account.entityId}`} label={account.accountType === "CLUB" ? "Apellido de contacto" : "Apellido"}>
        <Input
          id={`acc-last-${account.entityId}`}
          value={detail.lastName ?? ""}
          onChange={(e) => onChange({ lastName: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
      <Field id={`acc-phone-${account.entityId}`} label="Teléfono" optional>
        <Input
          id={`acc-phone-${account.entityId}`}
          value={detail.phone ?? ""}
          onChange={(e) => onChange({ phone: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
      {account.accountType === "CLUB" && (
        <Field id={`acc-contactemail-${account.entityId}`} label="Email de contacto del club" optional>
          <Input
            id={`acc-contactemail-${account.entityId}`}
            value={detail.contactEmail ?? ""}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
            onBlur={onBlurSave}
          />
        </Field>
      )}
    </div>
  );
}

function AccountRow({
  account,
  plans,
  showManagement,
  onUpdate,
}: {
  account: PlatformAccount;
  plans: PlanRow[];
  showManagement: boolean;
  onUpdate: (patch: Partial<PlatformAccount>) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canHavePlan = account.accountType === "CLUB" || account.accountType === "ORGANIZADOR";

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [savePending, startSaveTransition] = useTransition();

  function handleToggleExpand() {
    setExpanded((v) => !v);
    if (detail || detailLoading) return;
    setDetailLoading(true);
    setDetailError(null);
    fetchAccountDetailAction(account.accountType, account.entityId).then((result) => {
      setDetailLoading(false);
      if (result.error) setDetailError(result.error);
      else setDetail(result.detail);
    });
  }

  function handleDetailChange(patch: Partial<AccountDetail>) {
    setDetail((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleDetailSave() {
    if (!detail) return;
    setDetailError(null);
    startSaveTransition(async () => {
      const result = await updateAccountDetailAction(account.accountType, account.entityId, detail);
      if (result.error) {
        setDetailError(result.error);
        return;
      }
      if (result.displayName) onUpdate({ displayName: result.displayName });
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
          onClick={handleToggleExpand}
          className="group flex min-w-0 items-center gap-3 rounded-md text-left"
          aria-expanded={expanded}
          aria-label={expanded ? `Ocultar datos de ${account.displayName}` : `Ver y editar datos de ${account.displayName}`}
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
          <CaretDown className={cn("size-3.5 shrink-0 text-foreground-tertiary transition-transform", expanded && "rotate-180")} weight="bold" />
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

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {detailLoading && <p className="border-t border-border pt-3 text-sm text-muted-foreground">Cargando...</p>}
            {detailError && (
              <span className="block border-t border-border pt-3 text-xs text-destructive" role="alert">
                {detailError}
              </span>
            )}
            {detail && (
              <AccountDetailFields account={account} detail={detail} onChange={handleDetailChange} onBlurSave={handleDetailSave} />
            )}
            {savePending && <p className="mt-1 text-[11px] text-muted-foreground">Guardando...</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export function PlatformAccountList({
  accounts: initialAccounts,
  plans,
  showManagement = false,
}: {
  accounts: PlatformAccount[];
  plans: PlanRow[];
  showManagement?: boolean;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("TODOS");

  function handleAccountUpdate(entityId: string, patch: Partial<PlatformAccount>) {
    setAccounts((prev) => prev.map((a) => (a.entityId === entityId ? { ...a, ...patch } : a)));
  }

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
            <AccountRow
              key={`${a.accountType}-${a.entityId}`}
              account={a}
              plans={plans}
              showManagement={showManagement}
              onUpdate={(patch) => handleAccountUpdate(a.entityId, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
