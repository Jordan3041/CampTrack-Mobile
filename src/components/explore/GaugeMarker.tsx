import React from "react";
import { View } from "react-native";

import { Icon } from "@/components/ui/Icon";

// Deliberately distinct from the round campsite pin and the federal-lands
// blue square — a teal squared-off badge so stream gauges read as their
// own category of marker at a glance. Also used as the "Stream Gauges"
// legend swatch color in explore.tsx.
export const GAUGE_COLOR = "#0EA5A0";

export function GaugeMarker() {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: GAUGE_COLOR,
        borderWidth: 2,
        borderColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      }}>
      <Icon name="water" size={16} color="#fff" />
    </View>
  );
}
