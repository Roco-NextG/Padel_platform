import { DeuceUpWordmark } from "@/components/brand/deuceup-wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="relative hidden overflow-hidden lg:block"
        style={{
          backgroundImage: "url(/brand/login-poster.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "top center",
        }}
      />

      <div className="flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <span className="text-foreground lg:hidden">
            <DeuceUpWordmark className="h-5 w-auto" />
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
