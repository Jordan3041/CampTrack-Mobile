import React from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

export function TextField({
  label,
  hint,
  error,
  ...rest
}: { label?: string; hint?: string; error?: string } & TextInputProps) {
  return (
    <View className="mb-1">
      {label ? <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#6d766e"
        className="rounded-sm border border-line bg-white/[0.04] px-3 py-2.5 text-[15px] text-ink font-body"
        {...rest}
      />
      {hint ? <Text className="text-stone text-xs mt-1">{hint}</Text> : null}
      {error ? <Text className="text-danger text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
