import React from "react";
import { Text, View } from "react-native";

import { Icon, IconName } from "@/components/ui/Icon";

type Kind = "upcoming" | "active" | "past" | "routine" | "repair" | "public" | "hookup";

const STYLES: Record<Kind, { bg: string; text: string; iconColor: string }> = {
  upcoming: { bg: "bg-lime-dim", text: "text-lime-bright", iconColor: "#7BE88A" },
  active: { bg: "bg-lime", text: "text-[#0B0F0B]", iconColor: "#0B0F0B" },
  past: { bg: "bg-white/10", text: "text-stone", iconColor: "#9BA69C" },
  routine: { bg: "bg-slate/20", text: "text-[#a9c2da]", iconColor: "#a9c2da" },
  repair: { bg: "bg-ember/20", text: "text-[#f0a184]", iconColor: "#f0a184" },
  public: { bg: "bg-lime-dim", text: "text-lime-bright", iconColor: "#7BE88A" },
  hookup: { bg: "bg-slate/20", text: "text-[#a9c2da]", iconColor: "#a9c2da" },
};

export function Badge({ kind, icon, children }: { kind: Kind; icon?: IconName; children: React.ReactNode }) {
  const s = STYLES[kind];
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${s.bg}`}>
      {icon ? <Icon name={icon} size={11} color={s.iconColor} /> : null}
      <Text className={`text-[11px] font-body-bold uppercase tracking-wide ${s.text}`}>{children}</Text>
    </View>
  );
}
