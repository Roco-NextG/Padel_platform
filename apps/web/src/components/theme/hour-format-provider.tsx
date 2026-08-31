"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type HourFormat = "12h" | "24h";

interface HourFormatContextValue {
  hourFormat: HourFormat;
  setHourFormat: (format: HourFormat) => void;
}

const HourFormatContext = createContext<HourFormatContextValue | null>(null);

const STORAGE_KEY = "padel-hour-format";

export function HourFormatProvider({ children }: { children: React.ReactNode }) {
  const [hourFormat, setHourFormatState] = useState<HourFormat>("12h");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as HourFormat | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage (no visible en SSR), mismo criterio que ThemeProvider.
    if (stored === "24h") setHourFormatState("24h");
  }, []);

  const setHourFormat = (next: HourFormat) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setHourFormatState(next);
  };

  const value = useMemo(() => ({ hourFormat, setHourFormat }), [hourFormat]);

  return <HourFormatContext.Provider value={value}>{children}</HourFormatContext.Provider>;
}

export function useHourFormat() {
  const ctx = useContext(HourFormatContext);
  if (!ctx) throw new Error("useHourFormat must be used within HourFormatProvider");
  return ctx;
}
