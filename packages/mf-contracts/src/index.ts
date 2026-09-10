// @medconnect/mf-contracts
//
// The typed contract between the host and each federated remote. A remote is a
// black box behind Module Federation; the ONLY thing the host is allowed to
// assume about it is this interface. Changing it is a breaking change and must
// bump the remote's contract version (see `PORTAL_CONTRACT_VERSION`).

import type { ComponentType } from "react";

/**
 * Everything the host injects into a remote when it mounts it. Keeping this
 * explicit (instead of letting the remote reach into host internals) is what
 * makes a remote independently buildable and testable.
 */
export interface RemoteHostContext {
  /** Correlation/session id so remote telemetry stitches into host traces. */
  readonly sessionId: string | null;
  /** Access token accessor; remotes never read the token store directly. */
  readonly getAccessToken: () => Promise<string | null>;
  /** Base URL of the MedConnect API. */
  readonly apiBaseUrl: string;
  /** Report an error from inside the remote through the host's pipeline. */
  readonly reportError: (error: unknown, context?: Record<string, unknown>) => void;
  /** Navigate using the host's expo-router instance. */
  readonly navigate: (href: string) => void;
}

/**
 * The shape every remote screen module MUST default-export. The host loads the
 * remote lazily and renders `Screen`; `meta` lets the host decide fallbacks and
 * observability tags without loading the whole remote.
 */
export interface RemoteScreenModule {
  readonly meta: RemoteModuleMeta;
  readonly Screen: ComponentType<{ host: RemoteHostContext }>;
}

export interface RemoteModuleMeta {
  /** Stable remote name, matches the Module Federation container `name`. */
  readonly remote: string;
  /** Human title used in loading/fallback UI. */
  readonly title: string;
  /** Semver of the CONTRACT this remote was built against. */
  readonly contractVersion: string;
}

// Bump when `RemoteScreenModule`/`RemoteHostContext` change shape.
export const PORTAL_CONTRACT_VERSION = "1.0.0" as const;

/** The federated module ids a remote may expose (host allowlist). */
export const PORTAL_EXPOSED_MODULE = "./PortalScreen" as const;

/** Logical remote names known to the host (used for ScriptManager routing). */
export const REMOTES = {
  portal: "portal",
} as const;

export type RemoteName = (typeof REMOTES)[keyof typeof REMOTES];
