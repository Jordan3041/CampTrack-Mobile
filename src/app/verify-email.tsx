import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Mirrors CampTrack/verify-email.html + js/verify-email.js — reached from
// the link in the verification email (a deep link into the app). Submits
// the token automatically and shows a success or error state.
export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { session, markVerified } = useAuth();
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setErrorMsg("This verification link is missing its token.");
        setStatus("error");
        return;
      }
      try {
        await api.verifyEmail(token);
        if (session) await markVerified();
        setStatus("success");
      } catch (e: any) {
        setErrorMsg(e.message);
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-6">
          <BrandMark size={56} variant="light" />
          <Text className="font-display text-2xl text-ink mt-3">
            Camp<Text className="text-lime">Track</Text>
          </Text>
        </View>

        <View className="bg-surface border border-glass-border rounded-md p-5 items-center">
          {status === "checking" && <Text className="text-stone">Verifying your email…</Text>}
          {status === "success" && (
            <>
              <Icon name="check" size={32} color="#5BD46B" />
              <Text className="font-display text-lg text-ink mt-3 mb-1">Email verified!</Text>
              <Text className="text-stone text-sm text-center mb-4">You're all set — head back into CampTrack.</Text>
              <Button title="Continue" onPress={() => router.replace(session ? "/(app)/(tabs)" : "/(auth)/login")} />
            </>
          )}
          {status === "error" && (
            <>
              <Text className="text-danger text-sm text-center">{errorMsg}</Text>
              <View className="mt-4">
                <Button title="Back to sign in" variant="ghost" onPress={() => router.replace("/(auth)/login")} />
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
