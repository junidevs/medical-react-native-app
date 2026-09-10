import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

import { env } from "@/lib/env";

const PREFERENCE_KEY = "biometric-lock-enabled";

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
}

// Defaults to enabled: only an explicit "false" opts out, so fresh installs keep
// the patient session protected until the user turns the lock off.
export async function isBiometricLockEnabled(): Promise<boolean> {
  if (!env.features.biometricLock) return false;
  try {
    const value = await SecureStore.getItemAsync(PREFERENCE_KEY);
    return value !== "false";
  } catch {
    return true;
  }
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  if (!env.features.biometricLock) return;
  try {
    await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? "true" : "false");
  } catch {
    // SecureStore unavailable (e.g. missing native module)   ignore silently.
  }
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  if (!env.features.biometricLock) return { hasHardware: false, isEnrolled: false };
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync()
    ]);
    return { hasHardware, isEnrolled };
  } catch {
    return { hasHardware: false, isEnrolled: false };
  }
}
