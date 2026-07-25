import React from "react";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/Icon";

export function StarsDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={i <= rating ? "star" : "starOutline"} size={size} color={i <= rating ? "#5BD46B" : "rgba(255,255,255,0.25)"} />
      ))}
    </View>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center gap-1.5 mt-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={6}>
          <Icon name={i <= value ? "star" : "starOutline"} size={26} color={i <= value ? "#5BD46B" : "rgba(255,255,255,0.3)"} />
        </Pressable>
      ))}
      {value ? (
        <Pressable onPress={() => onChange(0)} className="ml-2">
          <Icon name="close" size={16} color="#9BA69C" />
        </Pressable>
      ) : null}
    </View>
  );
}
