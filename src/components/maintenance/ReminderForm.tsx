import React, { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { todayISO } from "@/lib/dates";
import { useToast } from "@/lib/toast";

const REPEAT_OPTIONS = [
  { label: "Doesn't repeat", value: "0" },
  { label: "Every 3 months", value: "3" },
  { label: "Every 6 months", value: "6" },
  { label: "Every year", value: "12" },
];
const LEAD_OPTIONS = [
  { label: "On the due date", value: "0" },
  { label: "3 days before", value: "3" },
  { label: "7 days before", value: "7" },
  { label: "14 days before", value: "14" },
  { label: "30 days before", value: "30" },
];

// Mirrors openReminderForm() in CampTrack/js/maintenance.js.
export function ReminderForm({
  visible,
  reminder,
  onClose,
  onSaved,
}: {
  visible: boolean;
  reminder: api.MaintenanceReminder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(reminder?.title || "");
  const [dueDate, setDueDate] = useState(reminder?.dueDate || todayISO());
  const [repeatMonths, setRepeatMonths] = useState(String(reminder?.repeatMonths ?? 0));
  const [leadDays, setLeadDays] = useState(String(reminder?.leadDays ?? 0));
  const [notes, setNotes] = useState(reminder?.notes || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return toast("Give the reminder a title");
    if (!dueDate) return toast("Pick a due date");
    setSaving(true);
    try {
      await api.saveMaintenanceReminder({
        id: reminder?.id,
        title: title.trim(),
        dueDate,
        repeatMonths: Number(repeatMonths) as api.MaintenanceReminder["repeatMonths"],
        leadDays: Number(leadDays) as api.MaintenanceReminder["leadDays"],
        notes: notes.trim(),
      });
      onSaved();
      toast(reminder ? "Reminder updated" : "Reminder added");
    } catch (e: any) {
      toast(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title={reminder ? "Edit reminder" : "New reminder"} onClose={onClose}>
      <TextField label="What needs attention" placeholder="e.g. Oil change, bearing repack" value={title} onChangeText={setTitle} />
      <DateField label="Due date" value={dueDate} onChange={setDueDate} />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Select label="Repeat" value={repeatMonths} onChange={setRepeatMonths} options={REPEAT_OPTIONS} />
        </View>
        <View className="flex-1">
          <Select label="Email me" value={leadDays} onChange={setLeadDays} options={LEAD_OPTIONS} />
        </View>
      </View>
      <TextField
        label="Notes (optional)"
        placeholder="Anything worth including in the reminder email…"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />
      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title={reminder ? "Save changes" : "Add reminder"} onPress={save} loading={saving} />
      </View>
    </FormModal>
  );
}
