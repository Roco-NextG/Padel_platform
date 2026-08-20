"use client";

import { useState, useTransition } from "react";
import { setAccountActiveAction } from "../application/actions";
import type { AppRole } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";

/** Botón con confirmación, no un Switch instantáneo — esto banea una cuenta real, merece un paso extra antes de ejecutarse. */
export function StatusToggleButton({
  userId,
  role,
  scopeId,
  isActive,
}: {
  userId: string;
  role: AppRole;
  scopeId: string | null;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const verb = isActive ? "desactivar" : "reactivar";
    if (!window.confirm(`¿Seguro que quieres ${verb} esta cuenta?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setAccountActiveAction(userId, role, scopeId, !isActive);
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant={isActive ? "destructive" : "secondary"} size="sm" loading={isPending} onClick={toggle}>
        {isActive ? "Desactivar" : "Reactivar"}
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
