import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_MODE: z.enum(["mock", "entra"]).default("mock"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ENTRA_ISSUER: z.string().url(),
  ENTRA_AUDIENCE: z.string().min(1),
  ENTRA_JWKS_URI: z.string().url(),
  MOCK_ISSUER: z.string().url(),
  MOCK_AUDIENCE: z.string().min(1),
  MOCK_JWKS_URI: z.string().url(),
  AZURE_NOTIFICATION_HUB_CONNECTION_STRING: z.string().min(1),
  AZURE_NOTIFICATION_HUB_NAME: z.string().min(1),
  FEATURE_MOCK_IDENTITY: booleanFromEnv.default(false),
  FEATURE_PORTAL_PAIRING: booleanFromEnv.default(true),
  SENTRY_DSN: z.string().optional().default("")
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  authMode: "mock" | "entra";
  port: number;
  databaseUrl: string;
  directDatabaseUrl: string;
  redisUrl: string;
  issuer: string;
  audience: string;
  jwksUri: string;
  notificationHubConnectionString: string;
  notificationHubName: string;
  features: {
    mockIdentity: boolean;
    portalPairing: boolean;
  };
  sentryDsn: string;
}

export function loadEnv(): AppConfig {
  const parsed = envSchema.parse(process.env);
  if (parsed.NODE_ENV === "production" && parsed.AUTH_MODE === "mock") {
    throw new Error("AUTH_MODE=mock is forbidden when NODE_ENV=production.");
  }
  if (parsed.NODE_ENV === "production" && parsed.FEATURE_MOCK_IDENTITY) {
    throw new Error("FEATURE_MOCK_IDENTITY=true is forbidden when NODE_ENV=production.");
  }

  const isMock = parsed.AUTH_MODE === "mock";

  return {
    nodeEnv: parsed.NODE_ENV,
    authMode: parsed.AUTH_MODE,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    directDatabaseUrl: parsed.DIRECT_DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    issuer: isMock ? parsed.MOCK_ISSUER : parsed.ENTRA_ISSUER,
    audience: isMock ? parsed.MOCK_AUDIENCE : parsed.ENTRA_AUDIENCE,
    jwksUri: isMock ? parsed.MOCK_JWKS_URI : parsed.ENTRA_JWKS_URI,
    notificationHubConnectionString:
      parsed.AZURE_NOTIFICATION_HUB_CONNECTION_STRING,
    notificationHubName: parsed.AZURE_NOTIFICATION_HUB_NAME,
    features: {
      mockIdentity: parsed.FEATURE_MOCK_IDENTITY,
      portalPairing: parsed.FEATURE_PORTAL_PAIRING
    },
    sentryDsn: parsed.SENTRY_DSN
  };
}

