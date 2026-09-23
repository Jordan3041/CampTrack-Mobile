// Dynamic overlay on top of app.json. Keeps secrets (like the Android Maps
// API key) out of committed config — the last one got auto-suspended by
// Google after being hardcoded here and picked up by a repo scanner.
// Set GOOGLE_MAPS_ANDROID_API_KEY in .env.local for local builds, and as an
// EAS secret (`eas secret:create`) for cloud builds.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
});
