import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { type Appointment } from "@medconnect/shared";
import { AppBottomSheet } from "@/design/app-bottom-sheet";
import { Badge, Button, Card, EmptyState, Screen, Skeleton } from "@/design/primitives";
import { AppText } from "@/design/typography";
import { useAppointments, useCancelAppointment } from "@/features/appointments/api";
import { useTheme } from "@/lib/theme";

const statusLabels: Record<Appointment["status"], { label: string; tone: "success" | "danger" | "muted" }> = {
  SCHEDULED: { label: "Zaplanowana", tone: "success" },
  CANCELLED: { label: "Anulowana", tone: "danger" },
  COMPLETED: { label: "Odbyta", tone: "muted" }
};

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useAppointments();
  const cancel = useCancelAppointment();
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [message, setMessage] = useState<string | null>(null);
  const result = query.data;

  if (query.isLoading) {
    return (
      <Screen>
        <Skeleton height={34} width="60%" />
        <Skeleton height={180} style={{ marginTop: 18 }} />
        <Skeleton height={72} style={{ marginTop: 14 }} />
      </Screen>
    );
  }

  if (!result?.ok) return <Screen><EmptyState title="Nie znaleziono wizyty" description="Nie udało się pobrać szczegółów wizyty." /></Screen>;

  const appointment = result.data.find((item) => item.id === id);
  if (!appointment) return <Screen><EmptyState title="Brak dostępu" description="Ta wizyta nie jest dostępna na Twoim koncie." /></Screen>;

  const current = appointment;
  const status = statusLabels[current.status]!;
  const isUpcoming = current.status === "SCHEDULED" && new Date(current.slot.startTime) > new Date();

  async function confirmCancel() {
    const response = await cancel.mutateAsync(current.id);
    if (!response.ok) {
      setMessage(response.error.message);
      return;
    }
    sheetRef.current?.dismiss();
    setMessage("Wizyta została anulowana.");
  }

  async function reschedule() {
    await cancel.mutateAsync(current.id);
    router.replace("/book");
  }

  return (
    <Screen scroll contentStyle={{ paddingBottom: 120 }}>
      <View style={styles.topRow}>
        <Button label="Wróć" variant="ghost" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />
        <Badge tone={status.tone}>{status.label}</Badge>
      </View>

      <Card style={[styles.hero, { backgroundColor: theme.primary }]} accessibleLabel={`${current.doctor.name}. ${current.doctor.specialtyName}. ${new Date(current.slot.startTime).toLocaleString("pl-PL")}.`}>
        <AppText variant="title" weight="900" color={theme.onPrimary}>{current.doctor.name}</AppText>
        <AppText color={theme.onPrimary} style={{ opacity: 0.82, marginTop: 6 }}>{current.doctor.specialtyName}</AppText>
        <AppText color={theme.onPrimary} style={{ opacity: 0.82, marginTop: 4 }}>{current.doctor.clinicName}</AppText>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Info label="Termin" value={new Date(current.slot.startTime).toLocaleString("pl-PL")} />
        <Info label="Powód" value={current.reason} />
        <Info label="Status" value={status.label} />
      </Card>

      {message ? <AppText color={theme.primaryText} style={{ marginTop: 12 }}>{message}</AppText> : null}

      {isUpcoming ? (
        <View style={styles.actions}>
          <Button label="Przełóż" variant="secondary" onPress={reschedule} disabled={cancel.isPending} />
          <Button label="Anuluj" variant="danger" onPress={() => sheetRef.current?.present()} disabled={cancel.isPending} />
        </View>
      ) : null}

      <AppBottomSheet
        ref={sheetRef}
        title="Anulować wizytę?"
        description="Zwolnimy ten termin dla innych pacjentów. Ta akcja od razu zaktualizuje listę wizyt."
        footer={
          <>
            <Button label={cancel.isPending ? "Anuluję..." : "Tak, anuluj wizytę"} variant="danger" onPress={confirmCancel} disabled={cancel.isPending} />
            <Button label="Wróć" variant="secondary" onPress={() => sheetRef.current?.dismiss()} />
          </>
        }
      >
        <Card>
          <Info label="Lekarz" value={current.doctor.name} />
          <Info label="Termin" value={new Date(current.slot.startTime).toLocaleString("pl-PL")} />
        </Card>
      </AppBottomSheet>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <AppText color={theme.muted}>{label}</AppText>
      <AppText weight="800" color={theme.text} align="right" style={{ flex: 1 }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  hero: { minHeight: 160, justifyContent: "flex-end", overflow: "hidden" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingVertical: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 }
});

