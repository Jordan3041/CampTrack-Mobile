import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { useToast } from "@/lib/toast";

// Mirrors openPacking() in CampTrack/js/trips.js.
export function PackingModal({
  visible,
  trip,
  onClose,
  onChanged,
}: {
  visible: boolean;
  trip: api.Trip | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [packing, setPacking] = useState<api.PackingItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setPacking(trip?.packing || []);
  }, [trip]);

  async function persist(next: api.PackingItem[]) {
    setPacking(next);
    if (!trip) return;
    try {
      await api.saveTrip({ ...trip, packing: next });
    } catch (e: any) {
      toast(e.message);
    }
  }

  function toggle(id: string, packed: boolean) {
    persist(packing.map((p) => (p.id === id ? { ...p, packed } : p)));
  }
  function remove(id: string) {
    persist(packing.filter((p) => p.id !== id));
  }
  function add() {
    const val = newItem.trim();
    if (!val) return;
    persist([...packing, { id: api.uid(), text: val, packed: false }]);
    setNewItem("");
  }
  function uncheckAll() {
    persist(packing.map((p) => ({ ...p, packed: false })));
  }

  const packed = packing.filter((p) => p.packed).length;
  const pct = packing.length ? Math.round((packed / packing.length) * 100) : 0;

  return (
    <FormModal visible={visible} title={`Packing — ${trip?.title || ""}`} onClose={onClose}>
      <Text className="text-stone text-xs mb-1">
        {packed} of {packing.length} packed
      </Text>
      <View className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
        <View style={{ width: `${pct}%` }} className="h-full bg-lime rounded-full" />
      </View>

      {packing.length === 0 ? (
        <EmptyState>Packing list is empty — add items below.</EmptyState>
      ) : (
        packing.map((p) => (
          <View key={p.id} className="flex-row items-center gap-2.5 py-1.5 border-b border-dashed border-line">
            <Pressable onPress={() => toggle(p.id, !p.packed)} className="w-5 h-5 rounded border border-line items-center justify-center">
              {p.packed ? <Icon name="check" size={12} color="#5BD46B" /> : null}
            </Pressable>
            <Text className={`flex-1 ${p.packed ? "text-stone line-through" : "text-ink"}`}>{p.text}</Text>
            <Pressable onPress={() => remove(p.id)} hitSlop={6}>
              <Icon name="close" size={16} color="#E0673C" />
            </Pressable>
          </View>
        ))
      )}

      <TextField
        label="Add an item"
        placeholder="e.g. Dog food & leash"
        value={newItem}
        onChangeText={setNewItem}
        onSubmitEditing={add}
        returnKeyType="done"
      />
      <View className="mt-1">
        <Button title="Add" variant="ghost" size="sm" onPress={add} />
      </View>

      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Uncheck all" variant="ghost" onPress={uncheckAll} />
        <Button
          title="Done"
          onPress={() => {
            onChanged();
            onClose();
          }}
        />
      </View>
    </FormModal>
  );
}
