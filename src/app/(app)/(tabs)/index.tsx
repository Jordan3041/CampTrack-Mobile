import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EMPTY_RIG, RigForm } from "@/components/RigForm";
import { TutorialModal } from "@/components/TutorialModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, WeatherIcon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { fmtDate, tripStatus } from "@/lib/dates";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy",
  3: "Overcast", 45: "Fog", 48: "Icy fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  77: "Snow grains", 80: "Rain showers", 81: "Rain showers",
  82: "Violent showers", 85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Storm w/ hail", 99: "Storm w/ hail",
};

type WeatherState =
  | { status: "loading" }
  | { status: "no-permission" }
  | { status: "error"; message: string }
  | { status: "ready"; place: string; temp: number; desc: string; code: number; feelsLike: number; wind: number; windUnit: string; humidity: number; unit: string; days: { label: string; code: number; hi: number; lo: number; rain: number }[] };

function WeatherHero({ state }: { state: WeatherState }) {
  if (state.status === "loading") {
    return (
      <Card className="bg-pine/40">
        <ActivityIndicator color="#5BD46B" />
      </Card>
    );
  }
  if (state.status === "no-permission") {
    return (
      <Card className="bg-pine/40">
        <Text className="text-[#cdd8ce]">Location access is off. Allow location to see local weather.</Text>
      </Card>
    );
  }
  if (state.status === "error") {
    return (
      <Card className="bg-pine/40">
        <Text className="text-[#cdd8ce]">{state.message}</Text>
      </Card>
    );
  }
  return (
    <Card className="bg-pine/40 border-lime-dim2">
      <Text className="font-display text-lg text-white mb-1">{state.place}</Text>
      <View className="flex-row items-center gap-4 flex-wrap">
        <WeatherIcon code={state.code} size={44} color="#fff" />
        <Text className="font-display text-5xl text-white">
          {Math.round(state.temp)}°{state.unit}
        </Text>
        <View>
          <Text className="text-white">{state.desc}</Text>
          <Text className="text-[#cdd8ce] text-sm">
            Feels like {Math.round(state.feelsLike)}° · Wind {Math.round(state.wind)} {state.windUnit} · Humidity {state.humidity}%
          </Text>
        </View>
      </View>
      {state.days.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-4">
          {state.days.map((d, i) => (
            <View key={i} className="items-center bg-white/5 border border-glass-border rounded-sm px-2 py-2 min-w-[76px]">
              <Text className="text-ink font-body-bold text-xs">{d.label}</Text>
              <View className="my-1.5">
                <WeatherIcon code={d.code} size={24} color="#F2F5F1" />
              </View>
              <Text className="text-ink font-body-bold text-xs">
                {Math.round(d.hi)}° <Text className="text-stone">/ {Math.round(d.lo)}°</Text>
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Icon name="water" size={11} color="#6E8CA8" />
                <Text className="text-slate text-[11px]">{d.rain}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

// "Camped" nights only count trips that have started (past or active) —
// mirrors nightsCamped() in CampTrack/js/dashboard.js.
function nightsCamped(trips: api.Trip[]) {
  return trips
    .filter((t) => tripStatus(t) !== "upcoming")
    .reduce((sum, t) => {
      const start = new Date(t.start);
      const end = new Date(t.end || t.start);
      const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
      return sum + Math.max(0, nights);
    }, 0);
}

function PersonalStats({ campsites, trips }: { campsites: api.Campsite[]; trips: api.Trip[] }) {
  const nights = nightsCamped(trips);
  const states = new Set(campsites.map((c) => c.state).filter(Boolean)).size;
  const boondocking = campsites.filter((c) => !c.hookupPower && !c.hookupWater && !c.hookupSewer).length;
  const photos = campsites.reduce((sum, c) => sum + (c.photos ? c.photos.length : 0), 0);
  const rows: [string, number][] = [
    ["Nights camped", nights],
    ["States camped in", states],
    ["Boondocking sites", boondocking],
    ["Photos attached", photos],
  ];
  return (
    <Card>
      <Text className="font-display text-lg text-ink mb-2">Your camping stats</Text>
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row justify-between py-1.5 border-b border-line">
          <Text className="text-stone text-sm">{label}</Text>
          <Text className="text-ink font-body-bold">{value}</Text>
        </View>
      ))}
    </Card>
  );
}

function SmartSuggestionsCard({ trip }: { trip: api.Trip | null }) {
  const [suggestions, setSuggestions] = useState<api.TripSuggestion[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!trip) {
      setHidden(true);
      return;
    }
    (async () => {
      try {
        const settings = await api.getSettings();
        if (settings.aiSuggestionsEnabled === false) {
          setHidden(true);
          return;
        }
        // No campsite/trip coordinate resolution here (kept simple relative
        // to the web's full weather-forecast-array builder) — the server
        // still produces useful trip/rig-aware suggestions without it.
        const { suggestions: s } = await api.getTripSuggestions(trip.id!, []);
        if (!s || !s.length) {
          setHidden(true);
          return;
        }
        setSuggestions(s);
      } catch (_) {
        setHidden(true);
      }
    })();
  }, [trip?.id]);

  if (hidden || !trip || !suggestions) return null;

  return (
    <Card className="border-lime-dim2">
      <Text className="font-display text-lg text-ink mb-2">Smart Suggestions</Text>
      {suggestions.map((s, i) => (
        <View key={i} className="flex-row gap-2.5 py-2 border-b border-line">
          <Icon name="chat" size={16} color="#5BD46B" />
          <View className="flex-1">
            <Text className="text-lime-bright text-xs font-body-bold uppercase">{s.category || "Tip"}</Text>
            <Text className="text-ink text-sm mt-0.5">{s.message}</Text>
          </View>
        </View>
      ))}
      <Text className="text-stone text-xs mt-2">✨ Suggestions by Gemini, for "{trip.title}"</Text>
    </Card>
  );
}

export default function DashboardScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  const [trips, setTrips] = useState<api.Trip[] | null>(null);
  const [campsites, setCampsites] = useState<api.Campsite[] | null>(null);
  const [tripsError, setTripsError] = useState("");
  const [stats, setStats] = useState<{ campsites: number; past: number; upcoming: number; maintenance: number } | null>(null);
  const [statsError, setStatsError] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRigSetup, setShowRigSetup] = useState(false);
  const [onboardingRig, setOnboardingRig] = useState<api.Rig>(EMPTY_RIG);
  const [savingRigSetup, setSavingRigSetup] = useState(false);

  // Rig onboarding runs once, before the tutorial, only for a genuinely new
  // account (existing accounts already have hasSeenTutorial = true).
  // Mirrors maybeShowOnboarding() in CampTrack/js/dashboard.js.
  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        if (!s.hasSeenRigSetup && !s.hasSeenTutorial) {
          setShowRigSetup(true);
        } else if (!s.hasSeenTutorial) {
          setShowTutorial(true);
        }
      })
      .catch(() => {});
  }, []);

  async function finishRigSetup(save: boolean) {
    setSavingRigSetup(true);
    try {
      if (save) await api.saveRig(onboardingRig);
    } catch (_) {
      /* non-fatal — onboarding still completes */
    }
    try {
      const s = await api.getSettings();
      await api.saveSettings({ ...s, hasSeenRigSetup: true });
    } catch (_) {}
    setSavingRigSetup(false);
    setShowRigSetup(false);
    setShowTutorial(true);
  }

  async function finishTutorial() {
    setShowTutorial(false);
    try {
      const s = await api.getSettings();
      await api.saveSettings({ ...s, hasSeenTutorial: true });
    } catch (_) {}
  }

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setWeather({ status: "no-permission" });
          return;
        }
        let unit: "F" | "C" = "F";
        try {
          unit = (await api.getSettings()).tempUnit || "F";
        } catch (_) {}
        const pos = await Location.getCurrentPositionAsync({});
        const { latitude: lat, longitude: lon } = pos.coords;
        const tempParam = unit === "C" ? "celsius" : "fahrenheit";
        const windParam = unit === "C" ? "kmh" : "mph";
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
          `&temperature_unit=${tempParam}&wind_speed_unit=${windParam}&timezone=auto&forecast_days=7`;
        const res = await fetch(url);
        const w = await res.json();
        const cur = w.current;
        const desc = WEATHER_DESCRIPTIONS[cur.weather_code] || "—";
        let place = "Your location";
        try {
          const g = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          const gj = await g.json();
          place = [gj.city || gj.locality, gj.principalSubdivision].filter(Boolean).join(", ") || place;
        } catch (_) {}
        const days = w.daily.time.slice(0, 6).map((d: string, i: number) => {
          const label = i === 0 ? "Today" : new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "short" });
          return {
            label,
            code: w.daily.weather_code[i],
            hi: w.daily.temperature_2m_max[i],
            lo: w.daily.temperature_2m_min[i],
            rain: w.daily.precipitation_probability_max[i],
          };
        });
        setWeather({
          status: "ready",
          place,
          temp: cur.temperature_2m,
          desc,
          code: cur.weather_code,
          feelsLike: cur.apparent_temperature,
          wind: cur.wind_speed_10m,
          windUnit: unit === "C" ? "km/h" : "mph",
          humidity: cur.relative_humidity_2m,
          unit,
          days,
        });
      } catch (e) {
        setWeather({ status: "error", message: "Couldn't reach the weather service. Check your connection and reload." });
      }
    })();
  }, []);

  useEffect(() => {
    api.getTrips().then(setTrips).catch((e) => setTripsError(e.message));
  }, []);

  useEffect(() => {
    Promise.all([api.getCampsites(), api.getTrips(), api.getMaintenance()])
      .then(([campsitesRes, allTrips, maintenance]) => {
        setCampsites(campsitesRes);
        const past = allTrips.filter((t) => tripStatus(t) === "past").length;
        setStats({ campsites: campsitesRes.length, past, upcoming: allTrips.length - past, maintenance: maintenance.length });
      })
      .catch((e) => setStatsError(e.message));
  }, []);

  const upcoming = (trips || []).filter((t) => tripStatus(t) !== "past").slice(0, 5);
  const soonestTrip = upcoming.length ? upcoming[0] : null;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["left", "right"]}>
    <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
      <Text className="font-display text-2xl text-ink mb-4">
        {session?.firstName ? `Welcome back, ${session.firstName}` : "Dashboard"}
      </Text>

      <WeatherHero state={weather} />

      {trips !== null && <SmartSuggestionsCard trip={soonestTrip} />}

      <Card>
        <Text className="font-display text-lg text-ink mb-2">Upcoming trips</Text>
        {tripsError ? (
          <Text className="text-danger text-sm">{tripsError}</Text>
        ) : trips === null ? (
          <ActivityIndicator color="#5BD46B" />
        ) : upcoming.length === 0 ? (
          <EmptyState icon="trips">
            No trips on the horizon.{" "}
            <Text className="text-lime" onPress={() => router.push("/(app)/(tabs)/trips")}>
              Plan one
            </Text>
            .
          </EmptyState>
        ) : (
          upcoming.map((t) => {
            const status = tripStatus(t);
            const packed = (t.packing || []).filter((p) => p.packed).length;
            const total = (t.packing || []).length;
            return (
              <View key={t.id} className="flex-row justify-between items-start py-3 border-b border-line">
                <View className="flex-1 pr-2">
                  <Text className="text-ink font-body-bold">{t.title}</Text>
                  <View className="my-1">
                    <Badge kind={status === "active" ? "active" : "upcoming"}>
                      {status === "active" ? "Happening now" : "Upcoming"}
                    </Badge>
                  </View>
                  <Text className="text-stone text-xs">
                    {fmtDate(t.start)}
                    {t.end && t.end !== t.start ? ` – ${fmtDate(t.end)}` : ""} · {t.location || ""}
                  </Text>
                  <Text className="text-stone text-xs">
                    Packing: {packed}/{total} packed
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <View className="flex-row flex-wrap gap-3 mb-4">
        {statsError ? (
          <Text className="text-danger text-sm">{statsError}</Text>
        ) : !stats ? (
          <ActivityIndicator color="#5BD46B" />
        ) : (
          [
            ["Campsites logged", stats.campsites],
            ["Trips completed", stats.past],
            ["Trips planned", stats.upcoming],
            ["Maintenance records", stats.maintenance],
          ].map(([label, value]) => (
            <View key={label as string} className="bg-surface border border-glass-border rounded-md p-4 flex-1 min-w-[45%]">
              <Text className="font-display text-2xl text-ink">{value}</Text>
              <Text className="text-stone text-xs">{label}</Text>
            </View>
          ))
        )}
      </View>

      {campsites && trips && <PersonalStats campsites={campsites} trips={trips} />}
    </ScrollView>

    <FormModal visible={showRigSetup} title="Create your rig" onClose={() => finishRigSetup(false)}>
      <Text className="text-stone text-sm mb-2">Tell us what you camp in — you can always edit this later from your Profile.</Text>
      <RigForm rig={onboardingRig} onChange={setOnboardingRig} />
      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Skip for now" variant="ghost" onPress={() => finishRigSetup(false)} loading={savingRigSetup} />
        <Button title="Save & continue" onPress={() => finishRigSetup(true)} loading={savingRigSetup} />
      </View>
    </FormModal>

    <TutorialModal visible={showTutorial} onFinish={finishTutorial} />
    </SafeAreaView>
  );
}
