import React from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

export function TextField({
  label,
  hint,
  error,
  style,
  ...rest
}: { label?: string; hint?: string; error?: string } & TextInputProps) {
  // Reserve full height up front for multiline inputs. Without this, the
  // input starts sized for one line and grows the moment text wraps to a
  // second line — that mid-typing height change causes RN's New Architecture
  // to reset the cursor to the start (numberOfLines alone only affects Android).
  const multilineStyle = rest.multiline
    ? { minHeight: (rest.numberOfLines ?? 3) * 22 + 12, textAlignVertical: "top" as const }
    : undefined;
  return (
    <View className="mb-1">
      {label ? <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#6d766e"
        className="rounded-sm border border-line bg-white/[0.04] px-3 py-2.5 text-[15px] text-ink font-body"
        style={[multilineStyle, style]}
        {...rest}
      />
      {hint ? <Text className="text-stone text-xs mt-1">{hint}</Text> : null}
      {error ? <Text className="text-danger text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
