import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";
import { ReminderForm } from "@/components/maintenance/ReminderForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import * as api from "@/lib/api";
import { fmtDate, todayISO } from "@/lib/dates";
import { useToast } from "@/lib/toast";

const REPEAT_LABELS: Record<number, string> = { 3: "Every 3 months", 6: "Every 6 months", 12: "Every year" };

// Mirrors CampTrack/js/maintenance.js.
export default function MaintenanceScreen() {
  const toast = useToast();
  const [records, setRecords] = useState<api.MaintenanceRecord[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [formRecord, setFormRecord] = useState<api.MaintenanceRecord | null | undefined>(undefined);
  const [reminders, setReminders] = useState<api.MaintenanceReminder[] | null>(null);
  const [remindersError, setRemindersError] = useState("");
  const [formReminder, setFormReminder] = useState<api.MaintenanceReminder | null | undefined>(undefined);

  const load = useCallback(() => {
    api.getMaintenance().then(setRecords).catch((e) => setError(e.message));
  }, []);
  const loadReminders = useCallback(() => {
    api.getMaintenanceReminders().then(setReminders).catch((e) => setRemindersError(e.message));
  }, []);

  useEffect(load, [load]);
  useEffect(loadReminders, [loadReminders]);

  async function handleDeleteReminder(id: string) {
    Alert.alert("Delete reminder", "Delete this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMaintenanceReminder(id);
            loadReminders();
            toast("Reminder deleted");
          } catch (e: any) {
            toast(e.message);
          }
        },
      },
    ]);
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete record", "Delete this maintenance record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMaintenance(id);
            load();
            toast("Record deleted");
          } catch (e: any) {
            toast(e.message);
          }
        },
      },
    ]);
  }

  const filtered = filter === "all" ? records || [] : (records || []).filter((r) => r.type === filter);

  const soon = new Date();
  soon.setDate(soon.getDate() + 60);
  const soonISO = soon.toISOString().slice(0, 10);
  const t = todayISO();
  const due = (records || [])
    .filter((r) => r.nextDue && r.nextDue <= soonISO)
    .sort((a, b) => (a.nextDue || "").localeCompare(b.nextDue || ""));

  return (
    <Screen>
      <View className="flex-row items-center justify-end mb-3 mt-1">
        <Button title="+ Log" size="sm" onPress={() => setFormRecord(null)} />
      </View>

      {error ? (
        <Text className="text-danger">{error}</Text>
      ) : records === null ? (
        <ActivityIndicator color="#5BD46B" className="mt-4" />
      ) : (
        <>
          <Card>
            <Text className="font-display text-lg text-ink mb-1">Coming due</Text>
            {due.length === 0 ? (
              <Text className="text-stone text-sm">Nothing coming due in the next 60 days.</Text>
            ) : (
              due.map((r) => (
                <View key={r.id} className="py-2 border-b border-line">
                  <Text className="text-ink font-body-bold">{r.title}</Text>
                  <Text className={`text-xs ${r.nextDue! < t ? "text-danger font-body-bold" : "text-stone"}`}>
                    {r.nextDue! < t ? "Overdue — was due " : "Due "}
                    {fmtDate(r.nextDue)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          <Card>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-display text-lg text-ink">Reminders</Text>
              <Button title="+ Reminder" variant="ghost" size="sm" onPress={() => setFormReminder(null)} />
            </View>
            {remindersError ? (
              <Text className="text-danger text-sm">{remindersError}</Text>
            ) : reminders === null ? (
              <ActivityIndicator color="#5BD46B" />
            ) : reminders.length === 0 ? (
              <EmptyState icon="bell">No reminders set up yet.</EmptyState>
            ) : (
              reminders.map((r) => (
                <View key={r.id} className="py-2.5 border-b border-line">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-ink font-body-bold">{r.title}</Text>
                    {r.repeatMonths ? <Badge kind="routine">{REPEAT_LABELS[r.repeatMonths]}</Badge> : null}
                  </View>
                  <Text className={`text-xs mt-0.5 ${r.dueDate < t ? "text-danger font-body-bold" : "text-stone"}`}>
                    {r.dueDate < t ? "Overdue — was due " : "Due "}
                    {fmtDate(r.dueDate)}
                  </Text>
                  {r.notes ? <Text className="text-stone text-xs mt-0.5">{r.notes}</Text> : null}
                  <View className="flex-row gap-2 mt-2">
                    <Button title="Edit" variant="ghost" size="sm" onPress={() => setFormReminder(r)} />
                    <Button title="Delete" variant="danger" size="sm" onPress={() => handleDeleteReminder(r.id!)} />
                  </View>
                </View>
              ))
            )}
          </Card>

          <Card>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-display text-lg text-ink">History</Text>
              <View className="w-36">
                <Select
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { label: "All", value: "all" },
                    { label: "Routine", value: "routine" },
                    { label: "Repair", value: "repair" },
                  ]}
                />
              </View>
            </View>
            {filtered.length === 0 ? (
              <EmptyState icon="maintenance">No maintenance records yet. Log your first one.</EmptyState>
            ) : (
              filtered.map((r) => (
                <View key={r.id} className="py-3 border-b border-line">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="text-stone text-xs mb-0.5">{fmtDate(r.date)}</Text>
                      <Text className="text-ink font-body-bold">{r.title}</Text>
                      {r.mileage ? <Text className="text-stone text-xs">Mileage: {r.mileage}</Text> : null}
                      {r.notes ? <Text className="text-stone text-xs">{r.notes}</Text> : null}
                      {r.nextDue ? <Text className="text-amber-deep text-xs">Next due: {fmtDate(r.nextDue)}</Text> : null}
                    </View>
                    <View className="items-end gap-1.5">
                      <Badge kind={r.type}>{r.type === "routine" ? "Routine" : "Repair"}</Badge>
                      <Text className="text-ink text-sm">{r.cost !== "" && r.cost != null ? `$${Number(r.cost).toFixed(2)}` : "—"}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <Button title="Edit" variant="ghost" size="sm" onPress={() => setFormRecord(r)} />
                    <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(r.id!)} />
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}

      <MaintenanceForm
        visible={formRecord !== undefined}
        record={formRecord || null}
        onClose={() => setFormRecord(undefined)}
        onSaved={() => {
          setFormRecord(undefined);
          load();
        }}
      />
      <ReminderForm
        visible={formReminder !== undefined}
        reminder={formReminder || null}
        onClose={() => setFormReminder(undefined)}
        onSaved={() => {
          setFormReminder(undefined);
          loadReminders();
        }}
      />
    </Screen>
  );
}
