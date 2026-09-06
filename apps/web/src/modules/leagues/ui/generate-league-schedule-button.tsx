"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { generateLeagueScheduleAction } from "../application/leagueScheduleActions";

export function GenerateLeagueScheduleButton({ leagueId, categoryId }: { leagueId: string; categoryId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateLeagueScheduleAction(leagueId, categoryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" loading={isPending} onClick={handleClick} className="gap-1.5 self-start">
        <Sparkle className="size-4" />
        Generar jornadas
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
