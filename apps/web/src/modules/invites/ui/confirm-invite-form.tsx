"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmInviteAction, type ConfirmInviteState } from "../application/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: ConfirmInviteState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      Activar mi cuenta
    </Button>
  );
}

export function ConfirmInviteForm({ code, next }: { code: string; next: string }) {
  const [state, formAction] = useActionState(confirmInviteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton />
    </form>
  );
}
