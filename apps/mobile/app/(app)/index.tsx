import { Feather } from "@expo/vector-icons";
import { type Appointment } from "@medconnect/shared";
import { router } from "expo-router";
import { type ComponentProps, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CountdownRing } from "@/design/countdown-ring";
import { lotties } from "@/design/lottie-view";
import { Avatar, Badge, Button, Card, Chip, EmptyState, Screen, SectionHeader, Skeleton } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { useAppointments } from "@/features/appointments/api";
import { LoyaltyCard } from "@/features/loyalty/loyalty-card";
import { usePatientProfile } from "@/features/profile/graph";
import { useTheme } from "@/lib/theme";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function HomeScreen() {
  
  const theme = useTheme();
  const profile = usePatientProfile();
  const appointments = useAppointments();
  const data = appointments.data?.ok ? appointments.data.data : [];
  const upcoming = data
    .filter((appointment) => appointment.status === "SCHEDULED" && new Date(appointment.slot.startTime) > new Date())
    .sort((a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime())[0];
  const name = profile.data?.displayName ?? "Pacjencie";
  const firstName = name.split(" ")[0] ?? name;

  return (
    <Screen scroll contentStyle={{ paddingBottom: 110 }}>
      <View style={styles.header} accessible accessibilityLabel={`Dzien dobry, ${firstName}`}>
        <Avatar name={name} uri={profile.data?.photoUrl} />
        <View style={styles.headerText}>
          <AppText weight="900" color={theme.text}>Dzien dobry, {firstName}</AppText>
          <AppText variant="caption" color={theme.muted}>Twoj plan zdrowia na dzis</AppText>
        </View>
        <Pressable hitSlop={14} onPress={() => router.push("/profile" as never)} style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="user" size={20} color={theme.text} />
        </Pressable>
      </View>

      {appointments.isLoading ? <HomeSkeleton /> : upcoming ? <NextVisitHero appointment={upcoming} /> : (
        <EmptyState
          title="Brak zaplanowanych wizyt"
          description="Zarezerwuj termin u specjalisty i sledz wizyte bezposrednio z ekranu startowego."
          animation={lotties.calendar}
          action={<Button label="Umow wizyte" onPress={() => router.push("/book")} />}
        />
      )}

      <WeekStrip />

      <SectionHeader title="Szybkie akcje" />
      <View style={styles.actions}>
        <ActionCard title="Umow" subtitle="Nowa wizyta" icon="plus" color={theme.accentPeach} onPress={() => router.push("/book")} />
        <ActionCard title="Portal" subtitle="Dokumenty" icon="folder" color={theme.accentSky} onPress={() => router.push("/portal")} />
        <ActionCard title="Check-in" subtitle="Wizyta na zywo" icon="maximize" color={theme.accentMint} onPress={() => upcoming && router.push({ pathname: "/check-in/[id]", params: { id: upcoming.id } } as never)} disabled={!upcoming} />
      </View>

      <SectionHeader title="Punkty i status" />
      <LoyaltyCard />
    </Screen>
  );
}

function NextVisitHero({ appointment }: { appointment: Appointment }) {
  const theme = useTheme();
  const [now] = useState(() => Date.now());
  const start = new Date(appointment.slot.startTime);
  const hours = Math.max(0, Math.round((start.getTime() - now) / 36e5));
  const progress = Math.max(0.08, Math.min(1, 1 - hours / (24 * 14)));
  return (
    <Card style={[styles.hero, { backgroundColor: theme.primary }]} accessibleLabel={`Najblizsza wizyta: ${appointment.doctor.name}, ${start.toLocaleString("pl-PL")}`}>
      <View style={styles.heroText}>
        <Badge tone="muted">Najblizsza wizyta</Badge>
        <AppText variant="title" weight="900" color={theme.onPrimary} style={{ marginTop: 14 }}>{appointment.doctor.name}</AppText>
        <AppText color={theme.onPrimary} style={{ opacity: 0.82, marginTop: 6 }}>{appointment.doctor.specialtyName}</AppText>
        <AppText color={theme.onPrimary} style={{ opacity: 0.82, marginTop: 4 }}>{start.toLocaleString("pl-PL")}</AppText>
        <Button label="Pokaz szczegoly" variant="secondary" onPress={() => router.push({ pathname: "/appointments/[id]", params: { id: appointment.id } } as never)} style={{ marginTop: 18, alignSelf: "flex-start" }} />
      </View>
      <CountdownRing progress={progress} label={`${hours}h`} sublabel="do wizyty" />
    </Card>
  );
}

function WeekStrip() {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return date;
  });
  return (
    <View style={styles.week}>
      {days.map((date, index) => (
        <Chip key={date.toISOString()} selected={index === 0} label={`${date.toLocaleDateString("pl-PL", { weekday: "short" })}\n${date.getDate()}`} />
      ))}
    </View>
  );
}

function ActionCard({ title, subtitle, icon, color, onPress, disabled }: { title: string; subtitle: string; icon: ComponentProps<typeof Feather>["name"]; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} hitSlop={8} style={[styles.actionCard, { backgroundColor: color, opacity: disabled ? 0.5 : 1 }]} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={styles.actionIcon}>
        <Feather name={icon} size={20} color="#0f172a" />
      </View>
      <AppText weight="900" color="#0f172a">{title}</AppText>
      <AppText variant="caption" color="#334155" style={{ marginTop: 4 }}>{subtitle}</AppText>
    </Pressable>
  );
}

function HomeSkeleton() {
  return (
    <Card>
      <Skeleton height={28} width="64%" />
      <Skeleton height={16} width="48%" style={{ marginTop: 12 }} />
      <Skeleton height={96} style={{ marginTop: 18 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  headerText: { flex: 1 },
  search: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hero: { flexDirection: "row", gap: 10, alignItems: "center", overflow: "hidden" },
  heroText: { flex: 1 },
  week: { flexDirection: "row", gap: 8, marginTop: 18 },
  actions: { flexDirection: "row", gap: 10 },
  actionCard: { flex: 1, minHeight: 132, borderRadius: 24, padding: 14, justifyContent: "flex-end" },
  actionIcon: { position: "absolute", top: 14, left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" }
});
