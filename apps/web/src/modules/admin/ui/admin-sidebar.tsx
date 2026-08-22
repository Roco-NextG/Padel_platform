"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  UsersThree,
  CreditCard,
  Receipt,
  WarningCircle,
  ChartLineUp,
  ListBullets,
  GearSix,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof SquaresFour;
}

const TOP_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: SquaresFour },
  { href: "/admin/usuarios", label: "Users", icon: UsersThree },
];

const SUSCRIPCIONES_ITEMS: NavItem[] = [
  { href: "/admin/suscripciones/activas", label: "Active plans", icon: CreditCard },
  { href: "/admin/suscripciones/pagos", label: "Payments", icon: Receipt },
  { href: "/admin/suscripciones/problemas", label: "Payment issues", icon: WarningCircle },
];

const SYSTEM_ITEMS: NavItem[] = [
  { href: "/admin/sistema/kpis", label: "KPIs", icon: ChartLineUp },
  { href: "/admin/sistema/logs", label: "System logs", icon: ListBullets },
  { href: "/admin/sistema/configuracion", label: "Configuration", icon: GearSix },
];

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-accent-muted text-accent-text" : "text-muted-foreground hover:bg-surface hover:text-foreground"
      )}
    >
      <Icon className="size-[18px]" weight={active ? "fill" : "regular"} />
      {item.label}
    </Link>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2.5 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
      {items.map((item) => (
        <NavRow key={item.href} item={item} active={pathname === item.href} />
      ))}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-64 shrink-0 flex-col gap-0.5 border-r border-border bg-surface-secondary px-3 py-4">
      <div className="px-2.5 pb-3 font-display text-base font-semibold tracking-tight">Padel Platform</div>
      {TOP_ITEMS.map((item) => (
        <NavRow key={item.href} item={item} active={pathname === item.href} />
      ))}
      <NavGroup label="Suscripciones" items={SUSCRIPCIONES_ITEMS} pathname={pathname} />
      <NavGroup label="System" items={SYSTEM_ITEMS} pathname={pathname} />
    </nav>
  );
}
