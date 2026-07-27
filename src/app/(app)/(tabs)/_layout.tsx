import { Tabs } from "expo-router";
import React from "react";

import { HeaderLogo } from "@/components/HeaderLogo";
import { Icon, IconName } from "@/components/ui/Icon";

// Mirrors the desktop sidebar nav in CampTrack (renderSidebar in js/ui.js),
// remapped to a bottom tab bar. Map/Calendar/Maintenance/Settings/Help/Admin
// live one level up as stack screens, reachable from the "More" tab — keeps
// the bar to 5 items instead of cramming in all 7+ destinations.
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Dashboard", icon: "dashboard" },
  { name: "campsites", title: "Campsites", icon: "campsites" },
  { name: "trips", title: "Trips", icon: "trips" },
  { name: "explore", title: "Explore", icon: "explore" },
  { name: "more", title: "More", icon: "more" },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#171C18" },
        headerTintColor: "#F2F5F1",
        headerShadowVisible: false,
        headerLeft: (props) => <HeaderLogo canGoBack={props.canGoBack} />,
        tabBarStyle: { backgroundColor: "#12160F", borderTopColor: "rgba(255,255,255,0.10)" },
        tabBarActiveTintColor: "#7BE88A",
        tabBarInactiveTintColor: "#9BA69C",
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} size={22} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
