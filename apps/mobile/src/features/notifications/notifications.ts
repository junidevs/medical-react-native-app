import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { registerDeviceRequestSchema } from "@medconnect/shared";
import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";

if (env.features.pushNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });
}

export async function scheduleBookingConfirmation(appointmentId: string, doctorName: string) {
  if (!env.features.pushNotifications) return;
  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted ? true : (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Wizyta potwierdzona",
      body: `Twoja rezerwacja u ${doctorName} jest gotowa. Przypomnimy Ci o niej.`,
      data: { appointmentId }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false
    }
  });
}

export async function registerForPushNotifications(accessToken: string | null) {
  if (!env.features.pushNotifications) return null;
  if (!Device.isDevice || !accessToken) return null;

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("appointments", {
      name: "Appointments",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const token = await Notifications.getDevicePushTokenAsync();
  const body = registerDeviceRequestSchema.parse({
    platform: Platform.OS,
    deviceToken: token.data,
    installationId: Crypto.randomUUID()
  });

  return apiRequest({
    path: "/notifications/register",
    method: "POST",
    schema: registerDeviceRequestSchema.pick({ installationId: true }),
    body,
    accessToken
  });
}

export function subscribeToNotificationLinks() {
  if (!env.features.pushNotifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      const appointmentId = data?.["appointmentId"];
      if (typeof appointmentId === "string") {
        router.push(`/appointments/${appointmentId}`);
      }
    }
  );

  return () => subscription.remove();
}

