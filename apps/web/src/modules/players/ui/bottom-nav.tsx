"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Trophy, Plus, ChartBar, UserCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Inicio", icon: House, emphasized: false },
  { href: "/torneos", label: "Torneos", icon: Trophy, emphasized: false },
  { href: "/jugar", label: "Jugar", icon: Plus, emphasized: true },
  { href: "/ranking", label: "Ranking", icon: ChartBar, emphasized: false },
  { href: "/perfil", label: "Perfil", icon: UserCircle, emphasized: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {items.map(({ href, label, icon: IconComponent, emphasized }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          if (emphasized) {
            return (
              <Link key={href} href={href} className="flex flex-1 items-center justify-center">
                <span className="-mt-5 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30">
                  <IconComponent className="size-6" weight="bold" />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
            >
              <IconComponent className="size-5" weight={isActive ? "fill" : "regular"} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
