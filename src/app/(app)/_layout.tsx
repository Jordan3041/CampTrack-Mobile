import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

import { AssistantWidget } from "@/components/AssistantWidget";
import { HeaderLogo } from "@/components/HeaderLogo";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0E120F" },
          headerStyle: { backgroundColor: "#171C18" },
          headerTintColor: "#F2F5F1",
          headerShadowVisible: false,
          headerLeft: (props) => <HeaderLogo canGoBack={props.canGoBack} />,
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile" }} />
        <Stack.Screen name="help" options={{ headerShown: true, title: "Help" }} />
        <Stack.Screen name="admin" options={{ headerShown: true, title: "Admin" }} />
        <Stack.Screen name="map" options={{ headerShown: true, title: "Map" }} />
        <Stack.Screen name="calendar" options={{ headerShown: true, title: "Calendar" }} />
        <Stack.Screen name="maintenance" options={{ headerShown: true, title: "Maintenance" }} />
        <Stack.Screen name="activities" options={{ headerShown: true, title: "Activities" }} />
        <Stack.Screen name="user/[username]" options={{ headerShown: true, title: "Profile" }} />
      </Stack>
      <AssistantWidget />
    </View>
  );
}
