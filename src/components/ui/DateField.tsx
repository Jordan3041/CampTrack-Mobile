import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { todayISO } from "@/lib/dates";

function toISO(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value + "T12:00") : new Date(todayISO() + "T12:00");

  return (
    <View className="mb-1">
      <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-sm border border-line bg-white/[0.04] px-3 py-2.5">
        <Text className={value ? "text-ink" : "text-[#6d766e]"}>{value || "Select a date"}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          themeVariant="dark"
          onChange={(_, selected) => {
            setOpen(Platform.OS === "ios");
            if (selected) onChange(toISO(selected));
          }}
        />
      )}
      {open && Platform.OS === "ios" && (
        <Pressable onPress={() => setOpen(false)} className="self-end mt-1">
          <Text className="text-lime text-sm">Done</Text>
        </Pressable>
      )}
    </View>
  );
}
