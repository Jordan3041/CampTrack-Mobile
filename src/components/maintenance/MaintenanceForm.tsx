import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { fileKindIcon, pickAttachments, PendingAttachment } from "@/lib/attachments";
import { todayISO } from "@/lib/dates";
import { useToast } from "@/lib/toast";

// Mirrors openMaintForm() in CampTrack/js/maintenance.js.
export function MaintenanceForm({
  visible,
  record,
  onClose,
  onSaved,
}: {
  visible: boolean;
  record: api.MaintenanceRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(record?.title || "");
  const [type, setType] = useState<"routine" | "repair">(record?.type || "repair");
  const [date, setDate] = useState(record?.date || todayISO());
  const [cost, setCost] = useState(record?.cost != null ? String(record.cost) : "");
  const [mileage, setMileage] = useState(record?.mileage || "");
  const [nextDue, setNextDue] = useState(record?.nextDue || "");
  const [notes, setNotes] = useState(record?.notes || "");
  const [attachments, setAttachments] = useState<PendingAttachment[]>(record?.attachments || []);
  const [saving, setSaving] = useState(false);

  async function addAttachments() {
    const picked = await pickAttachments();
    if (picked.length) setAttachments((a) => [...a, ...picked]);
  }

  async function save() {
    if (!title.trim()) return toast("Describe what was done");
    if (!date) return toast("Pick a date");
    setSaving(true);
    try {
      await api.saveMaintenance({
        id: record?.id,
        title: title.trim(),
        type,
        date,
        cost: cost === "" ? "" : Number(cost),
        mileage: mileage.trim(),
        nextDue,
        notes: notes.trim(),
        attachments: attachments as any,
      });
      onSaved();
      toast(record ? "Record updated" : "Record added");
    } catch (e: any) {
      toast(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title={record ? "Edit record" : "Log maintenance"} onClose={onClose}>
      <TextField label="What was done" placeholder="e.g. Roof reseal, wheel bearing repack" value={title} onChangeText={setTitle} />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Select
            label="Type"
            value={type}
            onChange={(v) => setType(v as "routine" | "repair")}
            options={[
              { label: "Routine / yearly", value: "routine" },
              { label: "Repair", value: "repair" },
            ]}
          />
        </View>
        <View className="flex-1">
          <DateField label="Date completed" value={date} onChange={setDate} />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField label="Cost ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
        </View>
        <View className="flex-1">
          <TextField label="Mileage (optional)" placeholder="e.g. 42,300" value={mileage} onChangeText={setMileage} />
        </View>
      </View>
      <DateField label="Next due (optional)" value={nextDue} onChange={setNextDue} />
      <Text className="text-stone text-xs mt-1">
        Set this for yearly items like bearing repacks or roof inspections; it'll show under "Coming due."
      </Text>
      <TextField label="Notes" placeholder="Shop name, parts used, warranty info…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">Attachments (receipts, work orders)</Text>
      <Button title="Add attachment" variant="ghost" size="sm" onPress={addAttachments} />
      <View className="mt-2 gap-1.5">
        {attachments.length === 0 ? (
          <Text className="text-stone text-sm">No attachments yet.</Text>
        ) : (
          attachments.map((a, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Icon name={fileKindIcon(a.name)} size={16} color="#9BA69C" />
              <Pressable className="flex-1" onPress={() => a.url && WebBrowser.openBrowserAsync(a.url)}>
                <Text className="text-ink text-sm" numberOfLines={1}>
                  {a.name}
                </Text>
              </Pressable>
              <Pressable onPress={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))} hitSlop={6}>
                <Icon name="close" size={16} color="#E0673C" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title={record ? "Save changes" : "Add record"} onPress={save} loading={saving} />
      </View>
    </FormModal>
  );
}
