import { Platform } from "react-native";

interface StartAppointmentActivityInput {
  appointmentId: string;
  doctorName: string;
  specialty: string;
  clinicName: string;
  startTimeIso: string;
}

interface ActivityInstance {
  end: (policy?: string) => void;
}

// Keyed by appointment id so we can dismiss the matching Live Activity on cancel.
const activities = new Map<string, ActivityInstance>();

// Starts an Uber-style lock-screen / Dynamic Island countdown to an appointment.
// expo-widgets only exists after a native build that bundles it, so we lazily
// require the widget module and swallow failures on builds that predate it.
export function startAppointmentActivity(input: StartAppointmentActivityInput): void {
  if (Platform.OS !== "ios") return;
  const startEpochMs = new Date(input.startTimeIso).getTime();
  if (!Number.isFinite(startEpochMs) || startEpochMs <= Date.now()) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppointmentActivity } = require("@/widgets/appointment-activity");
    const instance: ActivityInstance = AppointmentActivity.start(
      {
        doctorName: input.doctorName,
        specialty: input.specialty,
        clinicName: input.clinicName,
        startEpochMs,
        createdEpochMs: Date.now()
      },
      `medconnect://appointments/${input.appointmentId}`
    );
    activities.set(input.appointmentId, instance);
  } catch {
    // Native module unavailable until the next native build   safe to ignore.
  }
}

export function endAppointmentActivity(appointmentId: string): void {
  if (Platform.OS !== "ios") return;
  try {
    const instance = activities.get(appointmentId);
    if (!instance) return;
    instance.end("immediate");
    activities.delete(appointmentId);
  } catch {
    // Native module unavailable until the next native build   safe to ignore.
  }
}
