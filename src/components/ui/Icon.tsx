import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";

// Central icon registry — replaces the emoji glyphs used throughout the web
// app. On this RN/Fabric setup, a custom fontFamily on a Text node
// suppresses the system's automatic emoji-glyph fallback (tofu boxes
// instead of 🏕️/📍/etc), so we use a real icon set instead of Unicode.
const MCI = "mci" as const;
const ION = "ion" as const;

export const ICONS = {
  dashboard: [MCI, "tent"],
  campsites: [MCI, "map-marker-radius"],
  trips: [MCI, "compass-rose"],
  map: [MCI, "map"],
  explore: [MCI, "earth"],
  calendar: [MCI, "calendar-month"],
  maintenance: [MCI, "wrench"],
  more: [ION, "menu"],
  admin: [MCI, "shield-account"],
  help: [ION, "help-circle-outline"],
  settings: [ION, "settings-outline"],
  signOut: [ION, "log-out-outline"],
  chevronRight: [ION, "chevron-forward"],
  close: [ION, "close"],
  check: [ION, "checkmark"],
  play: [ION, "play"],
  email: [MCI, "email-outline"],
  key: [MCI, "key-outline"],
  location: [MCI, "crosshairs-gps"],
  power: [MCI, "flash"],
  water: [MCI, "water"],
  sewer: [MCI, "toilet"],
  fire: [MCI, "fire"],
  publicGlobe: [MCI, "earth"],
  star: [ION, "star"],
  starOutline: [ION, "star-outline"],
  add: [ION, "add"],
  filter: [ION, "filter"],
  layers: [MCI, "layers-outline"],
  directions: [MCI, "directions"],
  search: [ION, "search"],
  camera: [ION, "camera-outline"],
  document: [MCI, "file-document-outline"],
  image: [MCI, "file-image-outline"],
  wordDoc: [MCI, "file-word-outline"],
  spreadsheet: [MCI, "file-excel-outline"],
  attachment: [MCI, "paperclip"],
  openLink: [ION, "open-outline"],
  fishing: [MCI, "fish"],
  hiking: [MCI, "hiking"],
  biking: [MCI, "bike"],
  utv: [MCI, "car-side"],
  activities: [MCI, "compass-outline"],
  chat: [ION, "chatbubble-ellipses"],
  bell: [ION, "notifications-outline"],
  share: [ION, "share-outline"],
  clone: [MCI, "content-copy"],
  signal: [MCI, "signal-cellular-3"],
  land: [MCI, "pine-tree"],
  rig: [MCI, "truck-trailer"],
  sync: [ION, "sync"],
  trash: [ION, "trash-outline"],
  warning: [ION, "warning-outline"],
  info: [ION, "information-circle-outline"],
  refresh: [ION, "refresh"],
  send: [ION, "send"],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = "#F2F5F1",
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}) {
  const [family, glyph] = ICONS[name];
  if (family === MCI) return <MaterialCommunityIcons name={glyph as any} size={size} color={color} style={style} />;
  return <Ionicons name={glyph as any} size={size} color={color} style={style} />;
}

// Weather-code -> icon mapping, mirrors WEATHER_CODES in CampTrack/js/dashboard.js
const WEATHER_ICON_MAP: Record<number, keyof typeof MaterialCommunityIcons.glyphMap> = {
  0: "weather-sunny",
  1: "weather-partly-cloudy",
  2: "weather-partly-cloudy",
  3: "weather-cloudy",
  45: "weather-fog",
  48: "weather-fog",
  51: "weather-rainy",
  53: "weather-rainy",
  55: "weather-pouring",
  61: "weather-rainy",
  63: "weather-pouring",
  65: "weather-pouring",
  66: "weather-hail",
  67: "weather-hail",
  71: "weather-snowy",
  73: "weather-snowy",
  75: "weather-snowy-heavy",
  77: "weather-snowy",
  80: "weather-rainy",
  81: "weather-pouring",
  82: "weather-lightning-rainy",
  85: "weather-snowy",
  86: "weather-snowy-heavy",
  95: "weather-lightning",
  96: "weather-lightning-rainy",
  99: "weather-lightning-rainy",
};

export function WeatherIcon({ code, size = 28, color = "#F2F5F1" }: { code: number; size?: number; color?: string }) {
  const name = WEATHER_ICON_MAP[code] || "help-circle-outline";
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
