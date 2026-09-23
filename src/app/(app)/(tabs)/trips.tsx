import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { PackingModal } from "@/components/trips/PackingModal";
import { PackingTemplateModal } from "@/components/trips/PackingTemplateModal";
import { TripForm } from "@/components/trips/TripForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import * as api from "@/lib/api";
import { fmtDate, tripStatus } from "@/lib/dates";
import { useToast } from "@/lib/toast";

function TripRow({
  trip,
  onPack,
  onEdit,
  onDelete,
}: {
  trip: api.Trip;
  onPack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = tripStatus(trip);
  const packed = (trip.packing || []).filter((p) => p.packed).length;
  const total = (trip.packing || []).length;
  const pct = total ? Math.round((packed / total) * 100) : 0;

  return (
    <View className="py-3 border-b border-line">
      <View className="flex-row items-center gap-2 flex-wrap">
        <Text className="text-ink font-body-bold">{trip.title}</Text>
        <Badge kind={status === "active" ? "active" : status === "upcoming" ? "upcoming" : "past"}>
          {status === "active" ? "Happening now" : status === "upcoming" ? "Upcoming" : "Past"}
        </Badge>
      </View>
      <Text className="text-stone text-xs mt-1">
        {fmtDate(trip.start)}
        {trip.end && trip.end !== trip.start ? ` – ${fmtDate(trip.end)}` : ""}
        {trip.location ? ` · ${trip.location}` : ""}
      </Text>
      {status !== "past" && (
        <View className="mt-2 max-w-[280px]">
          <View className="h-2 bg-white/10 rounded-full overflow-hidden">
            <View style={{ width: `${pct}%` }} className="h-full bg-lime rounded-full" />
          </View>
          <Text className="text-stone text-xs mt-1">
            {packed}/{total} packed
          </Text>
        </View>
      )}
      <View className="flex-row flex-wrap gap-2 mt-2.5">
        <Button title="Packing list" size="sm" onPress={onPack} />
        <Button title="Edit" variant="ghost" size="sm" onPress={onEdit} />
        <Button title="Delete" variant="danger" size="sm" onPress={onDelete} />
      </View>
    </View>
  );
}

export default function TripsScreen() {
  const toast = useToast();
  const [trips, setTrips] = useState<api.Trip[] | null>(null);
  const [campsites, setCampsites] = useState<api.Campsite[]>([]);
  const [error, setError] = useState("");
  const [formTrip, setFormTrip] = useState<api.Trip | null | undefined>(undefined);
  const [packingTrip, setPackingTrip] = useState<api.Trip | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.getTrips(), api.getCampsites()])
      .then(([t, c]) => {
        setTrips(t);
        setCampsites(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Re-fetch on every focus, not just first mount — otherwise a campsite
  // created (or edited) after this tab was already visited once would
  // never show up in the trip form's campsite picker until app restart.
  useFocusEffect(load);

  async function handleDelete(id: string) {
    Alert.alert("Delete trip", "Delete this trip and its packing list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteTrip(id);
            load();
            toast("Trip deleted");
          } catch (e: any) {
            toast(e.message);
          }
        },
      },
    ]);
  }

  // Group every trip (upcoming and past alike) into Month/Year buckets,
  // newest month first — each trip's per-row Badge still carries the
  // active/upcoming/past status, so grouping by date doesn't lose that.
  const monthGroups = (() => {
    const all = (trips || []).slice().sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    const map = new Map<string, { label: string; sortKey: number; trips: api.Trip[] }>();
    for (const t of all) {
      const d = new Date(t.start);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, {
          label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          sortKey: d.getFullYear() * 12 + d.getMonth(),
          trips: [],
        });
      }
      map.get(key)!.trips.push(t);
    }
    return [...map.values()].sort((a, b) => b.sortKey - a.sortKey);
  })();

  return (
    <Screen>
      <View className="flex-row items-center justify-end mb-3 mt-1">
        <View className="flex-row gap-2">
          <Button title="Template" variant="ghost" size="sm" onPress={() => setTemplateOpen(true)} />
          <Button title="+ Trip" size="sm" onPress={() => setFormTrip(null)} />
        </View>
      </View>

      {error ? (
        <Text className="text-danger">{error}</Text>
      ) : trips === null ? (
        <ActivityIndicator color="#5BD46B" className="mt-4" />
      ) : monthGroups.length === 0 ? (
        <Card>
          <EmptyState icon="trips">No trips yet — plan your next escape.</EmptyState>
        </Card>
      ) : (
        monthGroups.map((group) => (
          <Card key={group.label}>
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="font-display text-lg text-ink">{group.label}</Text>
              <View className="bg-lime-dim rounded-full px-2 py-0.5">
                <Text className="text-lime-bright text-[11px] font-body-bold">{group.trips.length}</Text>
              </View>
            </View>
            {group.trips.map((t) => (
              <TripRow
                key={t.id}
                trip={t}
                onPack={() => setPackingTrip(t)}
                onEdit={() => setFormTrip(t)}
                onDelete={() => handleDelete(t.id!)}
              />
            ))}
          </Card>
        ))
      )}

      <TripForm
        visible={formTrip !== undefined}
        trip={formTrip || null}
        campsites={campsites}
        onClose={() => setFormTrip(undefined)}
        onSaved={() => {
          setFormTrip(undefined);
          load();
        }}
      />
      <PackingModal
        visible={!!packingTrip}
        trip={packingTrip}
        onClose={() => setPackingTrip(null)}
        onChanged={load}
      />
      <PackingTemplateModal visible={templateOpen} onClose={() => setTemplateOpen(false)} />
    </Screen>
  );
}
