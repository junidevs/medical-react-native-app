import { router } from "expo-router";
import { StyleSheet, Switch, View } from "react-native";

import { Avatar, Button, Card, Screen, SectionHeader } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { useAppointments } from "@/features/appointments/api";
import { useLoyaltySummary } from "@/features/loyalty/api";
import { usePatientProfile } from "@/features/profile/graph";
import { useTheme } from "@/lib/theme";
import { useUiStore } from "@/store/ui-store";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function PatientProfileScreen() {
  const theme = useTheme();
  const profile = usePatientProfile();
  const appointments = useAppointments();
  const loyalty = useLoyaltySummary();
  const preference = useUiStore((state) => state.themePreference);
  const setThemePreference = useUiStore((state) => state.setThemePreference);
  const visits = appointments.data?.ok ? appointments.data.data : [];
  const completed = visits.filter((visit) => visit.status === "COMPLETED").length;
  const upcoming = visits.filter((visit) => visit.status === "SCHEDULED").length;
  const name = profile.data?.displayName ?? "Pacjent MedConnect";

  return (
    <Screen scroll contentStyle={{ paddingBottom: 118 }}>
      <Card style={[styles.hero, { backgroundColor: theme.primary }]} accessibleLabel={`Profil pacjenta ${name}`}>
        <Avatar name={name} uri={profile.data?.photoUrl} size={72} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" weight="900" color={theme.onPrimary}>{name}</AppText>
          <AppText color={theme.onPrimary} style={{ opacity: 0.78, marginTop: 4 }}>{profile.data?.email ?? "Konto Microsoft Entra"}</AppText>
        </View>
      </Card>

      <SectionHeader title="Statystyki" />
      <View style={styles.stats}>
        <Stat label="Odbyte" value={completed} color={theme.accentMint} />
        <Stat label="Nadchodzące" value={upcoming} color={theme.accentSky} />
        <Stat label="Punkty" value={loyalty.data?.ok ? loyalty.data.data.points : 0} color={theme.accentPeach} />
      </View>

      <SectionHeader title="Preferencje" />
      <Card>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText weight="900" color={theme.text}>Ciemny motyw</AppText>
            <AppText variant="caption" color={theme.muted} style={{ marginTop: 4 }}>Szare powierzchnie i delikatne przezroczystości.</AppText>
          </View>
          <Switch value={preference === "dark"} onValueChange={(next) => setThemePreference(next ? "dark" : "system")} trackColor={{ true: theme.primary, false: theme.border }} />
        </View>
      </Card>
      <Button label="Ustawienia bezpieczeństwa" variant="secondary" onPress={() => router.push("/settings")} style={{ marginTop: 14 }} />
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={[styles.stat, { backgroundColor: color }]} accessibleLabel={`${label}: ${value}`}>
      <AppText variant="title" weight="900" color="#0f172a">{value}</AppText>
      <AppText variant="caption" weight="800" color="#334155">{label}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 16 },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, minHeight: 112, justifyContent: "flex-end" },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 }
});
