import * as SecureStore from "expo-secure-store";

const tokenKey = "medconnect.session.v1";
const expirySkewMs = 60_000;

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  userName: string;
  userEmail: string;
}

let refreshPromise: Promise<StoredSession> | null = null;

export async function readSession() {
  const value = await SecureStore.getItemAsync(tokenKey);
  if (!value) return null;
  return JSON.parse(value) as StoredSession;
}

export async function writeSession(session: StoredSession) {
  await SecureStore.setItemAsync(tokenKey, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED
  });
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(tokenKey);
}

export function isSessionFresh(session: StoredSession) {
  return session.expiresAt - expirySkewMs > Date.now();
}

export async function refreshSingleFlight(
  refreshSession: () => Promise<StoredSession>
) {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

