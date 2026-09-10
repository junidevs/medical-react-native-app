import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppBottomSheet } from "@/design/app-bottom-sheet";
import { Badge, Button, Card, EmptyState, Screen, SectionHeader, Skeleton } from "@/design/primitives";
import { LottieAsset, lotties } from "@/design/lottie-view";
import { AppText } from "@/design/typography";
import { useBookAppointment, useDoctors, useSlots } from "@/features/appointments/api";
import { startAppointmentActivity } from "@/features/appointments/live-activity";
import { scheduleBookingConfirmation } from "@/features/notifications/notifications";
import { useTheme } from "@/lib/theme";

type Step = "doctor" | "slot" | "reason";

export { RouteErrorBoundary as ErrorBoundary } from "@/design/route-error-boundary";

export default function BookScreen() {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [reason, setReason] = useState("Konsultacja kontrolna");
  const [step, setStep] = useState<Step>("doctor");
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);

  const theme = useTheme();
  const doctors = useDoctors();
  const slots = useSlots(doctorId);
  const booking = useBookAppointment();
  const selectedDoctor = doctors.data?.ok ? doctors.data.data.find((doctor) => doctor.id === doctorId) : null;
  const selectedSlot = slots.data?.ok ? slots.data.data.find((slot) => slot.id === slotId) : null;
  const visibleSlots = useMemo(() => (slots.data?.ok ? slots.data.data.slice(0, 8) : []), [slots.data]);

  function openWizard(nextStep: Step = "doctor") {
    setDone(false);
    setStep(nextStep);
    setMessage(null);
    sheetRef.current?.present();
  }

  function finishBooking() {
    sheetRef.current?.dismiss();
    setDone(false);
    router.replace("/appointments");
  }

  async function handleBook() {
    setMessage(null);
    if (!doctorId) return setStep("doctor");
    if (!slotId) return setStep("slot");

    try {
      const result = await booking.mutateAsync({ slotId, reason });
      if (!result.ok) return setMessage(result.error.message);
      await scheduleBookingConfirmation(result.data.id, result.data.doctor.name);
      startAppointmentActivity({
        appointmentId: result.data.id,
        doctorName: result.data.doctor.name,
        specialty: result.data.doctor.specialtyName,
        clinicName: result.data.doctor.clinicName,
        startTimeIso: result.data.slot.startTime
      });
      setDone(true);
    } catch {
      setMessage("Nie udalo sie zarezerwowac wizyty. Sprobuj ponownie.");
    }
  }

  return (
    <Screen scroll contentStyle={{ paddingBottom: 118 }}>
      <AppText variant="title" weight="900" color={theme.text}>Zarezerwuj wizyte</AppText>
      <AppText color={theme.muted} style={{ marginTop: 6, lineHeight: 22 }}>Caly proces wyboru lekarza, terminu i powodu wizyty jest teraz w bottom sheet, bez klasycznych modali.</AppText>

      <Card style={[styles.hero, { backgroundColor: theme.accentPeach }]}>
        <LottieAsset source={lotties.pill} size={72} style={styles.heroIcon} />
        <AppText variant="heading" weight="900" color="#0f172a">Szybka rezerwacja</AppText>
        <AppText color="#334155" style={{ marginTop: 8, lineHeight: 22 }}>Wybierz specjaliste, najblizszy termin i potwierdz. Lista wizyt zaktualizuje sie optymistycznie.</AppText>
        <Button label="Rozpocznij" onPress={() => openWizard("doctor")} style={{ marginTop: 18 }} />
      </Card>

      <SectionHeader title="Podsumowanie" />
      <Card>
        <SummaryRow label="Lekarz" value={selectedDoctor?.name ?? "Nie wybrano"} actionLabel="Zmien" onPress={() => openWizard("doctor")} />
        <SummaryRow label="Termin" value={selectedSlot ? new Date(selectedSlot.startTime).toLocaleString("pl-PL") : "Nie wybrano"} actionLabel="Zmien" onPress={() => openWizard(doctorId ? "slot" : "doctor")} />
        <SummaryRow label="Powod" value={reason} actionLabel="Edytuj" onPress={() => openWizard("reason")} />
      </Card>
      {message ? <AppText color={theme.danger} style={{ marginTop: 12 }}>{message}</AppText> : null}

      <AppBottomSheet ref={sheetRef} title="Umow wizyte" description="Przesuwaj kroki w wysuwanym panelu. Wybor zapisuje sie od razu w podsumowaniu.">
        {done ? (
          <View style={styles.successBody}>
            <LottieAsset source={lotties.success} size={160} loop={false} />
            <AppText variant="heading" weight="900" color={theme.text} align="center">Wizyta zarezerwowana!</AppText>
            <AppText color={theme.muted} align="center" style={{ marginTop: 8, lineHeight: 22 }}>
              {selectedDoctor ? `${selectedDoctor.name} - ` : ""}{selectedSlot ? new Date(selectedSlot.startTime).toLocaleString("pl-PL") : ""}
            </AppText>
            <Button label="Zobacz wizyty" onPress={finishBooking} style={{ marginTop: 18, alignSelf: "stretch" }} />
          </View>
        ) : (
        <>
        <StepTabs step={step} setStep={setStep} canSlot={Boolean(doctorId)} canReason={Boolean(slotId)} />
        {step === "doctor" ? (
          <View style={styles.sheetBody}>
            {doctors.isLoading ? <BookingSkeleton /> : doctors.data?.ok ? doctors.data.data.map((doctor) => (
              <Card key={doctor.id} style={[styles.selectCard, doctor.id === doctorId && { borderColor: theme.primary, backgroundColor: theme.surfaceAlt }]} accessibleLabel={`${doctor.name}. ${doctor.specialtyName}. Ocena ${doctor.rating}.`}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <AppText weight="900" color={theme.text}>{doctor.name}</AppText>
                    <AppText variant="caption" color={theme.muted} style={{ marginTop: 4 }}>{doctor.specialtyName} · {doctor.clinicName}</AppText>
                  </View>
                  <Button label={doctor.id === doctorId ? "Wybrano" : "Wybierz"} variant={doctor.id === doctorId ? "primary" : "secondary"} onPress={() => { setDoctorId(doctor.id); setSlotId(null); setStep("slot"); }} />
                </View>
              </Card>
            )) : <EmptyState title="Brak lekarzy" description="Nie udalo sie pobrac listy specjalistow." />}
          </View>
        ) : null}

        {step === "slot" ? (
          <View style={styles.sheetBody}>
            {!doctorId ? <EmptyState title="Najpierw lekarz" description="Wybierz specjaliste, aby zobaczyc terminy." action={<Button label="Wybierz lekarza" onPress={() => setStep("doctor")} />} /> : null}
            {doctorId && slots.isLoading ? <BookingSkeleton /> : null}
            {doctorId && slots.data?.ok && visibleSlots.length === 0 ? <EmptyState title="Brak terminow" description="Ten lekarz nie ma teraz wolnych godzin." /> : null}
            <View style={styles.slotGrid}>
              {visibleSlots.map((slot) => (
                <Button key={slot.id} label={new Date(slot.startTime).toLocaleDateString("pl-PL", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} variant={slot.id === slotId ? "primary" : "secondary"} onPress={() => { setSlotId(slot.id); setStep("reason"); }} style={{ flexBasis: "48%" }} />
              ))}
            </View>
          </View>
        ) : null}

        {step === "reason" ? (
          <View style={styles.sheetBody}>
            <Card>
              <AppText weight="900" color={theme.text}>Powod wizyty</AppText>
              <TextInput value={reason} onChangeText={setReason} placeholder="Napisz krotko, czego dotyczy wizyta" placeholderTextColor={theme.subtle} multiline style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} />
              {selectedDoctor ? <Badge>{selectedDoctor.specialtyName}</Badge> : null}
            </Card>
            <Button label={booking.isPending ? "Rezerwuje..." : "Potwierdz wizyte"} onPress={handleBook} disabled={booking.isPending || !doctorId || !slotId} />
            {message ? <AppText color={theme.danger}>{message}</AppText> : null}
          </View>
        ) : null}
        </>
        )}
      </AppBottomSheet>
    </Screen>
  );
}

