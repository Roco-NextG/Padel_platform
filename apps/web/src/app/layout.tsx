import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@/components/theme/theme-provider";
import { HourFormatProvider } from "@/components/theme/hour-format-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // 700 hace falta: `font-bold` se usa en 9 archivos del panel y sin este peso
  // cargado el navegador lo sintetiza (negrita falsa) en vez de usar el Inter
  // Bold real.
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DeuceUp",
  description: "Torneos, ranking y red de jugadores de pádel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={inter.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <HourFormatProvider>{children}</HourFormatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
