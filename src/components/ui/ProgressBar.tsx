import React from "react";
import { View } from "react-native";

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <View className="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
      <View className="h-full rounded-full bg-lime" style={{ width: `${pct * 100}%` }} />
    </View>
  );
}
