import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ backgroundColor: "#121110", color: "#f5f4f2" }}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, var(--color-accent) 0%, transparent 45%), radial-gradient(circle at 85% 85%, var(--color-accent) 0%, transparent 40%)",
          }}
        />
        <div className="relative text-sm font-medium tracking-tight text-white/80">
          Padel Platform
        </div>
        <div className="relative flex flex-col gap-3">
          <p className="font-display text-6xl leading-[0.95] font-semibold tracking-tight">
            Datos. Red.
            <br />
            Rating.
          </p>
          <p className="max-w-sm text-base text-white/70">
            Organiza torneos de principio a fin y cada partido confirmado actualiza el rating de
            cada jugador.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight lg:hidden">
            Padel Platform
          </span>
          <div className="lg:ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">{children}</div>

        <div />
      </div>
    </div>
  );
}
