"use client";

import { cn } from "@/lib/utils";
import { useId, useState } from "react";

export function ChoiceGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  const groupId = useId();
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = `${groupId}-${option.value}`;
        const isSelected = selected === option.value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex h-11 min-w-16 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors duration-150",
              isSelected
                ? "border-accent bg-accent-muted text-accent"
                : "border-border-strong text-foreground hover:bg-surface-secondary"
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => setSelected(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
