"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Trophy,
  CalendarBlank,
  Users,
  ChartBar,
  ImageSquare,
  ChartLineUp,
  Buildings,
  IdentificationCard,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/dashboard/torneos", label: "Torneos", icon: Trophy },
  { href: "/dashboard/partidos", label: "Partidos", icon: CalendarBlank },
  { href: "/dashboard/jugadores", label: "Jugadores", icon: Users },
  { href: "/dashboard/ranking", label: "Ranking", icon: ChartBar },
  { href: "/dashboard/contenido", label: "Contenido", icon: ImageSquare },
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineUp },
] as const;

const settingsItems = [
  { href: "/dashboard/club", label: "Mi club", icon: Buildings },
  { href: "/dashboard/organizador", label: "Organizador", icon: IdentificationCard },
] as const;

function NavLink({
  href,
  label,
  icon: IconComponent,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; weight?: "regular" | "fill" }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-accent-muted text-accent"
          : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
      )}
    >
      <IconComponent className="size-[18px]" weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface-secondary/50 px-3 py-5">
      <span className="font-display px-3 text-lg font-semibold tracking-tight">
        Padel Platform
      </span>

      <nav className="flex flex-col gap-0.5">
        {primaryItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <span className="px-3 pb-1 text-xs font-medium text-muted-foreground">Configuración</span>
        {settingsItems.map((item) => (
          <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </aside>
  );
}
