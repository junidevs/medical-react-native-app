// Re.Pack (Webpack 5) HOST config - MedConnect MFE spike (Faza 0a/0b).
//
// IMPORTANT: This is an OPT-IN, additive path. Metro + `expo start` remain the
// default dev/build flow (package.json "main" is still "expo-router/entry").
// This config is only used when the app is driven through the React Native CLI
// (`react-native start` / `react-native bundle`), wired via react-native.config.js.
//
// Why this shape (see REPACK-MF.md for the full rationale):
//   1. expo-router is Metro-native. Under Webpack we must (a) DefinePlugin the
//      EXPO_ROUTER_* env vars babel-preset-expo expects, and (b) hand ExpoRoot a
//      require.context ourselves (src/repack/expo-router-context.ts).
//   2. Re.Pack's default getJsTransformRules() uses SWC, which does NOT run
//      react-native-worklets/plugin. Our app uses Reanimated 4.5.1 (worklets),
//      so we transform JS/TS with babel-preset-expo via babel-loader instead.
//   3. Module Federation v2 exposes/consumes ONLY JavaScript. Native modules
//      (expo-camera, skia, reanimated, MMKV, ...) must already be in the binary.

import path from "node:path";
import * as Repack from "@callstack/repack";
import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";

import { getSharedDependencies } from "@medconnect/mf-contracts/shared";

const dirname = Repack.getDirname(import.meta.url);
const APP_ROOT_ABS = path.join(dirname, "app"); // expo-router routes directory

export default Repack.defineWebpackConfig((env) => {
  const {
    mode = "development",
    context = dirname,
    entry = "./index.repack.js",
    platform = process.env.PLATFORM,
    minimize = mode === "production",
    devServer,
  } = env;

  if (!platform) {
    throw new Error("Missing 'platform' - pass --platform ios|android to the RN CLI.");
  }

  return {
    mode,
    context,
    entry,
    devtool: false,
    resolve: {
      ...Repack.getResolveOptions(platform, { enablePackageExports: true }),
      alias: {
        "@": path.join(dirname, "src"),
      },
    },
    output: {
      clean: true,
      hashFunction: "xxhash64",
    },
    optimization: {
      minimize,
      minimizer: [
        new TerserPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          extractComments: false,
          terserOptions: { format: { comments: false }, mangle: { keep_fnames: true } },
        }),
      ],
      // Deterministic module ids so remote <-> host shared modules stay aligned.
      chunkIds: "named",
      // Scope hoisting mis-generates the CommonJS "__esModule" re-export for
      // Module Federation shared singletons (expo-router's precompiled build).
      // RN bundles run through Hermes bytecode, so hoisting brings no real win.
      concatenateModules: false,
    },
    module: {
      rules: [
        // One Babel pipeline for ALL JS/TS (app, workspace packages AND
        // node_modules) using babel-preset-expo - this mirrors what Metro does:
        //   - strips Flow from react-native core,
        //   - injects expo-router's app-root require.context,
        //   - runs react-native-worklets/plugin for Reanimated 4 worklets.
        // We deliberately do NOT use Re.Pack's SWC getJsTransformRules() here,
        // because SWC would not run the worklets Babel plugin.
        {
          test: /\.[cm]?[jt]sx?$/,
          type: "javascript/auto",
          use: {
            loader: "babel-loader",
            options: {
              babelrc: false,
              configFile: false,
              cacheDirectory: true,
              caller: { name: "metro", platform, bundler: "metro" },
              // Default (CommonJS) module output - matches Metro's interop and
              // avoids ESM<->CJS "__esModule" reconciliation errors when Webpack
              // scope-hoists expo-router's precompiled CommonJS build.
              presets: [["babel-preset-expo"]],
              // Must be last per Reanimated docs.
              plugins: ["react-native-worklets/plugin"],
            },
          },
        },
        ...Repack.getAssetTransformRules(),
        // expo-router ships Android vector drawables (*.xml) that Metro treats
        // as assets; Webpack needs an explicit loader for them.
        {
          test: /\.xml$/,
          use: { loader: "@callstack/repack/assets-loader", options: { platform } },
        },
      ],
    },
    plugins: [
      new Repack.RepackPlugin({ platform }),
      // expo-router / expo runtime globals that babel-preset-expo + the router
      // read at build time (there is no Metro to inject them here).
      new webpack.DefinePlugin({
        "process.env.EXPO_OS": JSON.stringify(platform),
        "process.env.EXPO_BASE_URL": JSON.stringify(""),
        "process.env.EXPO_PROJECT_ROOT": JSON.stringify(dirname),
        "process.env.EXPO_ROUTER_ABS_APP_ROOT": JSON.stringify(APP_ROOT_ABS),
        "process.env.EXPO_ROUTER_APP_ROOT": JSON.stringify("./app"),
        "process.env.EXPO_ROUTER_IMPORT_MODE": JSON.stringify("sync"),
      }),
      // --- Module Federation v2 (Faza 0b) ---
      // Host consumes the Portal remote. `portal@dynamic` defers URL resolution
      // to ScriptManager at runtime (see src/repack/script-manager.ts) so the
      // transport (CDN / EAS Update channel) can change without a rebuild.
      new Repack.plugins.ModuleFederationPluginV2({
        name: "host",
        // Host ships the base runtime eagerly; remotes borrow it.
        shared: getSharedDependencies({ eager: true }),
        remotes: {
          portal: "portal@dynamic",
        },
      }),
    ],
    ...(devServer ? { devServer } : {}),
  };
});
