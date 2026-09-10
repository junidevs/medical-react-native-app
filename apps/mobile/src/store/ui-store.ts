import { create } from "zustand";

import { getString, setString } from "@/lib/storage";

export type ThemePreference = "system" | "light" | "dark";

interface UiState {
  themePreference: ThemePreference;
  homeIntroSeen: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setHomeIntroSeen: (seen: boolean) => void;
}

const storedTheme = getString("themePreference") as ThemePreference | null;

export const useUiStore = create<UiState>((set) => ({
  themePreference: storedTheme ?? "system",
  homeIntroSeen: getString("homeIntroSeen") === "true",
  setThemePreference: (themePreference) => {
    setString("themePreference", themePreference);
    set({ themePreference });
  },
  setHomeIntroSeen: (homeIntroSeen) => {
    setString("homeIntroSeen", homeIntroSeen ? "true" : "false");
    set({ homeIntroSeen });
  }
}));
