import React from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SwitchRow } from "@/components/ui/SwitchRow";

export type ExploreFilters = {
  state: string;
  type: string;
  minRating: number;
  power: boolean;
  water: boolean;
  sewer: boolean;
  amp: string;
};

export const DEFAULT_FILTERS: ExploreFilters = { state: "", type: "", minRating: 0, power: false, water: false, sewer: false, amp: "" };

// Mirrors the filter controls in CampTrack/explore.html.
export function FilterSheet({
  visible,
  filters,
  states,
  onChange,
  onClose,
}: {
  visible: boolean;
  filters: ExploreFilters;
  states: string[];
  onChange: (f: ExploreFilters) => void;
  onClose: () => void;
}) {
  function set<K extends keyof ExploreFilters>(key: K, value: ExploreFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <FormModal visible={visible} title="Filter public campsites" onClose={onClose}>
      <Select label="State" value={filters.state} onChange={(v) => set("state", v)} options={[{ label: "All states", value: "" }, ...states.map((s) => ({ label: s, value: s }))]} />
      <Select
        label="Site type"
        value={filters.type}
        onChange={(v) => set("type", v)}
        options={[
          { label: "Any type", value: "" },
          { label: "RV", value: "rv" },
          { label: "Tent", value: "tent" },
        ]}
      />
      <Select
        label="Minimum rating"
        value={String(filters.minRating)}
        onChange={(v) => set("minRating", Number(v))}
        options={[0, 1, 2, 3, 4, 5].map((n) => ({ label: n === 0 ? "Any rating" : `${n}+ stars`, value: String(n) }))}
      />
      <Select
        label="Power amp"
        value={filters.amp}
        onChange={(v) => set("amp", v)}
        options={[
          { label: "Any", value: "" },
          { label: "30 amp", value: "30" },
          { label: "50 amp", value: "50" },
        ]}
      />
      <SwitchRow label="Power hookup" value={filters.power} onChange={(v) => set("power", v)} />
      <SwitchRow label="Water hookup" value={filters.water} onChange={(v) => set("water", v)} />
      <SwitchRow label="Sewer hookup" value={filters.sewer} onChange={(v) => set("sewer", v)} />

      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Reset" variant="ghost" onPress={() => onChange(DEFAULT_FILTERS)} />
        <Button title="Done" onPress={onClose} />
      </View>
    </FormModal>
  );
}
