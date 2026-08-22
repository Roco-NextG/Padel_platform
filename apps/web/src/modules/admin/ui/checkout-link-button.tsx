"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateCheckoutLinkAction } from "../application/billingActions";

export function CheckoutLinkButton({
  accountType,
  accountId,
  planId,
}: {
  accountType: "CLUB" | "ORGANIZADOR";
  accountId: string;
  planId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ url: string | null; error: string | null } | null>(null);

  function generate() {
    setResult(null);
    startTransition(async () => {
      const res = await generateCheckoutLinkAction(accountType, accountId, planId);
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" loading={isPending} onClick={generate}>
        Generar link de checkout
      </Button>
      {result?.error && (
        <span className="max-w-xs text-right text-xs text-destructive" role="alert">
          {result.error}
        </span>
      )}
      {result?.url && (
        <input
          readOnly
          value={result.url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-64 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground"
        />
      )}
    </div>
  );
}
