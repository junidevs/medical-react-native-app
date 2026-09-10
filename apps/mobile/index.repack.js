// Re.Pack HOST entry (spike). Used ONLY by the React Native CLI + Webpack path.
// The Metro/`expo start` path still uses "expo-router/entry" (package.json main).
//
// expo-router is normally bootstrapped by Metro via a virtual entry. Under
// Webpack/Re.Pack we bootstrap it ourselves: build the app-root require.context
// (Webpack supports require.context natively) and hand it to <ExpoRoot />.

import React from "react";
import { AppRegistry } from "react-native";
import { ExpoRoot } from "expo-router";

// Register remote transport/resolver BEFORE React renders so lazy remotes can
// be loaded on demand. See src/repack/script-manager.ts.
import "@/repack/script-manager";

// The first argument MUST be a string literal so Webpack can build the context
// at compile time (AOT). "./app" is resolved relative to this file (app root).
// eslint-disable-next-line
const ctx = require.context(
  "./app",
  true,
  /^\.\/(?!.*\+api\.[tj]sx?$).*\.[tj]sx?$/,
);

function Root() {
  return React.createElement(ExpoRoot, { context: ctx });
}

// Expo registers the root component under "main".
AppRegistry.registerComponent("main", () => Root);
