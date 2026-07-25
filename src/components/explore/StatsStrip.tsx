import React from "react";
import { Text, View } from "react-native";

type StatSite = { state?: string; siteType?: string };

// Mirrors renderStats() in CampTrack/js/explore.js.
export function StatsStrip({ sites }: { sites: StatSite[] }) {
  const states = new Set(sites.map((s) => s.state).filter(Boolean));
  const rvCount = sites.filter((s) => s.siteType === "rv" || s.siteType === "both").length;
  const tentCount = sites.filter((s) => s.siteType === "tent" || s.siteType === "both").length;

  const tiles: [string, number][] = [
    ["Public campsites", sites.length],
    ["States represented", states.size],
    ["RV-friendly sites", rvCount],
    ["Tent sites", tentCount],
  ];

  return (
    <View className="flex-row flex-wrap gap-2 px-4">
      {tiles.map(([label, value]) => (
        <View key={label} className="bg-surface border border-glass-border rounded-md px-3 py-2 flex-1 min-w-[45%] items-center">
          <Text className="font-display text-xl text-lime">{value}</Text>
          <Text className="text-stone text-[11px] text-center">{label}</Text>
        </View>
      ))}
    </View>
  );
}
