import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/BrandMark";
import { PasswordChecklist } from "@/components/PasswordChecklist";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/auth";
import { CT_CONFIG } from "@/lib/config";
import { isPasswordValid } from "@/lib/password-policy";

type Mode = "login" | "register";

// Mirrors CampTrack/index.html + js/auth.js — tabbed login/register card.
export default function LoginScreen() {
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function doGoogleSignIn() {
    setError("");
    setGoogleSubmitting(true);
    try {
      GoogleSignin.configure({ webClientId: CT_CONFIG.GOOGLE_CLIENT_ID });
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (result.type !== "success" || !result.data.idToken) {
        throw new Error("Google didn't return a sign-in token. Please try again.");
      }
      await loginWithGoogle(result.data.idToken);
    } catch (e: any) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
        // User backed out of the Google sheet — not an error worth surfacing.
      } else {
        setError(e.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function doSubmit() {
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        if (!isPasswordValid(password)) throw new Error("Password doesn't meet all the requirements listed below.");
        if (password !== passwordConfirm) throw new Error("Passwords do not match.");
        if (!firstName.trim() || !lastName.trim()) throw new Error("First and last name are required.");
        if (!email.trim())
          throw new Error("Email is required — it's how you'll recover your account if you forget your password.");
        await register(username, password, email.trim(), firstName.trim(), lastName.trim());
      } else {
        await login(username, password);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-6">
            <BrandMark size={56} variant="light" />
            <Text className="font-display text-2xl text-ink mt-3">
              Camp<Text className="text-lime">Track</Text>
            </Text>
          </View>

          <View className="bg-surface border border-glass-border rounded-md p-5">
            <View className="flex-row rounded-sm bg-white/5 p-1 mb-2">
              <Pressable
                className={`flex-1 items-center py-2 rounded-sm ${mode === "login" ? "bg-lime-dim" : ""}`}
                onPress={() => setMode("login")}>
                <Text className={`font-body-semibold text-sm ${mode === "login" ? "text-lime-bright" : "text-stone"}`}>Sign in</Text>
              </Pressable>
              <Pressable
                className={`flex-1 items-center py-2 rounded-sm ${mode === "register" ? "bg-lime-dim" : ""}`}
                onPress={() => setMode("register")}>
                <Text className={`font-body-semibold text-sm ${mode === "register" ? "text-lime-bright" : "text-stone"}`}>
                  Create account
                </Text>
              </Pressable>
            </View>

            {mode === "register" && (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                </View>
                <View className="flex-1">
                  <TextField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                </View>
              </View>
            )}

            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {mode === "register" && (
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                hint="How you'll recover your account if you forget your password."
              />
            )}

            <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {mode === "register" && <PasswordChecklist password={password} />}

            {mode === "register" && (
              <TextField label="Confirm password" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
            )}

            {mode === "login" && (
              <Pressable className="mt-2" onPress={() => router.push("/(auth)/forgot-password")}>
                <Text className="text-lime text-sm">Forgot password?</Text>
              </Pressable>
            )}

            {error ? <Text className="text-danger text-sm mt-3">{error}</Text> : null}

            <View className="mt-4">
              <Button
                title={mode === "register" ? "Create account" : "Sign in"}
                onPress={doSubmit}
                loading={submitting}
              />
            </View>

            <View className="flex-row items-center gap-3 my-4">
              <View className="flex-1 h-px bg-line" />
              <Text className="text-stone text-xs">or</Text>
              <View className="flex-1 h-px bg-line" />
            </View>

            <Button title="Continue with Google" variant="ghost" loading={googleSubmitting} onPress={doGoogleSignIn} />
            <View className="h-2.5" />
            <Button
              title="Continue with Apple *Coming Soon*"
              variant="ghost"
              onPress={() => setError("Apple sign-in isn't set up yet in this build.")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
