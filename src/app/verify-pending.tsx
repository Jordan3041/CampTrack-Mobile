import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Mirrors CampTrack/verify-pending.html + js/verify-pending.js — the
// "please verify your email" holding page. Reached whenever a signed-in
// session isn't verified yet (see src/app/_layout.tsx's Stack.Protected).
export default function VerifyPendingScreen() {
  const { logout, markVerified } = useAuth();
  const [email, setEmail] = useState("the email on your account");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [continuing, setContinuing] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((me) => {
        setEmail(me.email || "the email on your account");
        if (me.isVerified) markVerified();
      })
      .catch(() => {});
  }, []);

  async function handleContinue() {
    setContinuing(true);
    setError("");
    setMessage("");
    try {
      const me = await api.getMe();
      if (me.isVerified) {
        await markVerified();
      } else {
        setError("Still not verified — click the link in the email first, then try again.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setContinuing(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setMessage("");
    try {
      const result = await api.resendVerification();
      if (result.alreadyVerified) {
        await markVerified();
        return;
      }
      setMessage(`Verification email sent to ${result.sentTo}.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-6">
          <BrandMark size={56} variant="light" />
          <Text className="font-display text-2xl text-ink mt-3">
            Camp<Text className="text-lime">Track</Text>
          </Text>
        </View>

        <View className="bg-surface border border-glass-border rounded-md p-5">
          <Text className="font-display text-lg text-ink mb-2">Verify your email</Text>
          <Text className="text-stone text-sm">
            We sent a verification link to <Text className="text-ink">{email}</Text>. Click it, then come back here and continue.
          </Text>

          {message ? <Text className="text-lime-bright text-sm mt-3">{message}</Text> : null}
          {error ? <Text className="text-danger text-sm mt-3">{error}</Text> : null}

          <View className="mt-4 gap-2.5">
            <Button title="I've verified — continue" onPress={handleContinue} loading={continuing} />
            <Button title="Resend verification email" variant="ghost" onPress={handleResend} loading={resending} />
            <Button title="Sign out" variant="danger" onPress={logout} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
