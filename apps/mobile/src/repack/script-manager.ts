// ScriptManager: runtime transport + fallback for federated remotes (Faza 1b).
//
// Module Federation references remotes as `portal@dynamic`, which means the
// container URL is NOT baked into the host bundle - ScriptManager resolves it
// at runtime here. That is what lets us ship a remote update over a CDN / EAS
// Update channel WITHOUT an App Store release (JS-only, see REPACK-MF.md).
//
// Safety model:
//   - Remotes are loaded over HTTPS from an ALLOWLISTED origin only.
//   - If the network fetch fails (offline / bad deploy), we fall back to the
//     remote container that was BUILT INTO the binary at release time, so the
//     feature degrades to a known-good version instead of a blank screen.
//   - Every resolution + failure is breadcrumbed to Sentry, tagged per remote,
//     so it stitches into the same pipeline as RouteErrorBoundary.

import { ScriptManager, Script } from "@callstack/repack/client";
import * as Sentry from "@sentry/react-native";

import { REMOTES } from "@medconnect/mf-contracts";
import { env } from "@/lib/env";

/**
 * Where remote containers are served from. In production this is a versioned,
 * HTTPS, allowlisted origin (a CDN path or an EAS Update asset host). During
 * development it points at the Re.Pack dev server.
 */
const REMOTE_ORIGIN =
  env.remotesBaseUrl ?? // EXPO_PUBLIC_REMOTES_BASE_URL
  (__DEV__ ? "http://localhost:8081" : "https://cdn.medconnect.app/remotes");

/** Only these origins may serve remote JS. Anything else is rejected. */
const ALLOWED_ORIGINS = [REMOTE_ORIGIN, "http://localhost:8081"];

function isAllowed(url: string): boolean {
  return ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
}

/** Container filename convention: `<remote>.container.bundle`. */
function remoteContainerUrl(remoteName: string): string {
  return `${REMOTE_ORIGIN}/${remoteName}/${remoteName}.container.bundle`;
}

ScriptManager.shared.addResolver(async (scriptId, _caller, referenceUrl) => {
  // Known remote containers (host asks for these by their MF `name`).
  const isKnownRemote = (Object.values(REMOTES) as string[]).includes(scriptId);

  if (isKnownRemote) {
    const url = remoteContainerUrl(scriptId);
    if (!isAllowed(url)) {
      throw new Error(`Blocked remote from non-allowlisted origin: ${url}`);
    }
    Sentry.addBreadcrumb({
      category: "mf.resolve",
      level: "info",
      message: `resolve remote ${scriptId}`,
      data: { url },
    });
    return {
      url: Script.getRemoteURL(url),
      cache: !__DEV__,
      // Chunks are integrity-checked in production (Faza 2 CodeSigningPlugin).
      verifyScriptSignature: __DEV__ ? "off" : "strict",
    };
  }

  // Async chunks that belong to an already-resolved remote: resolve them
  // relative to where the container was loaded from.
  if (referenceUrl) {
    const url = Script.getRemoteURL(new URL(scriptId, referenceUrl).toString());
    return { url, cache: !__DEV__ };
  }

  // Not ours - let another resolver (or the default) handle it.
  return undefined;
});
