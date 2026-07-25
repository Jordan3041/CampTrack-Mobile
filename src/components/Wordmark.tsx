import React from "react";
import { Text, View } from "react-native";

import { BrandMark } from "./BrandMark";

export function Wordmark({ size = 20, textClassName = "text-white" }: { size?: number; textClassName?: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <BrandMark size={size} variant="dark" />
      <Text className={`font-display text-lg ${textClassName}`}>
        Camp<Text className="text-lime-bright">Track</Text>
      </Text>
    </View>
  );
}
