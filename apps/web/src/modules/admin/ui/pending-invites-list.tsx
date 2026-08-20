"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { revokeInviteAction } from "../application/actions";
import type { PendingInviteRow } from "../infrastructure/adminRepository";
import { roleLabel } from "@/modules/auth/domain/roles";
import { EnvelopeSimple } from "@phosphor-icons/react";

const STATUS_TONE: Record<string, "warning" | "success" | "neutral" | "destructive"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REVOKED: "neutral",
  EXPIRED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REVOKED: "Revocada",
  EXPIRED: "Vencida",
};

function InviteRow({ invite }: { invite: PendingInviteRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canRevoke = invite.status === "PENDING";

  function revoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeInviteAction(invite.id);
      setError(result.error);
    });
  }

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{invite.email}</span>
          <Badge tone="accent">{roleLabel(invite.role)}</Badge>
          <Badge tone={STATUS_TONE[invite.status] ?? "neutral"}>{STATUS_LABEL[invite.status] ?? invite.status}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {invite.scopeName ?? "—"} · vence {new Date(invite.expiresAt).toLocaleDateString("es-VE")}
        </span>
        {error && (
          <span className="text-xs text-destructive" role="alert">
            {error}
          </span>
        )}
      </div>
      {canRevoke && (
        <Button type="button" variant="destructive" size="sm" loading={isPending} onClick={revoke}>
          Revocar
        </Button>
      )}
    </Card>
  );
}

export function PendingInvitesList({ invites }: { invites: PendingInviteRow[] }) {
  if (invites.length === 0) {
    return (
      <EmptyState
        icon={EnvelopeSimple}
        title="No hay invitaciones todavía"
        description="Las invitaciones que envíes desde 'Invitar' van a aparecer acá hasta que se acepten, revoquen o venzan."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {invites.map((i) => (
        <InviteRow key={i.id} invite={i} />
      ))}
    </div>
  );
}
