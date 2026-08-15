"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitMatchResultAction, type MatchActionState } from "../application/actions";
import type { MatchWithContext } from "../domain/match";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";

const initialState: MatchActionState = { error: null, success: false };

function teamLabel(team: MatchWithContext["teamA"]): string {
  return team.players.map((p) => p.firstName).join(" / ") || "Equipo";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} size="lg" className="w-full sm:w-auto">
      Registrar resultado
    </Button>
  );
}

export function ScoreEntryForm({
  match,
  asOrganizer,
}: {
  match: MatchWithContext;
  asOrganizer: boolean;
}) {
  const action = submitMatchResultAction.bind(null, match.id, asOrganizer);
  const [state, formAction] = useActionState(action, initialState);

  const labelA = teamLabel(match.teamA);
  const labelB = teamLabel(match.teamB);
  const maxSets = match.scoringConfig.setsToWin * 2 - 1;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">Resultado registrado.</Alert>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-sm text-muted-foreground">
              <th className="w-1/3 font-medium">Set</th>
              <th className="font-medium">{labelA}</th>
              <th className="font-medium">{labelB}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxSets }, (_, i) => i + 1).map((setNumber) => (
              <tr key={setNumber}>
                <td className="py-1 text-sm text-muted-foreground">
                  Set {setNumber}
                  {setNumber > 1 && <span className="ml-1 text-xs">(opcional)</span>}
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      name={`set${setNumber}_teamA`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="w-16 text-center font-display text-xl"
                      aria-label={`Games de ${labelA} en el set ${setNumber}`}
                    />
                    <Input
                      name={`set${setNumber}_tbA`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="TB"
                      className="w-14 text-center text-xs"
                      aria-label={`Tiebreak de ${labelA} en el set ${setNumber}`}
                    />
                  </div>
                </td>
                <td className="py-1">
                  <div className="flex items-center gap-1.5">
                    <Input
                      name={`set${setNumber}_teamB`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="w-16 text-center font-display text-xl"
                      aria-label={`Games de ${labelB} en el set ${setNumber}`}
                    />
                    <Input
                      name={`set${setNumber}_tbB`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="TB"
                      className="w-14 text-center text-xs"
                      aria-label={`Tiebreak de ${labelB} en el set ${setNumber}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Ganador</span>
        <ChoiceGroup
          name="winner"
          options={[
            { value: "A", label: labelA },
            { value: "B", label: labelB },
          ]}
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
