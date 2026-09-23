import React from "react";
import { Text, View } from "react-native";

// Traffic-light convention: red under a third full, amber in the middle
// range, emerald once comfortably full — lets you read a reservoir's
// condition at a glance without opening the detail sheet.
export function reservoirFillColor(percentFull: number | null): string {
  if (percentFull == null) return "#6E8CA8"; // no reading yet — neutral slate rather than a misleading color
  if (percentFull < 30) return "#EF4444";
  if (percentFull <= 60) return "#F59E0B";
  return "#10B981";
}

const BAR_HEIGHT = 26;
const BAR_WIDTH = 10;

// A squared badge with a mini vertical fill gauge (0-100%) inside it, plus
// a numeric percentage readout underneath — distinct at a glance from the
// round campsite pins and the other layers' square markers (different
// color family, and the only one with an internal fill level).
export function ReservoirMarker({ percentFull }: { percentFull: number | null }) {
  const color = reservoirFillColor(percentFull);
  const clamped = percentFull == null ? 0 : Math.max(0, Math.min(100, percentFull));
  const fillHeight = (clamped / 100) * BAR_HEIGHT;

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 30,
          height: 34,
          borderRadius: 8,
          backgroundColor: "rgba(23,28,24,0.92)",
          borderWidth: 2,
          borderColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}>
        <View
          style={{
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.15)",
            justifyContent: "flex-end",
            overflow: "hidden",
          }}>
          <View style={{ height: fillHeight, backgroundColor: color }} />
        </View>
      </View>
      <View
        style={{
          marginTop: 2,
          backgroundColor: "rgba(23,28,24,0.92)",
          borderRadius: 6,
          paddingHorizontal: 4,
          paddingVertical: 1,
        }}>
        <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{percentFull != null ? `${Math.round(percentFull)}%` : "—"}</Text>
      </View>
    </View>
  );
}
