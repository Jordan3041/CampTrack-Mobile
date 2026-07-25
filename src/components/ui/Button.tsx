import React from "react";
import { ActivityIndicator, Pressable, PressableProps, Text } from "react-native";

import { Icon, IconName } from "@/components/ui/Icon";

type Variant = "primary" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; iconColor: string; border?: string }> = {
  primary: { bg: "bg-lime active:bg-lime-bright", text: "text-[#0B0F0B] font-body-bold", iconColor: "#0B0F0B" },
  ghost: { bg: "bg-white/5 active:bg-white/10 border border-line", text: "text-ink font-body-semibold", iconColor: "#F2F5F1" },
  danger: { bg: "bg-transparent border border-danger active:bg-danger", text: "text-danger font-body-semibold", iconColor: "#E0673C" },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  ...rest
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
} & Omit<PressableProps, "onPress" | "children">) {
  const v = VARIANT_STYLES[variant];
  const padding = size === "sm" ? "px-3 py-1.5" : "px-4 py-2.5";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-1.5 rounded-sm ${padding} ${v.bg} ${(disabled || loading) ? "opacity-50" : ""}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#0B0F0B" : "#F2F5F1"} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} color={v.iconColor} /> : null}
          <Text className={`${v.text} ${size === "sm" ? "text-[13px]" : "text-[15px]"}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
