import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function DescubrirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/descubrir" className="font-display text-lg font-semibold tracking-tight">
          Padel Platform
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium text-accent hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
