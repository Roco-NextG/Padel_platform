"use client";

import { Sun, Moon, DeviceMobile } from "@phosphor-icons/react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

const options = [
  { value: "light" as const, icon: Sun, label: "Claro" },
  { value: "system" as const, icon: DeviceMobile, label: "Sistema" },
  { value: "dark" as const, icon: Moon, label: "Oscuro" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-surface-secondary p-1">
      {options.map(({ value, icon: IconComponent, label }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-colors duration-150",
            theme === value
              ? "bg-surface text-accent shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <IconComponent className="size-4" weight={theme === value ? "fill" : "regular"} />
        </button>
      ))}
    </div>
  );
}
