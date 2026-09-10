// @medconnect/mf-contracts/shared
//
// Single source of truth for Module Federation `shared` dependencies.
// Imported by BOTH the host (apps/mobile) and every remote (apps/*-remote)
// so the exact same singleton contract is enforced on both sides.
//
// Rules (Faza 1a of the Re.Pack MFE plan):
//   - Anything that MUST be a single instance across host + remotes is a
//     `singleton` (React, the RN runtime, the reactivity/animation runtimes,
//     the navigation tree, the query cache and our design system).
//   - `requiredVersion` is pinned to the host's installed version so a remote
//     built against an incompatible major/minor fails loudly at load time
//     instead of silently double-instantiating a runtime (which crashes RN).
//   - `eager: true` ONLY in the host, because the host ships these in its base
//     bundle; remotes consume them from the shared scope (`eager: false`).

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Read the installed version of a package from the host's node_modules. */
function version(pkg) {
  try {
    return require(`${pkg}/package.json`).version;
  } catch {
    return undefined;
  }
}

/**
 * @param {{ eager?: boolean }} [opts]
 *   Pass `{ eager: true }` from the HOST config, omit it in remotes.
 */
export function getSharedDependencies({ eager = false } = {}) {
  /** @param {string} pkg @param {Partial<import('@module-federation/sdk').moduleFederationPlugin.SharedConfig>} [extra] */
  const singleton = (pkg, extra = {}) => ({
    singleton: true,
    eager,
    // Pin to the major/minor the host was built with. Remotes that were built
    // against a different range will refuse to load rather than corrupt state.
    requiredVersion: version(pkg),
    ...extra,
  });

  return {
    // --- React core: MUST be one instance (hooks + context identity) ---
    react: singleton("react"),
    "react/jsx-runtime": singleton("react"),
    "react-dom": singleton("react-dom"),

    // --- React Native runtime: one instance or the bridge/Fabric breaks ---
    "react-native": singleton("react-native"),

    // --- Reactivity / animation runtimes: worklets + reanimated share a UI
    //     runtime; two copies = two UI runtimes = crashes ---
    "react-native-reanimated": singleton("react-native-reanimated"),
    "react-native-worklets": singleton("react-native-worklets"),
    "react-native-gesture-handler": singleton("react-native-gesture-handler"),
    "react-native-screens": singleton("react-native-screens"),
    "react-native-safe-area-context": singleton("react-native-safe-area-context"),

    // --- App-wide state: a single query cache is part of the contract ---
    "@tanstack/react-query": singleton("@tanstack/react-query"),

    // --- Navigation: expo-router owns the single navigation tree ---
    "expo-router": singleton("expo-router"),

    // --- Our design system: remotes render with the host's tokens/theme so
    //     they look native, and we never ship two copies of it ---
    "@medconnect/shared": singleton("@medconnect/shared"),
  };
}

export default getSharedDependencies;
