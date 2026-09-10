import { StyleSheet, View } from "react-native";

import { Badge, Card, Skeleton } from "@/design/primitives";
import { AppText } from "@/design/typography";
import type { LoyaltyTier } from "@medconnect/shared";
import { useEffect } from "react";
import { useLoyaltySummary } from "./api";
import { syncLoyaltyWidget } from "./widget-storage";
import { useTheme } from "@/lib/theme";

const tierLabels: Record<LoyaltyTier, string> = { BRONZE: "Brąz", SILVER: "Srebro", GOLD: "Złoto" };

export function LoyaltyCard() {
  const theme = useTheme();
  const { data, isLoading } = useLoyaltySummary();

  useEffect(() => {
    if (data?.ok) syncLoyaltyWidget(data.data);
  }, [data]);

  if (isLoading) return <Skeleton height={178} radius={28} />;
  if (!data?.ok) return null;

  const { points, completedVisits, upcomingVisits, tier, pointsToNextTier } = data.data;
  const progress = pointsToNextTier > 0 ? Math.min(1, points / (points + pointsToNextTier)) : 1;

  return (
    <Card style={[styles.card, { backgroundColor: theme.primary }]} accessibleLabel={`Punkty MedConnect: ${points}. Poziom ${tierLabels[tier]}.`}>
      <View style={styles.headerRow}>
        <AppText color={theme.onPrimary} weight="900">Punkty MedConnect</AppText>
        <Badge tone="muted">{tierLabels[tier]}</Badge>
      </View>
      <AppText variant="hero" weight="900" color={theme.onPrimary} style={{ marginTop: 10 }}>{points}<AppText variant="heading" weight="800" color={theme.onPrimary}> pkt</AppText></AppText>
      <AppText color={theme.onPrimary} style={{ opacity: 0.78, marginTop: 4 }}>
        {pointsToNextTier > 0 ? `Jeszcze ${pointsToNextTier} pkt do wyższego progu` : "Masz najwyższy próg - gratulacje!"}
      </AppText>
      <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.onPrimary }]} />
      </View>
      <View style={styles.statsRow}>
        <Stat value={completedVisits} label="Odbyte" />
        <Stat value={upcomingVisits} label="Nadchodzące" />
      </View>
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <AppText variant="heading" weight="900" color={theme.onPrimary}>{value}</AppText>
      <AppText variant="caption" color={theme.onPrimary} style={{ opacity: 0.78 }}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTrack: { height: 8, borderRadius: 99, marginTop: 18, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 99 },
  statsRow: { flexDirection: "row", marginTop: 18, gap: 10 },
  stat: { flex: 1, padding: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center" }
});
