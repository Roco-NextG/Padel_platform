import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Hover lift + shadow — for cards that are themselves a click/nav target (wrap in Link, not onClick). */
  interactive?: boolean;
  /** Dashed border, transparent fill — for "add new X" affordances (padel-platform.html: .torneo-card-new). */
  dashed?: boolean;
}

export function Card({
  interactive = false,
  dashed = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4",
        dashed
          ? "border border-dashed border-border-strong bg-transparent"
          : "border border-border bg-surface shadow-sm",
        interactive && "cursor-pointer transition duration-200 hover:-translate-y-0.5",
        interactive && !dashed && "hover:shadow-md",
        interactive && dashed && "hover:border-foreground-tertiary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
