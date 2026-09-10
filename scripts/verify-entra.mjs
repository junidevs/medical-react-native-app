// Real Entra verification (Level 1): obtains a genuine user access token from your
// tenant via the OAuth 2.0 Device Code flow (using the medconnect-mobile public
// client), decodes it, and calls the API to prove the backend accepts real tokens.
//
// Requirements in Azure (one-time):
//   - medconnect-mobile: Authentication -> "Allow public client flows" = Yes
//   - medconnect-api: Manifest -> "requestedAccessTokenVersion" = 2
//
// Usage:  node scripts/verify-entra.mjs
// It reads apps/mobile/.env and apps/api/.env for the tenant, client id, scope and API url.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    const out = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return out;
  } catch {
    return {};
  }
}

const mobileEnv = parseEnv(join(root, "apps/mobile/.env"));
const apiEnv = parseEnv(join(root, "apps/api/.env"));

const tenantId = mobileEnv.EXPO_PUBLIC_ENTRA_TENANT_ID;
const clientId = mobileEnv.EXPO_PUBLIC_ENTRA_CLIENT_ID;
const apiScope = mobileEnv.EXPO_PUBLIC_ENTRA_API_SCOPE;
const apiUrl = mobileEnv.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const expectedAudience = apiEnv.ENTRA_AUDIENCE;
const expectedIssuer = apiEnv.ENTRA_ISSUER;

function fail(message) {
  console.error(`\n[FAIL] ${message}`);
  process.exit(1);
}

if (!tenantId || !clientId || !apiScope) {
  fail("Missing EXPO_PUBLIC_ENTRA_* values in apps/mobile/.env");
}

const authority = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
const scope = `openid profile offline_access ${apiScope}`;

function decodeJwt(token) {
  const [headerB64, payloadB64] = token.split(".");
  const decode = (part) =>
    JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  return { header: decode(headerB64), payload: decode(payloadB64) };
}

async function requestDeviceCode() {
  const res = await fetch(`${authority}/devicecode`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope })
  });
  const data = await res.json();
  if (!res.ok) fail(`Device code request failed: ${data.error} - ${data.error_description}`);
  return data;
}

async function pollForToken(deviceCode, intervalSec) {
  let interval = intervalSec * 1000;
  for (;;) {
    await new Promise((r) => setTimeout(r, interval));
    const res = await fetch(`${authority}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: clientId,
        device_code: deviceCode
      })
    });
    const data = await res.json();
    if (res.ok) return data;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      interval += 5000;
      continue;
    }
    fail(`Token poll failed: ${data.error} - ${data.error_description}`);
  }
}

async function main() {
  console.log("MedConnect - Real Entra verification (device code flow)\n");
  console.log(`Tenant:   ${tenantId}`);
  console.log(`Client:   ${clientId}`);
  console.log(`Scope:    ${apiScope}`);
  console.log(`API URL:  ${apiUrl}\n`);

  const device = await requestDeviceCode();
  console.log("=".repeat(60));
  console.log("ACTION REQUIRED:");
  console.log(`  1. Open: ${device.verification_uri}`);
  console.log(`  2. Enter code: ${device.user_code}`);
  console.log("  3. Sign in as patient@DamianSzczutkowski.onmicrosoft.com");
  console.log("=".repeat(60));

  const token = await pollForToken(device.device_code, device.interval ?? 5);
  const accessToken = token.access_token;
  if (!accessToken) fail("No access_token returned.");

  const { header, payload } = decodeJwt(accessToken);
  console.log("\n--- Access token claims ---");
  console.log(`alg: ${header.alg}   kid: ${header.kid}`);
  console.log(`iss: ${payload.iss}`);
  console.log(`aud: ${payload.aud}`);
  console.log(`ver: ${payload.ver}`);
  console.log(`scp: ${payload.scp}`);
  console.log(`name: ${payload.name}   upn: ${payload.preferred_username}`);

  const issuerOk = !expectedIssuer || payload.iss === expectedIssuer;
  const audienceOk =
    !expectedAudience ||
    payload.aud === expectedAudience ||
    payload.aud === expectedAudience.replace(/^api:\/\//, "");
  const scopeOk = typeof payload.scp === "string" && payload.scp.split(" ").includes("access_as_user");

  console.log("\n--- Claim checks (vs apps/api/.env) ---");
  console.log(`issuer match:   ${issuerOk ? "OK" : `MISMATCH (expected ${expectedIssuer})`}`);
  console.log(`audience match: ${audienceOk ? "OK" : `MISMATCH (expected ${expectedAudience})`}`);
  console.log(`scope present:  ${scopeOk ? "OK (access_as_user)" : "MISSING access_as_user"}`);

  if (!issuerOk) {
    console.log(
      "\nHint: token issuer is v1 (sts.windows.net). Set medconnect-api Manifest " +
        '"requestedAccessTokenVersion" = 2 so Entra issues v2 tokens.'
    );
  }

  console.log("\n--- Calling the API with the real token ---");
  let apiRes;
  try {
    apiRes = await fetch(`${apiUrl}/doctors`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
  } catch (err) {
    fail(`Could not reach API at ${apiUrl}. Is it running (pnpm api)?  ${err.message}`);
  }
  const bodyText = await apiRes.text();
  console.log(`GET /doctors -> HTTP ${apiRes.status}`);
  console.log(bodyText.slice(0, 500));

  if (apiRes.status === 200) {
    console.log("\n[PASS] The backend accepted a real Microsoft Entra token. Entra wiring is correct.");
  } else if (apiRes.status === 401) {
    fail(
      "API rejected the real token (401). Check apps/api/.env ENTRA_ISSUER / ENTRA_AUDIENCE " +
        "against the claims printed above, and that requestedAccessTokenVersion = 2."
    );
  } else {
    fail(`Unexpected API status ${apiRes.status}. See body above.`);
  }
}

main().catch((err) => fail(err.message));
