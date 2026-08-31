"use client";

import { useEffect, useRef, useState } from "react";
import { Gear } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useHourFormat } from "@/components/theme/hour-format-provider";
import { TimeZoneSelector } from "./timezone-selector";
import { cn } from "@/lib/utils";

function HourFormatToggle() {
  const { hourFormat, setHourFormat } = useHourFormat();
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-surface-secondary p-1">
      {(["12h", "24h"] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setHourFormat(f)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            hourFormat === f ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {f === "12h" ? "12 horas" : "24 horas"}
        </button>
      ))}
    </div>
  );
}

export function SettingsMenu({ currentTimeZone, timeZones }: { currentTimeZone: string; timeZones: string[] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Configuración rápida"
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground",
          open && "bg-surface-secondary text-foreground"
        )}
      >
        <Gear className="size-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 flex w-72 flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-lg">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zona horaria</span>
            <TimeZoneSelector currentTimeZone={currentTimeZone} timeZones={timeZones} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formato de hora</span>
            <HourFormatToggle />
          </div>
        </div>
      )}
    </div>
  );
}
