"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { generateBracketAction, generateGroupStageAction } from "../application/bracketActions";

export function GenerateGroupStageButton({ tournamentId, categoryId }: { tournamentId: string; categoryId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateGroupStageAction(tournamentId, categoryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="secondary" size="sm" loading={isPending} onClick={handleClick} className="gap-1.5 self-start">
        <Sparkle className="size-4" />
        Generar grupos
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function GenerateBracketButton({ tournamentId, categoryId }: { tournamentId: string; categoryId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateBracketAction(tournamentId, categoryId);
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
        Generar cuadro
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
