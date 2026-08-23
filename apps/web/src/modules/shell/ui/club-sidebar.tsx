"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  SquaresFour,
  Trophy,
  CalendarBlank,
  UsersThree,
  ImageSquare,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof SquaresFour;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/dashboard/torneos", label: "Torneos", icon: Trophy },
  { href: "/dashboard/partidos", label: "Partidos", icon: CalendarBlank },
  { href: "/dashboard/jugadores", label: "Jugadores", icon: UsersThree },
  { href: "/dashboard/contenido", label: "Contenido", icon: ImageSquare },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

/**
 * Sidebar del panel Club/Organizador — la cápsula activa se desliza entre
 * items con layoutId en vez de reaparecer en el siguiente (motion real con
 * justificación: comunica "seguís en la misma nav, solo cambió el foco",
 * no decoración). Un solo elemento animado por vez, sin loops perpetuos.
 */
export function ClubSidebar({
  accountName,
  accountRole,
}: {
  accountName: string;
  accountRole: "Club" | "Organizador";
}) {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface-secondary px-3 py-5">
      <div className="px-2.5 pb-5">
        <span className="font-display text-base font-semibold tracking-tight">Padel Platform</span>
      </div>

      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active ? "text-accent-text" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="club-sidebar-active"
                className="absolute inset-0 rounded-md bg-accent-muted"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative size-[18px]" weight={active ? "fill" : "regular"} />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        <div className="px-2.5 pb-1">
          <span className="block truncate text-sm font-medium text-foreground">{accountName}</span>
          <span className="text-xs text-muted-foreground">{accountRole}</span>
        </div>
        <Link
          href="/dashboard/configuracion"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
            isActive(pathname, "/dashboard/configuracion")
              ? "text-accent-text"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Configuración
        </Link>
      </div>
    </nav>
  );
}
