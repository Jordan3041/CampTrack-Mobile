import React, { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";

const COORD_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

// Mirrors CampTrack/maps.html + js/maps.js — search by address/place/coords,
// jump to a logged campsite, and open turn-by-turn directions.
export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [dest, setDest] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [campsites, setCampsites] = useState<api.Campsite[]>([]);
  const [selectedSite, setSelectedSite] = useState("");

  useEffect(() => {
    api.getCampsites().then(setCampsites).catch(() => {});
  }, []);

  function placeDestination(lat: number, lng: number, label: string) {
    setDest({ lat, lng, label });
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.5, longitudeDelta: 0.5 }, 500);
  }

  async function searchLocation() {
    const q = query.trim();
    if (!q) return;
    const coordMatch = COORD_RE.exec(q);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      placeDestination(lat, lng, `${lat}, ${lng}`);
      setStatus(`Showing ${lat}, ${lng}`);
      setStatusError(false);
      return;
    }
    setStatus("Searching…");
    setStatusError(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const results = await res.json();
      if (!results.length) {
        setStatus("Couldn't find that place — try a more specific address, or enter coordinates like 44.42, -110.58.");
        setStatusError(true);
        return;
      }
      const r = results[0];
      placeDestination(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
      setStatus(r.display_name);
    } catch (e) {
      setStatus("Search failed — check your connection and try again.");
      setStatusError(true);
    }
  }

  function getDirections() {
    if (!dest) {
      setStatus("Search for a destination first.");
      setStatusError(true);
      return;
    }
    const d = `${dest.lat},${dest.lng}`;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}&travelmode=driving`);
    setStatus("Opening directions…");
    setStatusError(false);
  }

  const withCoords = campsites.filter((s) => s.locationType === "gps" && s.lat && s.lng);

  return (
    <View className="flex-1 bg-bg">
      <View className="px-4 pt-3 gap-2">
        <View className="flex-row gap-2 items-end">
          <View className="flex-1">
            <TextField
              placeholder="Search address, place, or lat, lng"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={searchLocation}
              returnKeyType="search"
            />
          </View>
          <Button title="Go" size="sm" onPress={searchLocation} />
        </View>
        <View className="flex-row gap-2 items-center">
          <View className="flex-1">
            <Select
              value={selectedSite}
              onChange={(v) => {
                setSelectedSite(v);
                const s = withCoords.find((c) => c.id === v);
                if (s) {
                  placeDestination(Number(s.lat), Number(s.lng), s.name);
                  setStatus(`Showing ${s.name}`);
                  setStatusError(false);
                }
              }}
              options={[{ label: "— choose a campsite —", value: "" }, ...withCoords.map((s) => ({ label: s.name, value: s.id! }))]}
            />
          </View>
          <Button title="Directions" variant="ghost" size="sm" onPress={getDirections} />
        </View>
        {status ? <Text className={`text-xs ${statusError ? "text-danger" : "text-stone"}`}>{status}</Text> : null}
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1, marginTop: 12 }}
        initialRegion={{ latitude: 44.5, longitude: -110.5, latitudeDelta: 12, longitudeDelta: 12 }}>
        {dest ? (
          <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} title={dest.label} pinColor="#5BD46B" />
        ) : null}
      </MapView>
    </View>
  );
}
