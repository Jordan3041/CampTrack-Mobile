import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import * as api from "@/lib/api";
import { todayISO, tripStatus } from "@/lib/dates";

function iso(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Mirrors CampTrack/js/calendar.js — month grid of trip chips.
export default function CalendarScreen() {
  const router = useRouter();
  const [view, setView] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [trips, setTrips] = useState<api.Trip[] | null>(null);
  const [settings, setSettings] = useState<api.Settings>({
    tempUnit: "F",
    distanceUnit: "mi",
    weekStart: "sunday",
    showPastInCalendar: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
    api.getTrips().then(setTrips).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Screen>
        <Text className="text-danger">{error}</Text>
      </Screen>
    );
  }
  if (!trips) {
    return (
      <Screen>
        <ActivityIndicator color="#5BD46B" className="mt-4" />
      </Screen>
    );
  }

  const visibleTrips = settings.showPastInCalendar ? trips : trips.filter((t) => tripStatus(t) !== "past");
  const year = view.getFullYear();
  const month = view.getMonth();
  const today = todayISO();
  const mondayStart = settings.weekStart === "monday";

  const start = new Date(year, month, 1);
  const offset = mondayStart ? (start.getDay() + 6) % 7 : start.getDay();
  start.setDate(start.getDate() - offset);

  const cells: { dISO: string; day: number; inMonth: boolean; trips: api.Trip[] }[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    const dISO = iso(cursor);
    cells.push({
      dISO,
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === month,
      trips: visibleTrips.filter((t) => t.start <= dISO && (t.end || t.start) >= dISO),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const dowLabels = mondayStart
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Screen>
      <View className="flex-row items-center justify-between mb-3 mt-1">
        <Pressable
          onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
          className="w-9 h-9 rounded-sm border border-line bg-white/5 items-center justify-center">
          <Icon name="chevronRight" size={18} color="#F2F5F1" style={{ transform: [{ rotate: "180deg" }] }} />
        </Pressable>
        <View className="flex-row items-center gap-3">
          <Text className="font-display text-lg text-ink">{view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
          <Button title="Today" variant="ghost" size="sm" onPress={() => setView(new Date(new Date().setDate(1)))} />
        </View>
        <Pressable
          onPress={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
          className="w-9 h-9 rounded-sm border border-line bg-white/5 items-center justify-center">
          <Icon name="chevronRight" size={18} color="#F2F5F1" />
        </Pressable>
      </View>

      <View className="flex-row">
        {dowLabels.map((d) => (
          <Text key={d} className="flex-1 text-center text-stone text-[10px] font-body-bold uppercase py-1.5">
            {d}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((c) => (
          <View
            key={c.dISO}
            style={{ width: "14.28%", minHeight: 64 }}
            className={`border border-line p-1 ${c.inMonth ? "bg-white/[0.03]" : "bg-white/[0.01]"} ${
              c.dISO === today ? "border-2 border-lime" : ""
            }`}>
            <Text className={`text-[11px] font-body-bold ${c.inMonth ? "text-ink" : "text-stone"}`}>{c.day}</Text>
            {c.trips.slice(0, 2).map((t) => (
              <Pressable key={t.id} onPress={() => router.push("/(app)/(tabs)/trips")}>
                <Text
                  numberOfLines={1}
                  className={`text-[9px] font-body-bold rounded px-1 mt-0.5 ${
                    tripStatus(t) === "past" ? "bg-white/20 text-ink/80" : "bg-lime text-[#0B0F0B]"
                  }`}>
                  {t.title}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
