"use client";

import { useState, useTransition } from "react";
import { Check, Clock } from "@phosphor-icons/react";
import { Select } from "@/components/ui/input";
import { updateTimeZoneAction } from "../application/settingsActions";

export function TimeZoneSelector({ currentTimeZone, timeZones }: { currentTimeZone: string; timeZones: string[] }) {
  const [timeZone, setTimeZone] = useState(currentTimeZone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    setTimeZone(value);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updateTimeZoneAction(value);
      if (result.error) {
        setTimeZone(currentTimeZone);
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <Select value={timeZone} onChange={(e) => handleChange(e.target.value)} disabled={isPending} className="h-9 max-w-xs text-sm">
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        {saved && !isPending && (
          <span className="flex items-center gap-1 text-xs text-accent-text">
            <Check className="size-3.5" weight="bold" />
            Guardado
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Los partidos, el planificador y el reloj del panel se muestran en esta zona horaria.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
