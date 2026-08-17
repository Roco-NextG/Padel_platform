"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { grantRoleAction, type GrantRoleState } from "../application/actions";
import { ALL_APP_ROLES, roleAcceptsOrganizer, roleLabel, roleRequiresClub } from "@/modules/auth/domain/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Select } from "@/components/ui/input";

const initialState: GrantRoleState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Otorgar rol
    </Button>
  );
}

export function GrantRoleForm({
  userId,
  clubs,
  organizers,
}: {
  userId: string;
  clubs: { id: string; name: string }[];
  organizers: { id: string; name: string }[];
}) {
  const boundAction = grantRoleAction.bind(null, userId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [role, setRole] = useState<AppRole>("PLAYER");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border-strong p-4">
      <Field id="role" label="Rol">
        <Select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
        >
          {ALL_APP_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </Select>
      </Field>

      {roleRequiresClub(role) && (
        <Field id="clubId" label="Club" hint="Requerido para este rol.">
          <Select id="clubId" name="clubId" defaultValue="">
            <option value="" disabled>
              Elegí un club
            </option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {roleAcceptsOrganizer(role) && (
        <Field id="organizerId" label="Organizador" optional hint="Sin esto, el rol no le da acceso a ningún torneo.">
          <Select id="organizerId" name="organizerId" defaultValue="">
            <option value="">Sin organizador</option>
            {organizers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <SubmitButton />
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
