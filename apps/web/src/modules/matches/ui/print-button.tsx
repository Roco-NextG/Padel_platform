"use client";

import { Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" />
      Guardar como PDF
    </Button>
  );
}
