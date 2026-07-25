import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { Icon, IconName } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/lib/auth";

function MenuRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3.5 py-4 border-b border-line active:bg-white/5 -mx-4 px-4">
      <Icon name={icon} size={20} color={danger ? "#E0673C" : "#9BA69C"} />
      <Text className={`flex-1 font-body-semibold text-[15px] ${danger ? "text-danger" : "text-ink"}`}>{label}</Text>
      {!danger && <Icon name="chevronRight" size={16} color="#6E8CA8" />}
    </Pressable>
  );
}

// The mobile equivalent of CampTrack's desktop sidebar footer + the
// remaining tabs that don't fit comfortably in a 5-item bottom bar.
export default function MoreScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  }

  return (
    <Screen scroll={false}>
      <View className="mt-1">
        <MenuRow icon="map" label="Map" onPress={() => router.push("/(app)/map")} />
        <MenuRow icon="activities" label="Activities" onPress={() => router.push("/(app)/activities")} />
        <MenuRow icon="calendar" label="Calendar" onPress={() => router.push("/(app)/calendar")} />
        <MenuRow icon="maintenance" label="RV Maintenance" onPress={() => router.push("/(app)/maintenance")} />
        {session?.isAdmin ? <MenuRow icon="admin" label="Admin" onPress={() => router.push("/(app)/admin")} /> : null}
        <MenuRow icon="settings" label="Profile" onPress={() => router.push("/(app)/profile")} />
        <MenuRow icon="help" label="Help" onPress={() => router.push("/(app)/help")} />
        <View className="mt-6">
          <MenuRow icon="signOut" label="Sign out" onPress={confirmSignOut} danger />
        </View>
      </View>
    </Screen>
  );
}
