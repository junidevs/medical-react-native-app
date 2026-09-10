// React Native CLI config - registers Re.Pack's Webpack commands.
//
// This ONLY affects the `react-native` CLI (`react-native start` /
// `react-native bundle`). It does NOT change `expo start` / Metro, which is
// still the default dev flow. Use this path for the Re.Pack MFE spike:
//
//   react-native webpack-start                              # dev server
//   react-native webpack-bundle --platform android --dev false \
//     --entry-file index.repack.js --bundle-output ./dist/index.android.bundle
//
// The Webpack commands are registered under `webpack-*` so they don't shadow
// the default `start`/`bundle` unless you opt in.
module.exports = {
  commands: require("@callstack/repack/commands/webpack"),
};
