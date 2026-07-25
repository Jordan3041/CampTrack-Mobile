import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";

// Mirrors CampTrack/forgot-password.html + js/forgot-password.js.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.forgotPassword(email.trim());
      setSuccess(data.message || "If an account exists for that email, we've sent instructions.");
      setEmail("");
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
          <Text className="font-display text-lg text-ink mb-1">Reset your password</Text>
          <Text className="text-stone text-sm mb-2">Enter the email on your account and we'll send reset instructions.</Text>

          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          {error ? <Text className="text-danger text-sm mt-2">{error}</Text> : null}
          {success ? <Text className="text-lime-bright text-sm mt-2">{success}</Text> : null}

          <View className="mt-4">
            <Button title="Send reset instructions" onPress={submit} loading={submitting} />
          </View>
          <View className="mt-3">
            <Button title="Back to sign in" variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
