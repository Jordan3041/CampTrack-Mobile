// Mirrors CampTrack/js/config.js — one place to point the app at the backend.
export const CT_CONFIG = {
  // Local dev against `npm start` inside CampTrack/server (defaults to
  // port 3000). Android emulators can't reach "localhost" on the host
  // machine, so they need 10.0.2.2 instead — see getApiBase() below.
  API_BASE: "https://camptrack.org/api",
  LOCAL_API_BASE: "http://localhost:3000/api",
  // Web origin (no /api) — used to build share links, e.g. a campsite's
  // "Share" button. Mirrors window.location.origin on the web app.
  WEB_ORIGIN: "https://camptrack.org",
  GOOGLE_CLIENT_ID: "371464052847-laq6d85praurqhmh6rla2mp3vdff4mr4.apps.googleusercontent.com",
  APPLE_CLIENT_ID: "",
};
