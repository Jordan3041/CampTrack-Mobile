import React, { useCallback, useEffect, useState } from "react";
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

  useEffect(load, [load]);

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

  const upcoming = (trips || []).filter((t) => tripStatus(t) !== "past");
  const past = (trips || []).filter((t) => tripStatus(t) === "past").reverse();

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
      ) : (
        <>
          <Card>
            <Text className="font-display text-lg text-ink mb-1">Upcoming & current</Text>
            {upcoming.length === 0 ? (
              <EmptyState icon="trips">No upcoming trips yet — plan your next escape.</EmptyState>
            ) : (
              upcoming.map((t) => (
                <TripRow
                  key={t.id}
                  trip={t}
                  onPack={() => setPackingTrip(t)}
                  onEdit={() => setFormTrip(t)}
                  onDelete={() => handleDelete(t.id!)}
                />
              ))
            )}
          </Card>
          <Card>
            <Text className="font-display text-lg text-ink mb-1">Past trips</Text>
            {past.length === 0 ? (
              <EmptyState icon="trips">Past trips will collect here.</EmptyState>
            ) : (
              past.map((t) => (
                <TripRow
                  key={t.id}
                  trip={t}
                  onPack={() => setPackingTrip(t)}
                  onEdit={() => setFormTrip(t)}
                  onDelete={() => handleDelete(t.id!)}
                />
              ))
            )}
          </Card>
        </>
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
