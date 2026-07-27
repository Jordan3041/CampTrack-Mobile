import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { todayISO } from "@/lib/dates";

function toISO(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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
      {/* Rendered in a centered Modal (not an in-flow absolute overlay) so the
          full calendar always fits on screen regardless of where the field
          sits in a scrolling form — an absolute overlay anchored to the field
          could push the bottom of the calendar past the screen edge. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: 320,
              maxWidth: "90%",
              backgroundColor: "#171C18",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}>
            <DateTimePicker
              value={dateValue}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              themeVariant="dark"
              onChange={(_, selected) => {
                setOpen(false);
                if (selected) onChange(toISO(selected));
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
