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
  GearSix,
  CaretDown,
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Sidebar del panel Club/Organizador — anatomía calcada de padel-platform.html
 * (.workspace / .nav-item / .profile-card): workspace = la entidad (club u
 * organizador), profile-card = quién está logueado — son roles distintos
 * incluso cuando hoy comparten cuenta. La cápsula activa se desliza entre
 * items con layoutId en vez de reaparecer en el siguiente (motion real con
 * justificación: comunica "seguís en la misma nav, solo cambió el foco",
 * no decoración). Un solo elemento animado por vez, sin loops perpetuos.
 */
export function ClubSidebar({
  workspaceName,
  workspaceSub,
  contactName,
  accountRole,
  liveMatchCount,
}: {
  workspaceName: string;
  workspaceSub: string;
  contactName: string;
  accountRole: "Club" | "Organizador";
  liveMatchCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-[calc(100vh-2.5rem)] w-64 shrink-0 flex-col gap-4 self-start rounded-xl border border-border bg-surface-secondary p-3.5">
      <div className="flex items-center gap-2.5 border-b border-border px-1 pb-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-inverse text-[13px] font-semibold text-inverse-foreground">
          {initials(workspaceName)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium leading-tight text-foreground">{workspaceName}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">{workspaceSub}</div>
        </div>
        <CaretDown className="ml-auto size-3.5 shrink-0 rotate-90 text-foreground-tertiary" weight="bold" />
      </div>

      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const badge = item.href === "/dashboard/partidos" && liveMatchCount > 0 ? liveMatchCount : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13.5px] transition-colors",
                active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="club-sidebar-active"
                  className="absolute inset-0 rounded-[11px] bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative size-[17px]" weight={active ? "fill" : "regular"} style={active ? { color: "var(--accent-strong)" } : undefined} />
              <span className="relative">{item.label}</span>
              {badge !== null && (
                <span className="relative ml-auto rounded-full bg-accent-muted px-1.5 py-px text-[10.5px] font-medium text-accent-text">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="h-px bg-border" />

      <Link
        href="/dashboard/configuracion"
        className={cn(
          "flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13.5px] transition-colors",
          isActive(pathname, "/dashboard/configuracion") ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <GearSix className="size-[17px]" />
        Configuración
      </Link>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-accent-foreground"
          style={{ background: "linear-gradient(160deg, #dce8b0, var(--accent))" }}
        >
          {initials(contactName)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium leading-tight text-foreground">{contactName}</div>
          <div className="truncate text-[11px] text-muted-foreground">{accountRole}</div>
        </div>
        <CaretDown className="ml-auto size-3.5 shrink-0 text-foreground-tertiary" weight="bold" />
      </div>
    </nav>
  );
}
