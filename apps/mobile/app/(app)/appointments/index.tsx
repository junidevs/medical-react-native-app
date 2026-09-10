import { type Appointment } from "@medconnect/shared";
import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { Badge, Button, Card, EmptyState, Screen, SectionHeader, Skeleton } from "@/design/primitives";
import { lotties } from "@/design/lottie-view";
import { AppText } from "@/design/typography";
import { useAppointments } from "@/features/appointments/api";
import { useTheme } from "@/lib/theme";

export default function AppointmentsScreen() {
  const query = useAppointments();
  const theme = useTheme();
  const result = query.data;

  if (query.isLoading) {
    return (
      <Screen contentStyle={{ paddingBottom: 110 }}>
        <SectionHeader title="Twoje wizyty" />
        <AppointmentSkeleton />
        <AppointmentSkeleton />
        <AppointmentSkeleton />
      </Screen>
    );
  }

  if (!result?.ok) {
    return (
      <Screen contentStyle={{ paddingBottom: 110 }}>
        <EmptyState title="Nie udało się pobrać wizyt" description="Sprawdź połączenie albo spróbuj odświeżyć listę za chwilę." action={<Button label="Spróbuj ponownie" onPress={() => query.refetch()} />} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={styles.list}
        data={result.data}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={theme.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            <AppText variant="title" weight="900" color={theme.text}>Twoje wizyty</AppText>
            <AppText color={theme.muted} style={{ marginTop: 6 }}>Wszystkie terminy, check-in i szczegóły leczenia w jednym miejscu.</AppText>
          </View>
        }
        renderItem={({ item }) => <AppointmentCard appointment={item} />}
        ListEmptyComponent={
          <EmptyState title="Jeszcze nie masz wizyt" description="Umów pierwszą konsultację i zobacz tu odliczanie, status oraz przypomnienia." animation={lotties.calendar} action={<Button label="Zarezerwuj wizytę" onPress={() => router.push("/book")} />} />
        }
      />
    </Screen>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const theme = useTheme();
  const status = appointment.status === "CANCELLED" ? "Anulowana" : appointment.status === "COMPLETED" ? "Odbyta" : "Zaplanowana";
  const tone = appointment.status === "CANCELLED" ? "danger" : appointment.status === "COMPLETED" ? "muted" : "success";
  return (
    <Card style={styles.card} accessibleLabel={`${status}. ${appointment.doctor.name}. ${appointment.doctor.specialtyName}. ${new Date(appointment.slot.startTime).toLocaleString("pl-PL")}.`}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Badge tone={tone}>{status}</Badge>
          <AppText variant="heading" weight="900" color={theme.text} style={{ marginTop: 12 }}>{appointment.doctor.name}</AppText>
          <AppText color={theme.muted} style={{ marginTop: 4 }}>{appointment.doctor.specialtyName}</AppText>
        </View>
        <View style={[styles.datePill, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="caption" weight="900" color={theme.primaryText} align="center">
            {new Date(appointment.slot.startTime).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" })}
          </AppText>
          <AppText variant="tiny" color={theme.muted} align="center">
            {new Date(appointment.slot.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
          </AppText>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button label="Szczegóły" variant="secondary" onPress={() => router.push({ pathname: "/appointments/[id]", params: { id: appointment.id } } as never)} />
        {appointment.status === "SCHEDULED" ? <Button label="Check-in" variant="ghost" onPress={() => router.push({ pathname: "/check-in/[id]", params: { id: appointment.id } } as never)} /> : null}
      </View>
    </Card>
  );
}

function AppointmentSkeleton() {
  return (
    <Card style={{ marginTop: 12 }}>
      <Skeleton height={18} width="32%" />
      <Skeleton height={26} width="70%" style={{ marginTop: 14 }} />
      <Skeleton height={16} width="48%" style={{ marginTop: 10 }} />
      <Skeleton height={48} style={{ marginTop: 16 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 118, gap: 12 },
  card: { marginTop: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  datePill: { width: 82, minHeight: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", padding: 8 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 16 }
});

