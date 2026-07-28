import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, IconName } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { useToast } from "@/lib/toast";

type Activity = "fishing" | "hiking" | "biking" | "utv";

const TABS: { key: Activity; label: string; icon: IconName }[] = [
  { key: "fishing", label: "Fishing", icon: "fishing" },
  { key: "hiking", label: "Hiking", icon: "hiking" },
  { key: "biking", label: "Biking", icon: "biking" },
  { key: "utv", label: "UTV/OHV", icon: "utv" },
];

const TRAIL_COLORS = ["#5BD46B", "#E0B23C", "#6E8CA8", "#E0673C", "#37A552", "#D9A441", "#9BA69C"];
const MOTORIZED_COLOR = "#E0673C";

function bikeLineColor(t: api.Trail) {
  if (t.difficultyLabel === "Expert") return "#F2F5F1";
  if (t.difficultyLabel === "Intermediate") return "#6E8CA8";
  if (t.difficultyLabel === "Easy" || t.surface === "paved" || t.surface === "asphalt") return "#5BD46B";
  return "#9BA69C";
}

const TRAIL_MODES: Record<
  "hiking" | "utv" | "biking",
  { heading: string; subhead: string; buttonLabel: string; emptyMessage: string; fetch: (campsiteId: string) => Promise<api.TrailResult> }
> = {
  hiking: {
    heading: "Find trails near a campsite",
    subhead: "Pulls recreational trails within 5 miles of a saved campsite from the USGS National Map.",
    buttonLabel: "Find nearby trails",
    emptyMessage: "No USGS-mapped trails found within 5 miles of this campsite.",
    fetch: api.getNearbyTrails,
  },
  utv: {
    heading: "Find UTV/OHV trails near a campsite",
    subhead: "Pulls trails legally open to ATVs, UTVs/side-by-sides, or motorcycles within 5 miles of a saved campsite.",
    buttonLabel: "Find nearby OHV trails",
    emptyMessage: "No USGS-mapped motorized trails found within 5 miles of this campsite.",
    fetch: api.getNearbyMotorizedTrails,
  },
  biking: {
    heading: "Find bike routes near a campsite",
    subhead: "Pulls cycling and mountain-biking routes within 5 miles of a saved campsite from OpenStreetMap.",
    buttonLabel: "Find nearby bike routes",
    emptyMessage: "No OpenStreetMap bike routes found within 5 miles of this campsite.",
    fetch: api.getNearbyBikeRoutes,
  },
};

