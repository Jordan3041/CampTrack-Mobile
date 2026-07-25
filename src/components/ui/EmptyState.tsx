import React from "react";
import { Text, View } from "react-native";

import { Icon, IconName } from "@/components/ui/Icon";

export function EmptyState({ icon = "dashboard", children }: { icon?: IconName; children: React.ReactNode }) {
  return (
    <View className="items-center py-9 px-4">
      <View className="mb-2 opacity-60">
        <Icon name={icon} size={30} color="#9BA69C" />
      </View>
      <Text className="text-stone text-center">{children}</Text>
    </View>
  );
}
