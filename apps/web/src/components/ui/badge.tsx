import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "destructive" | "pause" | "cancel";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-secondary text-muted-foreground",
  accent: "bg-accent-muted text-accent-text",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  destructive: "bg-destructive-muted text-destructive",
  pause: "bg-pause-muted text-pause",
  cancel: "bg-cancel-muted text-cancel",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
