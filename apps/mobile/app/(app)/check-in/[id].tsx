import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { Button, Card, EmptyState, Screen, Skeleton } from "@/design/primitives";
import { CountdownRing } from "@/design/countdown-ring";
import { AppText } from "@/design/typography";
import { useAppointments, useCheckInQr } from "@/features/appointments/api";
import { useTheme } from "@/lib/theme";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function LiveCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const query = useAppointments();
  const qrQuery = useCheckInQr(id ?? null);
  const [now] = useState(() => Date.now());
  const appointment = query.data?.ok ? query.data.data.find((item) => item.id === id) : null;

  if (query.isLoading) return <Screen><Skeleton height={260} /><Skeleton height={96} style={{ marginTop: 14 }} /></Screen>;
  if (!appointment) return <Screen><EmptyState title="Brak wizyty" description="Nie mozemy przygotowac check-inu dla tej wizyty." action={<Button label="Wroc" onPress={() => router.back()} />} /></Screen>;

  const start = new Date(appointment.slot.startTime);
  const minutes = Math.max(0, Math.round((start.getTime() - now) / 60000));
  const progress = Math.max(0.08, Math.min(1, 1 - minutes / (60 * 24)));
  const qr = qrQuery.data?.ok ? qrQuery.data.data : null;

  return (
    <Screen scroll contentStyle={{ paddingBottom: 118 }}>
      <Button label="Wroc" variant="ghost" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />
      <Card style={[styles.hero, { backgroundColor: theme.primary }]} accessibleLabel={`Check-in na wizyte u ${appointment.doctor.name}`}>
        <AppText variant="title" weight="900" color={theme.onPrimary}>Wizyta na zywo</AppText>
        <AppText color={theme.onPrimary} style={{ opacity: 0.82, marginTop: 6 }}>{appointment.doctor.name}</AppText>
        <View style={styles.ringWrap}>
          <CountdownRing progress={progress} label={`${minutes}m`} sublabel="do startu" size={150} />
        </View>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <AppText weight="900" color={theme.text}>Kod QR check-in</AppText>
        <View style={[styles.qr, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}> 
          {qrQuery.isLoading ? <Skeleton height={220} width={220} radius={24} /> : qr ? <Image source={{ uri: qr.qrDataUrl }} style={styles.qrImage} resizeMode="contain" /> : <AppText color={theme.danger} align="center">Nie udalo sie wygenerowac kodu QR.</AppText>}
        </View>
        {qr ? <AppText variant="caption" weight="900" color={theme.primaryText} style={{ marginTop: 10 }}>{qr.code} · wazny do {new Date(qr.expiresAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</AppText> : null}
        <AppText color={theme.muted} style={{ marginTop: 10, lineHeight: 22 }}>Pokaz QR w recepcji. Kod jest generowany przez backend, zapisany tymczasowo w Redis i wygasa automatycznie.</AppText>
      </Card>
      <Button label="Jestem na miejscu" onPress={() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 300, alignItems: "center", justifyContent: "center" },
  ringWrap: { marginTop: 22 },
  qr: { marginTop: 14, minHeight: 252, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qrImage: { width: 220, height: 220, borderRadius: 18 }
});
