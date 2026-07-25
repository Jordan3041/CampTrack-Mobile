import * as Location from "expo-location";
import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StarPicker } from "@/components/ui/Stars";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { pickAndCompressPhotos } from "@/lib/photos";
import { US_STATES } from "@/lib/us-states";
import { useToast } from "@/lib/toast";

const LOCATION_TYPES = [
  { label: "GPS coordinates", value: "gps" },
  { label: "Street address", value: "address" },
  { label: "Location name only", value: "name" },
];
const SITE_TYPES = [
  { label: "— not specified —", value: "" },
  { label: "RV", value: "rv" },
  { label: "Tent", value: "tent" },
  { label: "Both / either", value: "both" },
];
const POWER_AMPS = [
  { label: "— not specified —", value: "" },
  { label: "30 amp", value: "30" },
  { label: "50 amp", value: "50" },
  { label: "Both 30 & 50 amp", value: "30/50" },
];
// Mirrors CELL_STRENGTH_LABELS in CampTrack/js/ui.js.
const CELL_STRENGTH_LABELS = ["No service", "1-2 bars", "3-4 bars", "Strong / 5G"];
const CELL_OPTIONS = [
  { label: "— not logged —", value: "" },
  ...CELL_STRENGTH_LABELS.map((label, i) => ({ label, value: String(i) })),
];

