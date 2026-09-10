import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  authMode: z.enum(["mock", "entra"]).default("entra"),
  apiUrl: z.string().url(),
  entraTenantId: z.string().min(1),
  entraClientId: z.string().min(1),
  entraApiScope: z.string().min(1),
  portalUrl: z.string().url(),
  features: z.object({
    mockLogin: z.boolean(),
    portalWebView: z.boolean(),
    portalQrScanner: z.boolean(),
    pushNotifications: z.boolean(),
    biometricLock: z.boolean(),
    deviceIntegrity: z.boolean(),
    widgets: z.boolean()
  }),
  sentryDsn: z.string().optional().default(""),
  // Base URL for Module Federation remote containers (CDN / EAS Update host).
  // Optional: when unset, ScriptManager falls back to a per-build default.
  remotesBaseUrl: z.string().url().optional()
});

export const env = envSchema.parse({
  authMode: process.env.EXPO_PUBLIC_AUTH_MODE,
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  entraTenantId: process.env.EXPO_PUBLIC_ENTRA_TENANT_ID ?? "common",
  entraClientId: process.env.EXPO_PUBLIC_ENTRA_CLIENT_ID ?? "mock-client",
  entraApiScope:
    process.env.EXPO_PUBLIC_ENTRA_API_SCOPE ?? "api://medconnect-api/access_as_user",
  portalUrl: process.env.EXPO_PUBLIC_PORTAL_URL ?? "https://portal.localhost",
  features: {
    mockLogin: booleanFromEnv.parse(process.env.EXPO_PUBLIC_FEATURE_MOCK_LOGIN ?? "false"),
    portalWebView: booleanFromEnv.parse(
      process.env.EXPO_PUBLIC_FEATURE_PORTAL_WEBVIEW ?? "true"
    ),
    portalQrScanner: booleanFromEnv.parse(
      process.env.EXPO_PUBLIC_FEATURE_PORTAL_QR_SCANNER ?? "true"
    ),
    pushNotifications: booleanFromEnv.parse(
      process.env.EXPO_PUBLIC_FEATURE_PUSH_NOTIFICATIONS ?? "true"
    ),
    biometricLock: booleanFromEnv.parse(
      process.env.EXPO_PUBLIC_FEATURE_BIOMETRIC_LOCK ?? "true"
    ),
    deviceIntegrity: booleanFromEnv.parse(
      process.env.EXPO_PUBLIC_FEATURE_DEVICE_INTEGRITY ?? "true"
    ),
    widgets: booleanFromEnv.parse(process.env.EXPO_PUBLIC_FEATURE_WIDGETS ?? "true")
  },
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  remotesBaseUrl: process.env.EXPO_PUBLIC_REMOTES_BASE_URL
});

