"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BillingEventRow } from "../infrastructure/billingRepository";

export function SystemLogRow({ event }: { event: BillingEventRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{event.eventType}</span>
          <span className="text-xs text-muted-foreground">{event.accountName}</span>
          <Badge tone={event.source === "stripe" ? "accent" : "neutral"}>{event.source === "stripe" ? "Stripe" : "Manual"}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("es-VE")}</span>
      </button>
      {expanded && event.rawPayload && (
        <pre className="overflow-x-auto rounded-md bg-surface-secondary p-3 text-xs text-muted-foreground">
          {JSON.stringify(event.rawPayload, null, 2)}
        </pre>
      )}
    </Card>
  );
}
