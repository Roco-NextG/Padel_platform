"use client";

import { cn } from "@/lib/utils";
import { useId, useState } from "react";

export function Switch({
  name,
  defaultChecked = false,
  label,
  description,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
}) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-border-strong px-4 py-3.5"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          name={name}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "h-6 w-11 rounded-full bg-border-strong transition-colors duration-150",
            "peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked && "translate-x-5"
          )}
        />
      </span>
    </label>
  );
}
