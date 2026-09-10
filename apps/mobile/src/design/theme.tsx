import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

import { palette } from "./tokens";
import { useUiStore } from "@/store/ui-store";

export interface Theme {
  mode: "light" | "dark";
  background: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  text: string;
  muted: string;
  subtle: string;
  primary: string;
  primaryText: string;
  onPrimary: string;
  border: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  success: string;
  warning: string;
  accentLilac: string;
  accentPeach: string;
  accentMint: string;
  accentSky: string;
  glass: string;
}

const light: Theme = {
  mode: "light",
  background: "#f5f6f8",
  surface: "#ffffff",
  surfaceAlt: palette.coral50,
  elevated: "rgba(255,255,255,0.9)",
  text: palette.ink,
  muted: "#697386",
  subtle: "#9aa3b2",
  primary: palette.coral600,
  primaryText: palette.coral600,
  onPrimary: "#ffffff",
  border: "rgba(20,22,37,0.08)",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  dangerText: "#b91c1c",
  success: "#16a34a",
  warning: "#d97706",
  accentLilac: palette.lilac,
  accentPeach: palette.peach,
  accentMint: palette.mint,
  accentSky: palette.sky,
  glass: "rgba(255,255,255,0.75)"
};

const dark: Theme = {
  mode: "dark",
  background: "#0f1320",
  surface: "#171c2b",
  surfaceAlt: "rgba(240,80,60,0.14)",
  elevated: "rgba(23,28,43,0.85)",
  text: "#f4f6fb",
  muted: "#9aa4b8",
  subtle: "#6b7488",
  primary: palette.coral500,
  primaryText: "#ff9c8b",
  onPrimary: "#2a0e08",
  border: "rgba(226,232,240,0.10)",
  danger: "#f87171",
  dangerBg: "rgba(127,29,29,0.44)",
  dangerText: "#fecaca",
  success: "#4ade80",
  warning: "#fbbf24",
  accentLilac: "rgba(217,204,255,0.82)",
  accentPeach: "rgba(255,199,106,0.88)",
  accentMint: "rgba(167,243,208,0.84)",
  accentSky: "rgba(186,230,253,0.82)",
  glass: "rgba(23,28,43,0.72)"
};

const ThemeContext = createContext<Theme>(light);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const preference = useUiStore((state) => state.themePreference);
  const mode = preference === "system" ? (scheme === "dark" ? "dark" : "light") : preference;
  const value = useMemo(() => (mode === "dark" ? dark : light), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
