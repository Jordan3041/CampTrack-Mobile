import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { useToast } from "@/lib/toast";

type Row = { id: string; text: string };

// Mirrors the editTemplateBtn handler in CampTrack/js/trips.js.
export function PackingTemplateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState<Row[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      api
        .getPackingTemplate()
        .then((texts) => setItems(texts.map((text) => ({ id: api.uid(), text }))))
        .catch((e) => toast(e.message));
    }
  }, [visible]);

  function updateText(id: string, text: string) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, text } : r)));
  }
  function remove(id: string) {
    setItems((rows) => rows.filter((r) => r.id !== id));
  }
  function add() {
    const val = newItem.trim();
    if (!val) return;
    setItems((rows) => [...rows, { id: api.uid(), text: val }]);
    setNewItem("");
  }

  async function save() {
    setSaving(true);
    try {
      await api.savePackingTemplate(items.map((it) => it.text.trim()).filter(Boolean));
      onClose();
      toast("Template saved — applies to new trips");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title="Default packing template" onClose={onClose}>
      <Text className="text-stone text-sm mb-2">Every new trip starts with this list. Edit, remove, or add items below.</Text>

      {items.length === 0 ? (
        <EmptyState>No items yet — add one below.</EmptyState>
      ) : (
        items.map((it, i) => (
          <View key={it.id} className="flex-row items-center gap-2 py-1.5 border-b border-dashed border-line">
            <Text className="text-stone text-xs w-5">{i + 1}.</Text>
            <TextInput
              value={it.text}
              onChangeText={(t) => updateText(it.id, t)}
              className="flex-1 text-ink border border-line rounded-sm px-2 py-1.5 bg-white/[0.04]"
              placeholderTextColor="#6d766e"
            />
            <Pressable onPress={() => remove(it.id)} hitSlop={6}>
              <Icon name="close" size={16} color="#E0673C" />
            </Pressable>
          </View>
        ))
      )}

      <TextField label="Add an item" placeholder="e.g. Bike rack straps" value={newItem} onChangeText={setNewItem} onSubmitEditing={add} />
      <View className="mt-1">
        <Button title="Add" variant="ghost" size="sm" onPress={add} />
      </View>

      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title="Save template" onPress={save} loading={saving} />
      </View>
    </FormModal>
  );
}
