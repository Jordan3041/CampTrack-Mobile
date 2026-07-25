import React from "react";
import { Text, View } from "react-native";

import { Select } from "@/components/ui/Select";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { TextField } from "@/components/ui/TextField";
import type { Rig } from "@/lib/api";
import { RIG_FEATURES, RIG_RV_TYPES, RIG_VEHICLE_TYPES } from "@/lib/rig-constants";

// Mirrors rigFormHtml()/wireRigForm()/readRigForm() in CampTrack/js/rig.js —
// shown identically in the "Create your rig" onboarding modal and the
// Profile page, both as a controlled form here instead of two copies.
export function RigForm({ rig, onChange }: { rig: Rig; onChange: (rig: Rig) => void }) {
  function set<K extends keyof Rig>(key: K, value: Rig[K]) {
    onChange({ ...rig, [key]: value });
  }
  function toggleFeature(feature: string, on: boolean) {
    set("features", on ? [...rig.features, feature] : rig.features.filter((f) => f !== feature));
  }

  const showRvFields = RIG_RV_TYPES.has(rig.vehicleType);

  return (
    <View>
      <Select label="Vehicle type" value={rig.vehicleType} onChange={(v) => set("vehicleType", v)} options={RIG_VEHICLE_TYPES} />

      {showRvFields && (
        <View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField label="Make" placeholder="e.g. Keystone" value={rig.rvMake} onChangeText={(v) => set("rvMake", v)} />
            </View>
            <View className="flex-1">
              <TextField label="Model" placeholder="e.g. Montana" value={rig.rvModel} onChangeText={(v) => set("rvModel", v)} />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField label="Year" placeholder="2022" value={rig.rvYear} onChangeText={(v) => set("rvYear", v)} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <TextField
                label="Length (ft)"
                placeholder="32"
                value={rig.rvLength}
                onChangeText={(v) => set("rvLength", v)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Select
            label="Electrical service"
            value={rig.rvAmpService}
            onChange={(v) => set("rvAmpService", v as Rig["rvAmpService"])}
            options={[
              { label: "— not specified —", value: "" },
              { label: "30 amp", value: "30" },
              { label: "50 amp", value: "50" },
            ]}
          />
          <Text className="text-stone text-xs -mt-1 mb-2">
            What your rig's own shore-power cord is rated for — used to flag adapter needs when a campsite's hookup doesn't match.
          </Text>
        </View>
      )}

      <Text className="text-ink font-body-semibold text-[13px] mt-3 mb-1">Features (optional)</Text>
      {RIG_FEATURES.map((f) => (
        <SwitchRow key={f} label={f} value={rig.features.includes(f)} onChange={(on) => toggleFeature(f, on)} />
      ))}
    </View>
  );
}

export const EMPTY_RIG: Rig = { vehicleType: "", rvLength: "", rvMake: "", rvModel: "", rvYear: "", rvAmpService: "", features: [] };
