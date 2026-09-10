# MedConnect — Micro-frontends on Re.Pack (Module Federation v2)

Implementation notes for the Re.Pack MFE plan. This documents **what was built**,
the **empirical Gate 0 results**, and the **decisions** (go/no-go, managed vs bare).

> This is an **opt-in, additive** setup. Metro + `expo start` remain the default
> dev/build flow (`package.json` `"main"` is still `expo-router/entry`). Re.Pack
> is only used through the React Native CLI (`react-native webpack-*`).

---

## 1. What was built

| Piece | File | Role |
| --- | --- | --- |
| Host bundler config | `apps/mobile/webpack.config.mjs` | Webpack 5 + Re.Pack host; babel-preset-expo pipeline; `ModuleFederationPluginV2` (`name: host`, consumes `portal@dynamic`) |
| Host RN entry | `apps/mobile/index.repack.js` | `AppRegistry.registerComponent("main")` → `<ExpoRoot>` with a manual `require.context("./app")` |
| RN CLI wiring | `apps/mobile/react-native.config.js` | Registers Re.Pack's `webpack-start` / `webpack-bundle` commands |
| Transport + fallback | `apps/mobile/src/repack/script-manager.ts` | `ScriptManager` resolver (HTTPS allowlist, signature verify, Sentry breadcrumbs) |
| Host-side consumer | `apps/mobile/src/repack/remote-portal.tsx` | Loads `portal/PortalScreen` at runtime, built-in fallback, Sentry tags |
| Demo route | `apps/mobile/app/(app)/portal-remote.tsx` | Hidden route rendering `<RemotePortal>`, reuses `RouteErrorBoundary` |
| Prebuild plugin | `apps/mobile/plugins/with-repack.js` | Makes native **release** builds bundle via RN CLI (Re.Pack) instead of Metro |
| Shared contract | `packages/mf-contracts/src/index.ts` | Typed `RemoteScreenModule` / `RemoteHostContext` + versions |
| Shared singletons | `packages/mf-contracts/shared.mjs` | Single source of truth for MF `shared` (both host + remotes) |
| Portal remote | `apps/portal-remote/*` | Independent MF container exposing `./PortalScreen` |
| CI | `.github/workflows/remotes.yml` | Per-remote build/version/sign/publish, "remotes = only JS" guard |

---

## 2. How to run

```sh
# 0) Native dirs (managed workflow, CNG). Add the plugin first for RELEASE builds:
#    app.config.ts -> plugins: [ ..., "./plugins/with-repack" ]
pnpm --filter @medconnect/mobile exec expo prebuild

# 1) Dev servers (host + remote) via Re.Pack (NOT expo start / Expo Go / EAS)
pnpm --filter @medconnect/mobile     exec react-native webpack-start           # :8081
pnpm --filter @medconnect/portal-remote exec react-native webpack-start --port 9000

# 2) Install the dev build on a device/emulator (native, not Expo Go)
pnpm --filter @medconnect/mobile exec react-native run-android --no-packager
pnpm --filter @medconnect/mobile exec react-native run-ios     --no-packager   # macOS only

# 3) Production JS bundles
pnpm --filter @medconnect/mobile        run repack:bundle:android
pnpm --filter @medconnect/portal-remote run bundle:android
```

The normal Expo/Metro flow is unchanged: `pnpm --filter @medconnect/mobile start`.

---

## 3. Gate 0 — empirical results ✅ GO (with caveats)

Gate 0 is the go/no-go on the single biggest unknown: **does expo-router even
bundle under Webpack/Re.Pack, together with Reanimated + New Arch on Expo SDK 57?**
We answered it by actually running the bundlers locally (no device needed).

**Host** — `react-native webpack-bundle --platform android`:

```
android (webpack 5.110.3) compiled with 7 warnings
asset index.bundle 7.96 MiB [emitted] (name: main)
mf-manifest.json / mf-stats.json [emitted]
```

`mf-manifest.json` confirms the federation wiring:
- `name: host`, `remotes: ["portal"]`
- shared **singletons** pinned to exact versions: `react@19.2.3`,
  `react-native@0.86.3`, `expo-router@57.0.18`, `react-native-reanimated@4.5.1`,
  `react-native-worklets@0.10.1`, gesture-handler / screens / safe-area-context,
  `@tanstack/react-query@5.102.8`, `@medconnect/shared` + the auto RN deep-imports.

**Remote** — `react-native webpack-bundle` in `apps/portal-remote`:

```
android (webpack 5.110.3) compiled successfully
portal.container.bundle [emitted]
mf-manifest.json (name: portal, exposes: ["./PortalScreen"]) [emitted]
@mf-types.d.ts / @mf-types.zip [emitted]   # federated DTS contract
```

### What this proves
- `expo-router`'s `require.context("./app")` **works under Webpack** once we
  `DefinePlugin` the `EXPO_ROUTER_*` env vars and bootstrap `<ExpoRoot>` ourselves.
