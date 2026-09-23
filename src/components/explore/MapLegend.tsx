import React from "react";
import { Text, View } from "react-native";

type LegendEntry = { color: string; label: string };

export function MapLegend({ entries }: { entries: LegendEntry[] }) {
  if (!entries.length) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 12,
        // Nudged up from 12 — Apple Maps' required attribution/legal link
        // sits in the map's bottom-left corner and the legend at 12 sat
        // right on top of it.
        bottom: 40,
        backgroundColor: "rgba(23,28,24,0.92)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        paddingVertical: 8,
        paddingHorizontal: 10,
        gap: 5,
      }}>
      {entries.map((e) => (
        <View key={e.label} className="flex-row items-center gap-2">
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: e.color }} />
          <Text className="text-ink text-[11px]">{e.label}</Text>
        </View>
      ))}
    </View>
  );
}
