"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, X } from "@phosphor-icons/react";
import {
  confirmMatchResultAction,
  rejectMatchResultAction,
  type MatchActionState,
} from "../application/actions";
import type { MatchWithContext } from "../domain/match";
import { MatchScoreline } from "./match-scoreline";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const initialState: MatchActionState = { error: null, success: false };

function ActionButton({
  variant,
  children,
}: {
  variant: "confirm" | "reject";
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-50",
        variant === "confirm"
          ? "bg-success-muted text-success hover:bg-success/20"
          : "border border-border-strong text-muted-foreground hover:bg-surface-secondary"
      )}
    >
      {children}
    </button>
  );
}

export function PendingConfirmationCard({ match }: { match: MatchWithContext }) {
  const confirmAction = confirmMatchResultAction.bind(null, match.id);
  const rejectAction = rejectMatchResultAction.bind(null, match.id);
  const [confirmState, submitConfirm] = useActionState(confirmAction, initialState);
  const [rejectState, submitReject] = useActionState(rejectAction, initialState);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-strong p-4">
      {match.tournamentName && (
        <p className="text-xs font-medium text-muted-foreground">{match.tournamentName}</p>
      )}
      <MatchScoreline match={match} />

      {(confirmState.error || rejectState.error) && (
        <Alert tone="error">{confirmState.error ?? rejectState.error}</Alert>
      )}

      <div className="flex gap-2">
        <form action={submitReject} className="flex flex-1">
          <ActionButton variant="reject">
            <X className="size-4" weight="bold" />
            Rechazar
          </ActionButton>
        </form>
        <form action={submitConfirm} className="flex flex-1">
          <ActionButton variant="confirm">
            <Check className="size-4" weight="bold" />
            Confirmar
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
