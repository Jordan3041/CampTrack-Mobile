import React, { useState } from "react";
import { Platform, View } from "react-native";

import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { US_STATES } from "@/lib/us-states";
import { useToast } from "@/lib/toast";

// Mirrors openAddPublicCampsite() in CampTrack/js/admin.js.
export function AddPublicCampsiteForm({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("gps");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [locationName, setLocationName] = useState("");
  const [state, setState] = useState("");
  const [siteType, setSiteType] = useState("");
  const [hookupPower, setHookupPower] = useState(false);
  const [hookupWater, setHookupWater] = useState(false);
  const [hookupSewer, setHookupSewer] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Give the campsite a name");
    if (locationType === "gps" && (!lat || !lng)) return toast("Enter latitude and longitude");
    if (locationType === "address" && !address) return toast("Enter an address");
    if (locationType === "name" && !locationName) return toast("Enter a location name");

    setSaving(true);
    try {
      await api.saveCampsite({
        name: name.trim(),
        locationType: locationType as api.Campsite["locationType"],
        lat: lat.trim(),
        lng: lng.trim(),
        address: address.trim(),
        locationName: locationName.trim(),
        state,
        siteType,
        hookupPower,
        hookupWater,
        hookupSewer,
        notes: notes.trim(),
        isPublic: true,
        photos: [],
      });
      onSaved();
      toast("Public campsite added — visible on Explore now");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title="Add public campsite" onClose={onClose}>
      <TextField label="Campsite name" placeholder="e.g. Pine Hollow, Site 14" value={name} onChangeText={setName} />
      <Select
        label="Location type"
        value={locationType}
        onChange={setLocationType}
        options={[
          { label: "GPS coordinates", value: "gps" },
          { label: "Street address", value: "address" },
          { label: "Location name only", value: "name" },
        ]}
      />
      {locationType === "gps" && (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Latitude"
              placeholder="44.4280"
              value={lat}
              onChangeText={setLat}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Longitude"
              placeholder="-110.5885"
              value={lng}
              onChangeText={setLng}
              keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
            />
          </View>
        </View>
      )}
      {locationType === "address" && (
        <AddressAutocomplete
          label="Address"
          value={address}
          onChangeText={setAddress}
          onSelect={(s) => {
            if (s.state && US_STATES.includes(s.state)) setState(s.state);
          }}
        />
      )}
      {locationType === "name" && <TextField label="Location name" value={locationName} onChangeText={setLocationName} />}

      <Select
        label="State (optional)"
        value={state}
        onChange={setState}
        options={[{ label: "— not specified —", value: "" }, ...US_STATES.map((s) => ({ label: s, value: s }))]}
      />
      <Select
        label="Site type (optional)"
        value={siteType}
        onChange={setSiteType}
        options={[
          { label: "— not specified —", value: "" },
          { label: "RV", value: "rv" },
          { label: "Tent", value: "tent" },
          { label: "Both / either", value: "both" },
        ]}
      />

      <SwitchRow label="Power" value={hookupPower} onChange={setHookupPower} />
      <SwitchRow label="Water" value={hookupWater} onChange={setHookupWater} />
      <SwitchRow label="Sewer" value={hookupSewer} onChange={setHookupSewer} />

      <TextField label="Notes" placeholder="Anything future visitors should know…" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title="Add public campsite" onPress={save} loading={saving} />
      </View>
    </FormModal>
  );
}
