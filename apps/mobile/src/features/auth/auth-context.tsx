import {
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  revokeAsync,
  TokenResponse,
  useAuthRequest,
  useAutoDiscovery
} from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";

import { env } from "@/lib/env";
import {
  clearSession,
  isSessionFresh,
  readSession,
  refreshSingleFlight,
  StoredSession,
  writeSession
} from "./token-store";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: StoredSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const discovery = useAutoDiscovery(
    `https://login.microsoftonline.com/${env.entraTenantId}/v2.0`
  );
  const redirectUri = makeRedirectUri({ scheme: "medconnect", path: "auth" });
  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: env.entraClientId,
      scopes: ["openid", "profile", "email", "offline_access", env.entraApiScope],
      redirectUri,
      usePKCE: true
    },
    discovery
  );

  useEffect(() => {
    readSession().then((stored) => {
      setSession(stored);
      setStatus(stored ? "authenticated" : "unauthenticated");
    });
  }, []);

  const value: AuthContextValue = {
    session,
    status,
    signIn: async () => {
      const next = env.authMode === "mock" ? await signInMock() : await signInEntra();
      setSession(next);
      setStatus("authenticated");
    },
    signOut: async () => {
      // Revocation is best-effort: Entra's OIDC discovery has no
      // revocationEndpoint, so revokeAsync would throw. Never let that block
      // the actual logout - always clear the local session.
      try {
        await revokeCurrentSession(session, discovery);
      } catch {
        // ignore - we still clear the session below
      }
      await clearSession();
      setSession(null);
      setStatus("unauthenticated");
    },
    getAccessToken: async () => {
      if (!session) return null;
      if (isSessionFresh(session)) return session.accessToken;
      const next = await refreshSingleFlight(() => refreshSession(session, discovery));
      setSession(next);
      return next.accessToken;
    }
  };

  async function signInEntra() {
    if (!discovery || !request) throw new Error("Auth discovery is not ready.");
    const result = await promptAsync();
    if (result.type !== "success") throw new Error("Sign-in was cancelled.");
    if (!request.codeVerifier) throw new Error("PKCE code verifier is missing.");
    if (!result.params.code) throw new Error("Authorization code is missing.");

    const token = await exchangeCodeAsync(
      {
        clientId: env.entraClientId,
        code: result.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier }
      },
      discovery
    );

    const claims = parseIdTokenClaims(token.idToken);
    return persistToken(token, claims.name ?? "Microsoft user", claims.email ?? "patient@contoso.com");
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

async function signInMock() {
  if (!env.features.mockLogin) {
    throw new Error("Mock login is disabled for this build.");
  }
  const response = await fetch(`${env.apiUrl}/mock-identity/token`, { method: "POST" });
  const payload = (await response.json()) as MockTokenResponse;
  const token = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    idToken: payload.id_token,
    expiresIn: payload.expires_in
  } satisfies Partial<TokenResponse>;
  return persistToken(token, "Demo Patient", "patient.demo@medconnect.local");
}

async function persistToken(token: OAuthToken, userName: string, userEmail: string) {
  if (!token.accessToken || !token.refreshToken) throw new Error("Token response is incomplete.");

  const session: StoredSession = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    idToken: token.idToken ?? token.accessToken,
    expiresAt: Date.now() + (token.expiresIn ?? 900) * 1000,
    userName,
    userEmail
  };
  await writeSession(session);
  return session;
}

async function refreshSession(session: StoredSession, discovery: AuthContextDiscovery) {
  if (!discovery) return session;
  if (env.authMode === "mock") return session;
  const token = await refreshAsync({ clientId: env.entraClientId, refreshToken: session.refreshToken }, discovery);
  return persistToken(token, session.userName, session.userEmail);
}

async function revokeCurrentSession(
  session: StoredSession | null,
  discovery: AuthContextDiscovery
) {
  if (!session || !discovery || env.authMode === "mock") return;
  // Entra does not expose a revocation endpoint; skip revocation there and just
  // drop the local session. Only call revokeAsync when the IdP actually supports it.
  if (!discovery.revocationEndpoint) return;
  await revokeAsync({ clientId: env.entraClientId, token: session.refreshToken }, discovery);
}

interface MockTokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

interface OAuthToken {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

type AuthContextDiscovery = ReturnType<typeof useAutoDiscovery>;


function parseIdTokenClaims(idToken?: string) {
  if (!idToken) return {} as { name?: string; email?: string };
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = globalThis.atob(normalized);
    const claims = JSON.parse(decoded) as { name?: string; preferred_username?: string; email?: string; upn?: string };
    return { name: claims.name, email: claims.email ?? claims.preferred_username ?? claims.upn };
  } catch {
    return {};
  }
}

