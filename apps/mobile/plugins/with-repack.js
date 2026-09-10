// Expo config plugin: make the *native production build* bundle JS with the
// React Native CLI (Re.Pack) instead of Expo's Metro.
//
// Background: `expo prebuild` writes build scripts that call Expo's CLI +
// Metro to produce the JS bundle during a release build. For the Re.Pack MFE
// spike we need those release builds to call the RN CLI (which uses our
// react-native.config.js -> Re.Pack). This plugin rewrites the generated
// Android/iOS bundling steps after every prebuild so the change survives.
//
// OPT-IN: this is intentionally NOT added to app.config.ts by default, so the
// normal Expo/Metro workflow keeps working. Add it only when running the spike:
//
//   // app.config.ts -> plugins: [ ..., "./plugins/with-repack" ]
//
// Dev builds are unaffected: run `react-native run-ios --no-packager` /
// `react-native run-android --no-packager`, then `react-native webpack-start`.

const { withAppBuildGradle, withXcodeProject } = require("expo/config-plugins");

/** @param {import('expo/config').ExpoConfig} config */
module.exports = function withRepack(config) {
  let next = config;

  // iOS: point $CLI_PATH at @react-native-community/cli and drop $BUNDLE_COMMAND
  // so the "Bundle React Native code and images" phase runs `bundle`.
  next = withXcodeProject(next, (cfg) => {
    const project = cfg.modResults;
    const phase = project.buildPhaseObject(
      "PBXShellScriptBuildPhase",
      "Bundle React Native code and images",
    );
    if (!phase) return cfg;

    const script = JSON.parse(phase.shellScript);
    const patched = script
      .replace(
        /if \[\[ -z "\$CLI_PATH" \]\]; then[\s\S]*?fi\n?/g,
        `export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('@react-native-community/cli/package.json')) + '/build/bin.js'")"\n`,
      )
      .replace(/if \[\[ -z "\$BUNDLE_COMMAND" \]\]; then[\s\S]*?fi\n?/g, "")
      .replace(/\$BUNDLE_COMMAND/g, "bundle");
    phase.shellScript = JSON.stringify(patched);
    return cfg;
  });

  // Android: remove the Expo cliFile and force `bundleCommand = "bundle"`.
  next = withAppBuildGradle(next, (cfg) => {
    cfg.modResults.contents = cfg.modResults.contents
      .replace(/cliFile.*\n?/g, "")
      .replace(/bundleCommand.*\n?/g, 'bundleCommand = "bundle"\n');
    return cfg;
  });

  return next;
};
