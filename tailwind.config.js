/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand greens (logo + a few accents)
        pine: "#2F5D50",
        "pine-deep": "#1E3F35",

        // Charcoal surfaces
        bg: "#0E120F",
        "bg-2": "#0A0D0B",
        surface: "#171C18",
        "surface-2": "#1F261F",

        // Lime accent scale
        lime: "#5BD46B",
        "lime-bright": "#7BE88A",
        "lime-deep": "#37A552",
        "lime-dim": "rgba(91, 212, 107, 0.14)",
        "lime-dim-2": "rgba(91, 212, 107, 0.22)",

        // Supporting
        amber: "#E0B23C",
        "amber-deep": "#C7922A",
        ember: "#E0673C",
        danger: "#E0673C",
        slate: "#6E8CA8",
        ok: "#5BD46B",

        // Text
        ink: "#F2F5F1",
        stone: "#9BA69C",
        line: "rgba(255, 255, 255, 0.10)",

        // Glass surfaces
        "glass-bg": "rgba(30, 37, 31, 0.55)",
        "glass-bg-strong": "rgba(24, 30, 25, 0.85)",
        "glass-border": "rgba(255, 255, 255, 0.10)",
      },
      borderRadius: {
        DEFAULT: "16px",
        sm: "10px",
      },
      fontFamily: {
        display: ["Bitter_700Bold"],
        "display-semibold": ["Bitter_600SemiBold"],
        body: ["PublicSans_400Regular"],
        "body-medium": ["PublicSans_500Medium"],
        "body-semibold": ["PublicSans_600SemiBold"],
        "body-bold": ["PublicSans_700Bold"],
        mono: ["IBMPlexMono_400Regular"],
        "mono-medium": ["IBMPlexMono_500Medium"],
      },
    },
  },
  plugins: [],
};