- Reanimated 4 worklets transform correctly **because we use `babel-preset-expo`
  via `babel-loader`** instead of Re.Pack's default SWC pipeline (SWC would not
  run `react-native-worklets/plugin`).
- Module Federation v2 host↔remote wiring + shared singletons build cleanly.

### Frictions found & fixed
1. `.xml` Android vector drawables in expo-router had no loader → added a
   `@callstack/repack/assets-loader` rule.
2. `Cannot get final name for export '__esModule'` → Webpack scope-hoisting
   (`concatenateModules`) mis-handles expo-router's precompiled CommonJS when it
   is a shared singleton → set `optimization.concatenateModules: false`
   (irrelevant for RN since Hermes compiles to bytecode).
3. Re.Pack's MF plugin requires the **`@module-federation/enhanced`** peer to be
   installed explicitly (it is not by default).

### Remaining warnings (benign)
- `@shopify/flash-list` not found — optional dep of `@gorhom/bottom-sheet`.
- `expo-modules-core` `NativeModule`/`SharedObject`/`SharedRef` "no exports" —
  type-only re-exports from `.ts-declarations`.
- `react-native-is-edge-to-edge` re-exports + reanimated `jestUtils` dynamic
  `require` — dev/edge-case paths, not on the runtime path.

### Caveat (why it's "GO with caveats", not "DONE")
Bundling ✅ is proven. **Runtime on a device is NOT yet verified here** because
this repo is on Windows (no local iOS build) and Re.Pack is **not** compatible
with Expo Go / Expo CLI / EAS Build — it needs a bare `react-native run-*`
native build. The remaining Gate 0 confirmation (Hermes + New Arch boot,
remote lazy-load on a real iOS + Android dev build) must be run on a machine
with the native toolchains (macOS for iOS).

---

## 4. The "remotes = only JS" rule (non-negotiable)

Module Federation federates **JavaScript only**. Every native module a remote
touches (`expo-camera`, `react-native-reanimated`, `@shopify/react-native-skia`,
`react-native-mmkv`, `expo-blur`, …) **must already be compiled into the host
binary**. A remote can never add a new native dependency over-the-air — that
still requires an App Store / Play release of the host. The `shared` singletons
in `packages/mf-contracts/shared.mjs` are exactly the runtimes that must be a
single instance across host + remotes. CI enforces this (`remotes.yml`).

---

## 5. Transport, fallback & security (Faza 1b + 2)

- **Transport**: `portal@dynamic` → URL resolved at runtime by `ScriptManager`
  from `EXPO_PUBLIC_REMOTES_BASE_URL` (CDN / EAS Update host). Convention:
  `<origin>/portal/portal.container.bundle`.
- **Allowlist**: only allowlisted HTTPS origins may serve remote JS.
- **Integrity**: remote chunks are signed (`CodeSigningPlugin`, opt-in via
  `REPACK_CODE_SIGNING_KEY`); the host verifies with `verifyScriptSignature:
  "strict"` in production.
- **Fallback**: if the fetch fails (offline / bad deploy / running under Metro),
  `RemotePortal` renders a built-in version — the feature never goes blank.
- **Observability**: resolves, failures and remote errors are sent to Sentry
  tagged `boundary=module-federation`, `remote=portal`, stitching into the same
  pipeline as `RouteErrorBoundary`.

---

## 6. Decision — Expo **managed (CNG)** vs **bare**

**Recommendation: stay managed (CNG) — keep `expo prebuild`, treat Re.Pack as a
JS-bundler swap only.**

- We keep `app.config.ts` + config plugins (icons, permissions, widgets, splash,
  updates) and regenerate `ios/`/`android/` with `expo prebuild`. No hand-edited
  native projects to maintain.
- `plugins/with-repack.js` re-applies the "bundle with RN CLI" change after every
  prebuild, so the managed workflow survives regen.
- Cost of this choice: we **lose Expo Go, Expo CLI dev, and EAS Build's default
  bundling** for the Re.Pack path (must use `react-native run-*` + our own native
  build/CI). We also own `webpack.config.mjs` and must re-validate it on every
  Expo SDK bump (this is the main ongoing maintenance risk, since the Expo↔Re.Pack
  integration is community-supported, not official — `@callstack/repack-plugin-expo`
  is still an unreleased draft).

Go **bare** only if we later need to hand-modify native projects beyond what
config plugins allow. Until then, managed + Re.Pack-for-JS is the lowest-risk
path and is fully reversible (delete the Re.Pack files → Metro is still there).

---

## 7. Recommended next steps (device verification)
1. On macOS: `expo prebuild` → `react-native run-ios` / `run-android` and boot
   the host (verify Hermes + New Architecture come up under Re.Pack).
2. Serve the Portal remote (`webpack-start --port 9000`), open the hidden
   `/portal-remote` route, confirm the remote lazy-loads and the fallback path
   works when the remote server is down.
3. Wire a real CDN/EAS Update origin + signing keys into `remotes.yml`.
4. Only then flip any production traffic; keep the built-in fallback shipping.