// Mirrors openSiteForm() in CampTrack/js/campsites.js.
export function CampsiteForm({
  visible,
  site,
  onClose,
  onSaved,
}: {
  visible: boolean;
  site: api.Campsite | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(site?.name || "");
  const [locationType, setLocationType] = useState<string>(site?.locationType || "gps");
  const [lat, setLat] = useState(site?.lat || "");
  const [lng, setLng] = useState(site?.lng || "");
  const [address, setAddress] = useState(site?.address || "");
  const [locationName, setLocationName] = useState(site?.locationName || "");
  const [state, setState] = useState(site?.state || "");
  const [siteType, setSiteType] = useState(site?.siteType || "");
  const [rating, setRating] = useState(site?.rating || 0);
  const [hookupPower, setHookupPower] = useState(!!site?.hookupPower);
  const [hookupWater, setHookupWater] = useState(!!site?.hookupWater);
  const [hookupSewer, setHookupSewer] = useState(!!site?.hookupSewer);
  const [powerAmp, setPowerAmp] = useState(site?.powerAmp || "");
  const [notes, setNotes] = useState(site?.notes || "");
  const [isPublic, setIsPublic] = useState(!!site?.isPublic);
  const [photos, setPhotos] = useState<string[]>(site?.photos || []);
  const [cellVerizon, setCellVerizon] = useState(site?.cellVerizon != null ? String(site.cellVerizon) : "");
  const [cellTmobile, setCellTmobile] = useState(site?.cellTmobile != null ? String(site.cellTmobile) : "");
  const [cellAtt, setCellAtt] = useState(site?.cellAtt != null ? String(site.cellAtt) : "");
  const [saving, setSaving] = useState(false);

  async function useMyLocation() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      toast("Couldn't get your location");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(pos.coords.latitude.toFixed(5));
    setLng(pos.coords.longitude.toFixed(5));
  }

  async function addPhotos() {
    const picked = await pickAndCompressPhotos();
    if (picked.length) setPhotos((p) => [...p, ...picked]);
  }

  async function save() {
    if (!name.trim()) {
      toast("Give the campsite a name");
      return;
    }
    if (locationType === "gps" && (!lat || !lng)) return toast("Enter latitude and longitude");
    if (locationType === "address" && !address) return toast("Enter an address");
    if (locationType === "name" && !locationName) return toast("Enter a location name");

    setSaving(true);
    try {
      await api.saveCampsite({
        id: site?.id,
        name: name.trim(),
        locationType: locationType as api.Campsite["locationType"],
        notes: notes.trim(),
        lat: lat.trim(),
        lng: lng.trim(),
        address: address.trim(),
        locationName: locationName.trim(),
        state,
        siteType,
        rating,
        hookupPower,
        hookupWater,
        hookupSewer,
        powerAmp: hookupPower ? powerAmp : "",
        isPublic,
        photos,
        cellVerizon: cellVerizon === "" ? null : Number(cellVerizon),
        cellTmobile: cellTmobile === "" ? null : Number(cellTmobile),
        cellAtt: cellAtt === "" ? null : Number(cellAtt),
      });
      onSaved();
      toast(site ? "Campsite updated" : "Campsite added");
    } catch (e: any) {
      toast(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title={site ? "Edit campsite" : "Add campsite"} onClose={onClose}>
      <TextField label="Campsite name" placeholder="e.g. Pine Hollow, Site 14" value={name} onChangeText={setName} />

      <Select label="Location type" value={locationType} onChange={setLocationType} options={LOCATION_TYPES} />

      {locationType === "gps" && (
        <View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField label="Latitude" placeholder="44.4280" value={lat} onChangeText={setLat} keyboardType="numeric" />
            </View>
            <View className="flex-1">
              <TextField label="Longitude" placeholder="-110.5885" value={lng} onChangeText={setLng} keyboardType="numeric" />
            </View>
          </View>
          <View className="mt-1">
            <Button title="Use my current location" icon="location" variant="ghost" size="sm" onPress={useMyLocation} />
          </View>
        </View>
      )}
      {locationType === "address" && (
        <TextField label="Address" placeholder="123 Lakeside Rd, Marquette, MI" value={address} onChangeText={setAddress} />
      )}
      {locationType === "name" && (
        <TextField label="Location name" placeholder="North shore of Bear Lake" value={locationName} onChangeText={setLocationName} />
      )}

      <Select
        label="State (optional)"
        value={state}
        onChange={setState}
        options={[{ label: "— not specified —", value: "" }, ...US_STATES.map((s) => ({ label: s, value: s }))]}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Select label="Site type (optional)" value={siteType} onChange={setSiteType} options={SITE_TYPES} />
        </View>
        <View className="flex-1">
          <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">Your rating (optional)</Text>
          <StarPicker value={rating} onChange={setRating} />
        </View>
      </View>

      <Text className="text-ink font-body-semibold text-[13px] mt-3 mb-2">Hookups (optional)</Text>
      <SwitchRow label="Power" value={hookupPower} onChange={setHookupPower} />
      <SwitchRow label="Water" value={hookupWater} onChange={setHookupWater} />
      <SwitchRow label="Sewer" value={hookupSewer} onChange={setHookupSewer} />

      {hookupPower && <Select label="Power service" value={powerAmp} onChange={setPowerAmp} options={POWER_AMPS} />}

      <Text className="text-ink font-body-semibold text-[13px] mt-3 mb-1">Cell service (optional)</Text>
      <Select label="Verizon" value={cellVerizon} onChange={setCellVerizon} options={CELL_OPTIONS} />
      <Select label="T-Mobile" value={cellTmobile} onChange={setCellTmobile} options={CELL_OPTIONS} />
      <Select label="AT&T" value={cellAtt} onChange={setCellAtt} options={CELL_OPTIONS} />

      <TextField
        label="Notes for next time"
        placeholder="Site is level, good shade after 2pm, dump station near entrance…"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      <View className="mt-3">
        <SwitchRow
          label="Make this campsite public"
          hint="Shows its location, photos, and notes on the public Explore map. Your username and street address are never shared. Needs GPS coordinates to appear."
          value={isPublic}
          onChange={setIsPublic}
        />
      </View>

      <Text className="text-ink font-body-semibold text-[13px] mb-1 mt-3">Photos</Text>
      <Button title="Add photos" variant="ghost" size="sm" onPress={addPhotos} />
      <Text className="text-stone text-xs mt-1">Photos are compressed automatically to save space.</Text>
      <View className="flex-row flex-wrap gap-2 mt-2">
        {photos.map((p, i) => (
          <View key={i} className="relative">
            <Image source={{ uri: p }} style={{ width: 84, height: 84, borderRadius: 10 }} />
            <Pressable
              onPress={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
              className="absolute -top-1.5 -right-1.5 bg-danger rounded-full w-6 h-6 items-center justify-center">
              <Icon name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
      </View>

      <View className="flex-row justify-end gap-2 mt-5 mb-2">
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title={site ? "Save changes" : "Add campsite"} onPress={save} loading={saving} />
      </View>
    </FormModal>
  );
}
