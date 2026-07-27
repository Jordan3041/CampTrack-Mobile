import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { FormModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { useToast } from "@/lib/toast";

// Mirrors openTripForm() in CampTrack/js/trips.js.
export function TripForm({
  visible,
  trip,
  campsites,
  onClose,
  onSaved,
}: {
  visible: boolean;
  trip: api.Trip | null;
  campsites: api.Campsite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(trip?.title || "");
  const [start, setStart] = useState(trip?.start || "");
  const [end, setEnd] = useState(trip?.end || "");
  const [campsiteId, setCampsiteId] = useState(trip?.campsiteId || "");
  const [location, setLocation] = useState(trip?.location || "");
  const [notes, setNotes] = useState(trip?.notes || "");
  const [saving, setSaving] = useState(false);

  // FormModal stays mounted the whole time (only its `visible` prop
  // toggles), so the useState initializers above only ever run once —
  // without this, reopening for a different trip (or for "+ Trip" after
  // editing one) would keep showing whatever was filled in the first time
  // the form ever opened instead of that trip's actual details.
  useEffect(() => {
    if (!visible) return;
    setTitle(trip?.title || "");
    setStart(trip?.start || "");
    setEnd(trip?.end || "");
    setCampsiteId(trip?.campsiteId || "");
    setLocation(trip?.location || "");
    setNotes(trip?.notes || "");
  }, [visible, trip]);

  function handleCampsiteChange(id: string) {
    setCampsiteId(id);
    if (!location) {
      const s = campsites.find((c) => c.id === id);
      if (s) setLocation(s.name);
    }
  }

  async function save() {
    if (!title.trim()) return toast("Give the trip a name");
    if (!start) return toast("Pick a start date");
    if (end && end < start) return toast("End date is before the start date");

    setSaving(true);
    try {
      await api.saveTrip({
        id: trip?.id,
        packing: trip?.packing,
        title: title.trim(),
        start,
        end: end || start,
        campsiteId: campsiteId || null,
        location: location.trim(),
        notes: notes.trim(),
      });
      onSaved();
      toast(trip ? "Trip updated" : "Trip added — packing list is ready");
    } catch (e: any) {
      toast(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title={trip ? "Edit trip" : "Plan a trip"} onClose={onClose}>
      <TextField label="Trip name" placeholder="e.g. Fall color weekend" value={title} onChangeText={setTitle} />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <DateField label="Start date" value={start} onChange={setStart} />
        </View>
        <View className="flex-1">
          <DateField label="End date" value={end} onChange={setEnd} />
        </View>
      </View>
      <Select
        label="Campsite (from your log)"
        value={campsiteId || ""}
        onChange={handleCampsiteChange}
        options={[{ label: "— none / not logged yet —", value: "" }, ...campsites.map((c) => ({ label: c.name, value: c.id! }))]}
      />
      <TextField label="Or type a destination" placeholder="e.g. Ludington State Park" value={location} onChangeText={setLocation} />
      <TextField
        label="Trip notes"
        placeholder="Reservation #, arrival time, who's coming…"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />
      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title={trip ? "Save changes" : "Add trip"} onPress={save} loading={saving} />
      </View>
    </FormModal>
  );
}
