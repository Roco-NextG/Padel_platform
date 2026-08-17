"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { revokeRoleAction, type RevokeRoleState } from "../application/actions";
import { Alert } from "@/components/ui/alert";

const initialState: RevokeRoleState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
    >
      Revocar
    </button>
  );
}

export function RevokeRoleButton({ roleId }: { roleId: string }) {
  const boundAction = revokeRoleAction.bind(null, roleId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <SubmitButton />
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