function StepTabs({ step, setStep, canSlot, canReason }: { step: Step; setStep: (step: Step) => void; canSlot: boolean; canReason: boolean }) {
  return (
    <View style={styles.steps}>
      <Button label="1 Lekarz" variant={step === "doctor" ? "primary" : "secondary"} onPress={() => setStep("doctor")} style={styles.stepButton} />
      <Button label="2 Termin" variant={step === "slot" ? "primary" : "secondary"} onPress={() => canSlot && setStep("slot")} disabled={!canSlot} style={styles.stepButton} />
      <Button label="3 Powod" variant={step === "reason" ? "primary" : "secondary"} onPress={() => canReason && setStep("reason")} disabled={!canReason} style={styles.stepButton} />
    </View>
  );
}

function SummaryRow({ label, value, actionLabel, onPress }: { label: string; value: string; actionLabel: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" color={theme.muted}>{label}</AppText>
        <AppText weight="900" color={theme.text} style={{ marginTop: 4 }}>{value}</AppText>
      </View>
      <Button label={actionLabel} variant="ghost" onPress={onPress} />
    </View>
  );
}

function BookingSkeleton() {
  return (
    <Card>
      <Skeleton height={26} width="70%" />
      <Skeleton height={16} width="42%" style={{ marginTop: 12 }} />
      <Skeleton height={54} style={{ marginTop: 18 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 18, minHeight: 190, justifyContent: "flex-end", overflow: "hidden" },
  heroIcon: { position: "absolute", top: 14, right: 14 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  steps: { flexDirection: "row", gap: 8 },
  stepButton: { flex: 1, minHeight: 44, paddingHorizontal: 8 },
  sheetBody: { marginTop: 16, gap: 10 },
  successBody: { alignItems: "center", paddingVertical: 12, gap: 4 },
  selectCard: { marginBottom: 2 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  input: { minHeight: 112, borderRadius: 22, borderWidth: 1, padding: 16, textAlignVertical: "top", fontSize: 16, marginTop: 12, marginBottom: 12 }
});
