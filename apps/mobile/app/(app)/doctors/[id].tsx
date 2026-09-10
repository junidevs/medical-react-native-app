import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

import { Avatar, Button, Card, EmptyState, Screen, Skeleton } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { useDoctor, useSlots } from "@/features/appointments/api";
import { useTheme } from "@/lib/theme";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function DoctorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const doctorQuery = useDoctor(id ?? null);
  const slots = useSlots(id ?? null);
  const doctor = doctorQuery.doctor;

  if (doctorQuery.isLoading) {
    return <Screen><Skeleton height={220} /><Skeleton height={80} style={{ marginTop: 14 }} /></Screen>;
  }

  if (!doctor) {
    return <Screen><EmptyState title="Nie znaleziono lekarza" description="Ten profil jest niedostepny albo zostal usuniety." action={<Button label="Wroc" onPress={() => router.back()} />} /></Screen>;
  }

  return (
    <Screen scroll contentStyle={{ paddingBottom: 118 }}>
      <Button label="Wroc" variant="ghost" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />
      <Card style={[styles.hero, { backgroundColor: theme.accentSky }]} accessibleLabel={`${doctor.name}. ${doctor.specialtyName}. ${doctor.clinicName}.`}>
        <Avatar name={doctor.name} size={64} />
        <AppText variant="title" weight="900" color="#0f172a" style={{ marginTop: 16 }}>{doctor.name}</AppText>
        <AppText color="#334155" style={{ marginTop: 4 }}>{doctor.specialtyName}</AppText>
        <AppText variant="caption" color="#475569" style={{ marginTop: 4 }}>{doctor.clinicName} ù ocena {doctor.rating.toFixed(1)}</AppText>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <AppText weight="900" color={theme.text}>O lekarzu</AppText>
        <AppText color={theme.muted} style={{ marginTop: 8, lineHeight: 22 }}>Specjalista MedConnect prowadzacy konsultacje z naciskiem na jasny plan leczenia, krotkie podsumowania i szybkie terminy kontrolne.</AppText>
      </Card>
      <AppText variant="heading" weight="900" color={theme.text} style={{ marginTop: 22, marginBottom: 12 }}>Najblizsze terminy</AppText>
      {slots.isLoading ? <Skeleton height={92} /> : slots.data?.ok && slots.data.data.slice(0, 4).map((slot) => (
        <Card key={slot.id} style={styles.slot}>
          <AppText weight="900" color={theme.text}>{new Date(slot.startTime).toLocaleString("pl-PL")}</AppText>
          <Button label="Zarezerwuj" variant="secondary" onPress={() => router.push("/book")} style={{ marginTop: 12 }} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 220, justifyContent: "flex-end", overflow: "hidden" },
  slot: { marginBottom: 10 }
});
