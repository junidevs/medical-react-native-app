// Re.Pack (Webpack 5) REMOTE config for the Portal micro-frontend.
//
// This builds an independent Module Federation v2 CONTAINER that the host loads
// at runtime. It exposes exactly one module ("./PortalScreen") per the contract
// in @medconnect/mf-contracts. It ships ONLY JavaScript - every native module it
// uses must already be compiled into the host binary (see REPACK-MF.md).

import path from "node:path";
import * as Repack from "@callstack/repack";
import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";

// Faza 2 hardening: sign remote chunks so the host only executes JS it can
// cryptographically verify. Opt-in via env so local dev doesn't need keys.
//   REPACK_CODE_SIGNING_KEY  -> path to the private key (PEM)
//   REPACK_CODE_SIGNING_PUB  -> path to the public key (embedded natively)
const CODE_SIGNING_KEY = process.env.REPACK_CODE_SIGNING_KEY;
const CODE_SIGNING_PUB = process.env.REPACK_CODE_SIGNING_PUB;

import { getSharedDependencies } from "@medconnect/mf-contracts/shared";
import { REMOTES, PORTAL_EXPOSED_MODULE } from "@medconnect/mf-contracts";

const dirname = Repack.getDirname(import.meta.url);

export default Repack.defineWebpackConfig((env) => {
  const {
    mode = "development",
    context = dirname,
    entry = "./src/index.ts",
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
    },
    output: { clean: true, hashFunction: "xxhash64" },
    optimization: {
      minimize,
      minimizer: [
        new TerserPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          extractComments: false,
          terserOptions: { format: { comments: false }, mangle: { keep_fnames: true } },
        }),
      ],
      chunkIds: "named",
      concatenateModules: false,
    },
    module: {
      rules: [
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
              presets: [["babel-preset-expo"]],
              plugins: ["react-native-worklets/plugin"],
            },
          },
        },
        ...Repack.getAssetTransformRules(),
        {
          test: /\.xml$/,
          use: { loader: "@callstack/repack/assets-loader", options: { platform } },
        },
      ],
    },
    plugins: [
      new Repack.RepackPlugin({ platform }),
      new webpack.DefinePlugin({
        "process.env.EXPO_OS": JSON.stringify(platform),
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: REMOTES.portal,
        // filename that the host's ScriptManager resolves to:
        //   <origin>/portal/portal.container.bundle
        filename: "portal.container.bundle",
        exposes: {
          [PORTAL_EXPOSED_MODULE]: "./src/PortalScreen.tsx",
        },
        // Consume host-provided singletons (NOT eager - host ships them).
        shared: getSharedDependencies({ eager: false }),
      }),
      ...(CODE_SIGNING_KEY
        ? [
            new Repack.plugins.CodeSigningPlugin({
              enabled: true,
              privateKeyPath: CODE_SIGNING_KEY,
              ...(CODE_SIGNING_PUB ? { publicKeyPath: CODE_SIGNING_PUB } : {}),
            }),
          ]
        : []),
    ],
    ...(devServer ? { devServer } : {}),
  };
});
