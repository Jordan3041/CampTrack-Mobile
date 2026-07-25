import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AssistantWidget } from "@/components/AssistantWidget";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={["top"]} className="bg-surface">
        <OfflineBanner />
      </SafeAreaView>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0E120F" },
          headerStyle: { backgroundColor: "#171C18" },
          headerTintColor: "#F2F5F1",
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ headerShown: true, title: "Profile" }} />
        <Stack.Screen name="help" options={{ headerShown: true, title: "Help" }} />
        <Stack.Screen name="admin" options={{ headerShown: true, title: "Admin" }} />
        <Stack.Screen name="map" options={{ headerShown: true, title: "Map" }} />
        <Stack.Screen name="calendar" options={{ headerShown: true, title: "Calendar" }} />
        <Stack.Screen name="maintenance" options={{ headerShown: true, title: "Maintenance" }} />
        <Stack.Screen name="activities" options={{ headerShown: true, title: "Activities" }} />
      </Stack>
      <AssistantWidget />
    </View>
  );
}
