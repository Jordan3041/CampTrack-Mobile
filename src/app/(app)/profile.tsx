import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { EMPTY_RIG, RigForm } from "@/components/RigForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

// Mirrors CampTrack/profile.html + js/profile.js (formerly settings.js —
// renamed when the Profile section grew beyond just app settings).
export default function ProfileScreen() {
  const toast = useToast();
  const { session, refresh, logout } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F");
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km">("mi");
  const [weekStart, setWeekStart] = useState<"sunday" | "monday">("sunday");
  const [showPastInCalendar, setShowPastInCalendar] = useState(true);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
  const [rig, setRig] = useState<api.Rig>(EMPTY_RIG);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingRig, setSavingRig] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSettings();
        setTempUnit(s.tempUnit);
        setDistanceUnit(s.distanceUnit);
        setWeekStart(s.weekStart);
        setShowPastInCalendar(!!s.showPastInCalendar);
        setAiSuggestionsEnabled(s.aiSuggestionsEnabled !== false);
      } catch (e: any) {
        toast(e.message);
      }
      try {
        const me = await api.getMe();
        setFirstName(me.firstName || "");
        setLastName(me.lastName || "");
        setEmail(me.email || "");
      } catch (_) {}
      try {
        setRig(await api.getRig());
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
      await refresh();
      toast("Profile saved");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveRig() {
    setSavingRig(true);
    try {
      await api.saveRig(rig);
      toast("Rig saved");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSavingRig(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await api.saveSettings({ tempUnit, distanceUnit, weekStart, showPastInCalendar, aiSuggestionsEnabled });
      toast("Settings saved");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSavingSettings(false);
    }
  }

  if (!loaded) {
    return (
      <Screen>
        <ActivityIndicator color="#5BD46B" className="mt-4" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text className="font-display text-lg text-ink mb-1">Account</Text>
        <TextField label="Username" value={session?.username || ""} editable={false} />
        <Text className="text-stone text-xs -mt-1">Your sign-in name — can't be changed here.</Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          </View>
          <View className="flex-1">
            <TextField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          </View>
        </View>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Text className="text-stone text-xs mt-1">
          Lets you recover your account with "Forgot password?" if you're ever locked out. Never shown to other users.
        </Text>
        <View className="mt-3">
          <Button title="Save profile" onPress={saveProfile} loading={savingProfile} />
        </View>
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-1">Your rig</Text>
        <Text className="text-stone text-sm mb-1">What you camp in — shown to no one but you, and used to tailor tips around the app.</Text>
        <RigForm rig={rig} onChange={setRig} />
        <View className="mt-3">
          <Button title="Save rig" variant="ghost" onPress={saveRig} loading={savingRig} />
        </View>
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-1">Units</Text>
        <Select
          label="Temperature"
          value={tempUnit}
          onChange={(v) => setTempUnit(v as "F" | "C")}
          options={[
            { label: "Fahrenheit (°F)", value: "F" },
            { label: "Celsius (°C)", value: "C" },
          ]}
        />
        <Select
          label="Distance"
          value={distanceUnit}
          onChange={(v) => setDistanceUnit(v as "mi" | "km")}
          options={[
            { label: "Miles", value: "mi" },
            { label: "Kilometers", value: "km" },
          ]}
        />
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-1">AI features</Text>
        <SwitchRow label="Smart Suggestions & CampTrack Assistant" value={aiSuggestionsEnabled} onChange={setAiSuggestionsEnabled} />
        <Text className="text-stone text-xs mt-1">
          Uses Gemini to generate a few short, personalized tips for your next trip on the dashboard (packing, weather, hookups — and
          rig-aware, if set up above), and powers the CampTrack Assistant chat bubble. Turn this off and both disappear entirely.
        </Text>
      </Card>

      <Card>
        <Text className="font-display text-lg text-ink mb-1">Calendar</Text>
        <Select
          label="Week starts on"
          value={weekStart}
          onChange={(v) => setWeekStart(v as "sunday" | "monday")}
          options={[
            { label: "Sunday", value: "sunday" },
            { label: "Monday", value: "monday" },
          ]}
        />
        <View className="mt-2">
          <SwitchRow label="Show past trips on calendar" value={showPastInCalendar} onChange={setShowPastInCalendar} />
        </View>
        <View className="mt-3">
          <Button title="Save settings" onPress={saveSettings} loading={savingSettings} />
        </View>
      </Card>

      <Button title="Sign out" variant="danger" onPress={() => logout()} />
    </Screen>
  );
}
