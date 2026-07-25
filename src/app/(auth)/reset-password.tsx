import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";

// Mirrors CampTrack/reset-password.html + js/reset-password.js. Reached via
// a deep link from the reset email (camptrackmobile://reset-password?token=…)
// instead of a URL query string.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await api.resetPassword(token!, password);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View className="items-center mb-6">
          <BrandMark size={56} variant="light" />
          <Text className="font-display text-2xl text-ink mt-3">
            Camp<Text className="text-lime">Track</Text>
          </Text>
        </View>

        <View className="bg-surface border border-glass-border rounded-md p-5">
          {!token ? (
            <Text className="text-danger text-sm">
              This reset link is missing its token. Request a new one from the Forgot password screen.
            </Text>
          ) : done ? (
            <>
              <Text className="font-display text-lg text-ink mb-1">Password updated</Text>
              <Text className="text-stone text-sm mb-3">You can sign in with your new password now.</Text>
              <Button title="Back to sign in" onPress={() => router.replace("/(auth)/login")} />
            </>
          ) : (
            <>
              <Text className="font-display text-lg text-ink mb-2">Set a new password</Text>
              <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry />
              <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
              {error ? <Text className="text-danger text-sm mt-2">{error}</Text> : null}
              <View className="mt-4">
                <Button title="Set new password" onPress={submit} loading={submitting} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