// Mirrors CampTrack/activities.html + js/activities.js.
export default function ActivitiesScreen() {
  const toast = useToast();
  const [activity, setActivity] = useState<Activity>("fishing");

  // ---------- fishing ----------
  const [fishLat, setFishLat] = useState("");
  const [fishLng, setFishLng] = useState("");
  const [gauges, setGauges] = useState<api.FishingGauge[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedGauge, setSelectedGauge] = useState<{ id: string; name: string } | null>(null);
  const [reading, setReading] = useState<api.GaugeReading | null>(null);
  const [loadingGauge, setLoadingGauge] = useState(false);

  async function searchNearby(lat: number, lng: number) {
    setSearching(true);
    setGauges(null);
    try {
      const bounds = { west: lng - 0.35, south: lat - 0.35, east: lng + 0.35, north: lat + 0.35 };
      const results = await api.searchFishingGauges(bounds);
      setGauges(results);
    } catch (e: any) {
      toast(e.message);
      setGauges([]);
    } finally {
      setSearching(false);
    }
  }

  async function useMyLocationFishing() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return toast("Couldn't get your location.");
    const pos = await Location.getCurrentPositionAsync({});
    setFishLat(pos.coords.latitude.toFixed(5));
    setFishLng(pos.coords.longitude.toFixed(5));
    searchNearby(pos.coords.latitude, pos.coords.longitude);
  }

  async function loadGauge(gaugeId: string, name: string) {
    setSelectedGauge({ id: gaugeId, name });
    setLoadingGauge(true);
    setReading(null);
    try {
      setReading(await api.getFishingGauge(gaugeId));
    } catch (e: any) {
      toast(e.message);
      setSelectedGauge(null);
    } finally {
      setLoadingGauge(false);
    }
  }

  // ---------- trails (hiking / utv / biking) ----------
  const [campsites, setCampsites] = useState<api.Campsite[]>([]);
  const [campsiteId, setCampsiteId] = useState("");
  const [trailResult, setTrailResult] = useState<api.TrailResult | null>(null);
  const [trailsStatus, setTrailsStatus] = useState("");
  const [findingTrails, setFindingTrails] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  React.useEffect(() => {
    api.getCampsites().then((sites) => setCampsites(sites.filter((s) => s.locationType === "gps" && s.lat && s.lng))).catch(() => {});
  }, []);

  const trailMode = activity === "hiking" || activity === "utv" || activity === "biking" ? TRAIL_MODES[activity] : null;

  async function findNearbyTrails() {
    if (!trailMode) return;
    if (!campsiteId) {
      setTrailsStatus("Choose a campsite first.");
      return;
    }
    setFindingTrails(true);
    setTrailsStatus("Searching…");
    setTrailResult(null);
    try {
      const result = await trailMode.fetch(campsiteId);
      setTrailResult(result);
      setMapRegion({ latitude: result.lat, longitude: result.lng, latitudeDelta: 0.3, longitudeDelta: 0.3 });
      setTrailsStatus(
        result.trails.length ? `${result.trails.length} trail${result.trails.length === 1 ? "" : "s"} within 5 miles` : trailMode.emptyMessage
      );
    } catch (e: any) {
      setTrailsStatus(e.message);
    } finally {
      setFindingTrails(false);
    }
  }

  function trailColor(t: api.Trail, i: number) {
    if (activity === "utv") return MOTORIZED_COLOR;
    if (activity === "biking") return bikeLineColor(t);
    return TRAIL_COLORS[i % TRAIL_COLORS.length];
  }

  const selectedCampsiteName = useMemo(() => campsites.find((c) => c.id === campsiteId)?.name || "", [campsites, campsiteId]);

  return (
    <Screen scroll={activity === "fishing"}>
      <View className="flex-row bg-white/5 rounded-sm p-1 mb-4 mt-1">
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              setActivity(t.key);
              setTrailResult(null);
              setTrailsStatus("");
            }}
            className={`flex-1 items-center py-2 rounded-sm gap-1 ${activity === t.key ? "bg-lime-dim" : ""}`}>
            <Icon name={t.icon} size={16} color={activity === t.key ? "#7BE88A" : "#9BA69C"} />
            <Text className={`text-[10px] font-body-semibold ${activity === t.key ? "text-lime-bright" : "text-stone"}`}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {activity === "fishing" && (
        <>
          <Card>
            <Text className="font-display text-lg text-ink mb-1">Find a water body</Text>
            <Text className="text-stone text-sm mb-3">Search for USGS stream gauges near you, or drop in coordinates for another spot.</Text>
            <Button title="Use my current location" icon="location" onPress={useMyLocationFishing} />
            <View className="flex-row gap-3 mt-3">
              <View className="flex-1">
                <TextField
                  label="Latitude"
                  placeholder="44.9778"
                  value={fishLat}
                  onChangeText={setFishLat}
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Longitude"
                  placeholder="-93.2650"
                  value={fishLng}
                  onChangeText={setFishLng}
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                />
              </View>
            </View>
            <View className="mt-1">
              <Button
                title="Search this location"
                variant="ghost"
                onPress={() => {
                  const lat = parseFloat(fishLat);
                  const lng = parseFloat(fishLng);
                  if (!isFinite(lat) || !isFinite(lng)) return toast("Enter a valid latitude and longitude.");
                  searchNearby(lat, lng);
                }}
              />
            </View>
          </Card>

          {searching && <ActivityIndicator color="#5BD46B" className="my-3" />}

          {gauges && (
            <Card>
              <Text className="font-display text-lg text-ink mb-1">Nearby stream gauges</Text>
              {gauges.length === 0 ? (
                <EmptyState icon="fishing">No USGS stream gauges found near that location.</EmptyState>
              ) : (
                gauges.map((g) => (
                  <View key={g.gaugeId} className="flex-row justify-between items-center py-2.5 border-b border-line">
                    <View className="flex-1 pr-2">
                      <Text className="text-ink font-body-bold">{g.name}</Text>
                      <Text className="text-stone text-xs">
                        {g.distanceMiles} mi away · {g.state} · Gauge #{g.gaugeId}
                      </Text>
                    </View>
                    <Button title="View" variant="ghost" size="sm" onPress={() => loadGauge(g.gaugeId, g.name)} />
                  </View>
                ))
              )}
            </Card>
          )}

          {selectedGauge && (
            <Card>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-display text-lg text-ink">{selectedGauge.name}</Text>
                <Button title="Refresh" icon="refresh" variant="ghost" size="sm" onPress={() => loadGauge(selectedGauge.id, selectedGauge.name)} />
              </View>
              {loadingGauge || !reading ? (
                <ActivityIndicator color="#5BD46B" />
              ) : (
                <>
                  <View className="flex-row gap-2">
                    {[
                      ["Streamflow (cfs)", reading.streamflowCfs != null ? Math.round(reading.streamflowCfs).toLocaleString() : "—"],
                      ["Water temp", reading.waterTempF != null ? `${reading.waterTempF}°F` : "—"],
                      ["Gage height (ft)", reading.gageHeightFt != null ? reading.gageHeightFt.toFixed(2) : "—"],
                    ].map(([label, value]) => (
                      <View key={label} className="flex-1 bg-white/5 rounded-sm p-3 items-center">
                        <Text className="font-display text-lg text-ink">{value}</Text>
                        <Text className="text-stone text-[11px] text-center">{label}</Text>
                      </View>
                    ))}
                  </View>
                  {reading.flowLabel ? (
                    <Text className="text-lime-bright text-xs font-body-bold uppercase mt-2">{reading.flowLabel} flow</Text>
                  ) : null}
                  <Text className="text-stone text-xs mt-2">Last updated {new Date(reading.lastUpdated).toLocaleString()}</Text>
                </>
              )}
            </Card>
          )}
        </>
      )}

      {trailMode && (
        <View className="flex-1">
          <Card>
            <Text className="font-display text-lg text-ink mb-1">{trailMode.heading}</Text>
            <Text className="text-stone text-sm mb-2">{trailMode.subhead}</Text>
            <Select
              label="Campsite"
              value={campsiteId}
              onChange={setCampsiteId}
              options={[{ label: "— choose a campsite —", value: "" }, ...campsites.map((c) => ({ label: c.name!, value: c.id! }))]}
            />
            <View className="mt-2">
              <Button title={trailMode.buttonLabel} onPress={findNearbyTrails} loading={findingTrails} />
            </View>
            {trailsStatus ? <Text className="text-stone text-xs mt-2">{trailsStatus}</Text> : null}
          </Card>

          {mapRegion && (
            <View className="h-72 rounded-md overflow-hidden border border-glass-border mb-4">
              <MapView style={{ flex: 1 }} initialRegion={mapRegion} region={mapRegion}>
                {trailResult && (
                  <Marker coordinate={{ latitude: trailResult.lat, longitude: trailResult.lng }} pinColor="#5BD46B" title={selectedCampsiteName} />
                )}
                {trailResult?.trails.map((t, i) => (
                  <Polyline
                    key={t.id}
                    coordinates={t.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))}
                    strokeColor={trailColor(t, i)}
                    strokeWidth={activity === "utv" ? 5 : 4}
                  />
                ))}
              </MapView>
            </View>
          )}

          {trailResult && trailResult.trails.length > 0 && (
            <Card>
              <Text className="font-display text-lg text-ink mb-1">Trails in view</Text>
              {trailResult.trails.map((t, i) => (
                <View key={t.id} className="flex-row items-center gap-2 py-2 border-b border-line">
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: trailColor(t, i) }} />
                  <View className="flex-1">
                    <Text className="text-ink font-body-bold text-sm">{t.trailName}</Text>
                    <Text className="text-stone text-xs">
                      {t.distanceMiles != null ? `${t.distanceMiles} mi long` : "Length unknown"}
                      {t.vehicleTypes && t.vehicleTypes.length ? ` · ${t.vehicleTypes.join(", ")}` : ""}
                      {t.difficultyLabel ? ` · ${t.difficultyLabel}` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}
