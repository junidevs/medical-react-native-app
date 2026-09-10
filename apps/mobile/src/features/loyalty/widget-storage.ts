import { Platform } from "react-native";

import { env } from "@/lib/env";
import type { LoyaltySummary, LoyaltyTier } from "@medconnect/shared";

const tierLabels: Record<LoyaltyTier, string> = {
  BRONZE: "Brąz",
  SILVER: "Srebro",
  GOLD: "Złoto"
};

// Pushes the loyalty summary into the iOS home-screen widget via expo-widgets.
// The native module (and the @expo/ui runtime) only exist after a development
// build that bundles expo-widgets, so we lazily require it and swallow failures
// to keep the JS bundle running on older builds that predate the widget.
export function syncLoyaltyWidget(summary: LoyaltySummary): void {
  if (!env.features.widgets) return;
  if (Platform.OS !== "ios") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LoyaltyWidget } = require("@/widgets/loyalty-widget");
    LoyaltyWidget.updateSnapshot({
      points: summary.points,
      tier: tierLabels[summary.tier],
      completedVisits: summary.completedVisits,
      upcomingVisits: summary.upcomingVisits
    });
  } catch {
    // Widget native module unavailable until the next native build   safe to ignore.
  }
}
