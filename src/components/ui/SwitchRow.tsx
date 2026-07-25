import React from "react";
import { Switch, Text, View } from "react-native";

import { Icon, IconName } from "@/components/ui/Icon";

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
  icon,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: IconName;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <View className="flex-row items-center gap-2.5 flex-1">
        {icon ? <Icon name={icon} size={18} color="#9BA69C" /> : null}
        <View className="flex-1">
          <Text className="text-ink font-body-semibold text-[13px]">{label}</Text>
          {hint ? <Text className="text-stone text-xs mt-0.5">{hint}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "rgba(255,255,255,0.15)", true: "#5BD46B" }}
        thumbColor="#fff"
      />
    </View>
  );
}
