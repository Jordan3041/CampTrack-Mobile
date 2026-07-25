import "@/global.css";

import { Bitter_600SemiBold, Bitter_700Bold, useFonts as useBitter } from "@expo-google-fonts/bitter";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, useFonts as useMono } from "@expo-google-fonts/ibm-plex-mono";
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
  useFonts as usePublicSans,
} from "@expo-google-fonts/public-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [bitterLoaded] = useBitter({ Bitter_600SemiBold, Bitter_700Bold });
  const [monoLoaded] = useMono({ IBMPlexMono_400Regular, IBMPlexMono_500Medium });
  const [publicSansLoaded] = usePublicSans({
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });
  const fontsLoaded = bitterLoaded && monoLoaded && publicSansLoaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootNavigator fontsLoaded={fontsLoaded} />
        </ToastProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, isLoading } = useAuth();
  const ready = fontsLoaded && !isLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0E120F" } }}>
      <Stack.Protected guard={!!session && session.isVerified}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !session.isVerified}>
        <Stack.Screen name="verify-pending" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Unguarded and reachable regardless of session state — kept last so
          it never wins as the router's default initial route (that honor
          goes to whichever of the session-gated screens above matches). */}
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
