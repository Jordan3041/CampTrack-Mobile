import React from "react";
import { Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { PASSWORD_RULES } from "@/lib/password-policy";

export function PasswordChecklist({ password }: { password: string }) {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1.5 mt-1.5">
      {PASSWORD_RULES.map((r) => {
        const pass = r.test(password || "");
        return (
          <View key={r.key} className="flex-row items-center gap-1">
            {pass ? (
              <Icon name="check" size={12} color="#5BD46B" />
            ) : (
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: "#6E8CA8" }} />
            )}
            <Text className={`text-[11px] ${pass ? "text-lime-bright" : "text-stone"}`}>{r.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
