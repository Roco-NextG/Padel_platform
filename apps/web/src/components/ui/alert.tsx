import { WarningCircle, CheckCircle, Info } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const config = {
  error: { icon: WarningCircle, classes: "bg-destructive-muted text-destructive" },
  success: { icon: CheckCircle, classes: "bg-success-muted text-success" },
  info: { icon: Info, classes: "bg-accent-muted text-accent" },
} as const;

export function Alert({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const { icon: IconComponent, classes } = config[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-md px-3.5 py-3 text-sm", classes)}
    >
      <IconComponent className="mt-0.5 size-4 shrink-0" weight="fill" />
      <span>{children}</span>
    </div>
  );
}
