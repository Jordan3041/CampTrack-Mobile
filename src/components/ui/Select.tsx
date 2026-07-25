import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";

// A fully custom themed picker instead of @react-native-picker/picker's
// native <Picker>. On iOS that component renders as a spinning wheel with
// unreadable black system text (Picker.Item's `color` prop is Android-only)
// and its multi-row intrinsic height doesn't reserve space cleanly in a
// form layout, causing it to overlap neighboring fields. This bottom-sheet
// style picker gives us full control over colors and layout instead.
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="mb-1">
      {label ? <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-sm border border-line bg-white/[0.04] px-3 py-2.5">
        <Text className={selected ? "text-ink" : "text-[#6d766e]"} numberOfLines={1}>
          {selected ? selected.label : "Select…"}
        </Text>
        <Icon name="chevronRight" size={16} color="#9BA69C" style={{ transform: [{ rotate: "90deg" }] }} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface-2 border-t border-glass-border rounded-t-md max-h-[70%]">
            {label ? (
              <Text className="font-display text-base text-ink px-5 pt-4 pb-2">{label}</Text>
            ) : (
              <View className="pt-3" />
            )}
            <ScrollView className="px-2 pb-2">
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-3.5 py-3 rounded-sm ${o.value === value ? "bg-lime-dim" : ""}`}>
                  <Text className={`text-[15px] ${o.value === value ? "text-lime-bright font-body-semibold" : "text-ink"}`}>{o.label}</Text>
                  {o.value === value ? <Icon name="check" size={16} color="#7BE88A" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
