const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Some Swift pods pulled in transitively by @react-native-google-signin
// (AppCheckCore, GoogleUtilities, RecaptchaInterop) don't define modules,
// which breaks `pod install` when building as static libraries. CocoaPods'
// own fix is `use_modular_headers!` in the Podfile — expo-build-properties
// has no blanket switch for this, so it's injected directly here instead.
// Podfile is regenerated on every prebuild, so this has to run as a plugin
// rather than a one-off hand edit.
module.exports = function withPodfileModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf8");
      if (!contents.includes("use_modular_headers!")) {
        contents = contents.replace(
          /(platform :ios.*\n)/,
          `$1use_modular_headers!\n`
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
};
