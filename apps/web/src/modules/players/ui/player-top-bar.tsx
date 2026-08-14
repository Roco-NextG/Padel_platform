import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { belongsOnClubSurface } from "@/modules/auth/domain/roles";
import type { UserContext } from "@/modules/auth/application/getCurrentUserContext";

export function PlayerTopBar({ context }: { context: UserContext }) {
  return (
    <header className="flex items-center justify-between px-4 pt-4">
      <span className="font-display text-lg font-semibold tracking-tight">Padel Platform</span>
      <div className="flex items-center gap-2">
        {belongsOnClubSurface(context.roles) && (
          <Link
            href="/dashboard"
            className="flex h-9 items-center gap-1 rounded-full bg-surface-secondary px-3 text-xs font-medium text-foreground"
          >
            Panel de club
            <ArrowRight className="size-3.5" />
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
