"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateBracketAction, type GenerateBracketState } from "../application/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: GenerateBracketState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Generar cuadro
    </Button>
  );
}

export function GenerateBracketButton({
  tournamentId,
  categoryId,
}: {
  tournamentId: string;
  categoryId: string;
}) {
  const boundAction = generateBracketAction.bind(null, tournamentId, categoryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton />
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
