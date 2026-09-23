import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapView, { Callout, Geojson, Marker, Region } from "react-native-maps";

import dumpStationsData from "@/assets/data/dump-stations.json";
import { FilterSheet, DEFAULT_FILTERS, ExploreFilters } from "@/components/explore/FilterSheet";
import { GaugeDetailSheet } from "@/components/explore/GaugeDetailSheet";
import { GAUGE_COLOR, GaugeMarker } from "@/components/explore/GaugeMarker";
import { MapLegend } from "@/components/explore/MapLegend";
import { ReservoirDetailSheet } from "@/components/explore/ReservoirDetailSheet";
import { ReservoirMarker } from "@/components/explore/ReservoirMarker";
import { SiteDetailSheet } from "@/components/explore/SiteDetailSheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { SwitchRow } from "@/components/ui/SwitchRow";
import * as api from "@/lib/api";
import {
  agencyStyle,
  AGENCY_STYLES,
  DumpStation,
  fetchPublicLands,
  fetchWildfires,
  PUBLIC_LANDS_MIN_ZOOM_DELTA,
  WildfireIncident,
} from "@/lib/explore-layers";
import { useToast } from "@/lib/toast";
import { bboxFromRegion, DynamicReservoirReading, fetchGauges, fetchReservoirStorage, GaugeReading, isRegionQueryable } from "@/lib/usgs";

type Site = Omit<api.Campsite, "lat" | "lng"> & { lat: number; lng: number };

function coordKey(lat: number, lng: number) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

const INITIAL_REGION: Region = { latitude: 39.5, longitude: -98.35, latitudeDelta: 40, longitudeDelta: 40 };
// Roughly zoom >= 7 equivalent in lat delta — a bit more zoomed-out than
// the public-lands layer's threshold, matching RIDB_MIN_ZOOM on the web.
const RIDB_MIN_ZOOM_DELTA = 2.8;

// Mirrors CampTrack/explore.html + js/explore.js.
export default function ExploreScreen() {
  const toast = useToast();
  const mapRef = useRef<MapView>(null);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [myCoords, setMyCoords] = useState<Set<string>>(new Set());
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [count, setCount] = useState("Loading public campsites…");
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const [dumpOn, setDumpOn] = useState(false);
  const [wildfireOn, setWildfireOn] = useState(false);
  const [wildfires, setWildfires] = useState<WildfireIncident[]>([]);
  const [wildfireStatus, setWildfireStatus] = useState("");

  const [landsOn, setLandsOn] = useState(false);
  const [landsFeatures, setLandsFeatures] = useState<any[]>([]);
  const [landsStatus, setLandsStatus] = useState("");
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const landsFetchToken = useRef(0);

  const [ridbOn, setRidbOn] = useState(false);
  const [ridbStandard, setRidbStandard] = useState(false);
  const [ridbRv, setRidbRv] = useState(false);
  const [ridbCabin, setRidbCabin] = useState(false);
  const [ridbFcfs, setRidbFcfs] = useState(false);
  const [ridbCampgrounds, setRidbCampgrounds] = useState<api.RidbCampground[]>([]);
  const [ridbStatus, setRidbStatus] = useState("");
  const ridbFetchToken = useRef(0);

  const [gaugesOn, setGaugesOn] = useState(false);
  const [gauges, setGauges] = useState<GaugeReading[]>([]);
  const [gaugesLoading, setGaugesLoading] = useState(false);
  const [gaugesFetchedOnce, setGaugesFetchedOnce] = useState(false);
  const [selectedGauge, setSelectedGauge] = useState<GaugeReading | null>(null);
  const gaugeFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reservoirsOn, setReservoirsOn] = useState(false);
  const [reservoirs, setReservoirs] = useState<api.Reservoir[]>([]);
  const [reservoirStatus, setReservoirStatus] = useState("");
  const [selectedReservoir, setSelectedReservoir] = useState<api.Reservoir | null>(null);

  // Dynamic, bbox-driven gap-filler on top of the curated list above (see
  // lib/usgs.ts's fetchReservoirStorage) — covers reservoirs outside the
  // curated, capacity-verified set (mainly Midwest/East, but anywhere the
  // curated list doesn't reach). No known capacity for these, so they
  // always render with percentFull null (neutral marker color, "N/A" in
  // the detail sheet) rather than a guessed number.
  const [dynamicReservoirs, setDynamicReservoirs] = useState<DynamicReservoirReading[]>([]);
  const dynamicReservoirFetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => setLocationEnabled(status === "granted"));
  }, []);

  async function centerOnMe() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      toast("Couldn't get your location");
      return;
    }
    setLocationEnabled(true);
    const pos = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion(
      { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.2, longitudeDelta: 0.2 },
      500
    );
  }

  useEffect(() => {
    (async () => {
      try {
        const sites = (await api.getPublicCampsites()) as Site[];
        setAllSites(sites);
      } catch (e: any) {
        setCount(e.message);
      }
      try {
        const mine = await api.getCampsites();
        setMyCoords(new Set(mine.filter((s) => s.lat && s.lng).map((s) => coordKey(Number(s.lat), Number(s.lng)))));
        setMyIds(new Set(mine.filter((s) => s.id).map((s) => s.id!)));
      } catch (_) {}
    })();
  }, []);

  const states = useMemo(() => [...new Set(allSites.map((s) => s.state).filter(Boolean))].sort() as string[], [allSites]);

  const filteredSites = useMemo(() => {
    let sites = allSites;
    if (filters.state) sites = sites.filter((s) => s.state === filters.state);
    if (filters.type) sites = sites.filter((s) => s.siteType === filters.type || s.siteType === "both");
    if (filters.minRating) sites = sites.filter((s) => (s.rating || 0) >= filters.minRating);
    if (filters.power) sites = sites.filter((s) => s.hookupPower);
    if (filters.water) sites = sites.filter((s) => s.hookupWater);
    if (filters.sewer) sites = sites.filter((s) => s.hookupSewer);
    if (filters.amp) sites = sites.filter((s) => (s.powerAmp || "").includes(filters.amp));
    return sites;
  }, [allSites, filters]);

  useEffect(() => {
    if (!allSites.length) return;
    setCount(
      filteredSites.length === allSites.length
        ? `${filteredSites.length} public campsite${filteredSites.length === 1 ? "" : "s"}`
        : `${filteredSites.length} of ${allSites.length} public campsites match your filters`
    );
  }, [filteredSites, allSites]);

  async function toggleWildfire(on: boolean) {
    setWildfireOn(on);
    if (!on) {
      setWildfireStatus("");
      return;
    }
    if (wildfires.length) {
      setWildfireStatus(`${wildfires.length} active`);
      return;
    }
    setWildfireStatus("Loading…");
    try {
      const list = await fetchWildfires();
      setWildfires(list);
      setWildfireStatus(`${list.length} active`);
    } catch (e: any) {
      setWildfireStatus("Couldn't load wildfire data.");
      setWildfireOn(false);
    }
  }

  // Reservoir Levels is a small, curated set (see the server's
  // reservoirService.js) rather than a bbox-scoped query, so — same as
  // wildfires above — it's fetched once when the layer is switched on and
  // reused after that, no re-fetch on pan/zoom.
  async function toggleReservoirs(on: boolean) {
    setReservoirsOn(on);
    if (!on) {
      setReservoirStatus("");
      if (dynamicReservoirFetchTimer.current) clearTimeout(dynamicReservoirFetchTimer.current);
      setDynamicReservoirs([]);
      return;
    }
    refreshDynamicReservoirs(region);
    if (reservoirs.length) {
      setReservoirStatus(`${reservoirs.length} reservoirs`);
      return;
    }
    setReservoirStatus("Loading…");
    try {
      const list = await api.getReservoirs();
      // Defensive: a malformed/partial row (missing coordinates, mainly)
      // would otherwise throw when handed to <Marker coordinate={...}>
      // below — better to quietly drop that one reservoir than crash the
      // whole layer over it.
      const valid = (list || []).filter(
        (r) => r && typeof r.lat === "number" && typeof r.lng === "number" && !Number.isNaN(r.lat) && !Number.isNaN(r.lng)
      );
      setReservoirs(valid);
      setReservoirStatus(valid.length ? `${valid.length} reservoir${valid.length === 1 ? "" : "s"}` : "No reservoir data available right now.");
    } catch (e: any) {
      // Deliberately NOT reverting reservoirsOn to false here (unlike
      // toggleWildfire) — an instant, unexplained snap-back reads as a
      // crash. Leaving the switch on with a clear, actionable status
      // instead: nothing renders on the map (reservoirs stays []), and
      // switching it off/on again retries, once the cache is warm or the
      // upstream recovers.
      const message = e?.message === "Something went wrong. Try again." ? "Server error loading reservoirs." : e?.message || "Couldn't load reservoir data.";
      setReservoirStatus(`${message} Toggle off/on to retry.`);
    }
  }

  const refreshPublicLands = useCallback(async (r: Region) => {
    if (r.latitudeDelta > PUBLIC_LANDS_MIN_ZOOM_DELTA) {
      setLandsFeatures([]);
      setLandsStatus("Zoom in to see boundaries");
      return;
    }
    const myToken = ++landsFetchToken.current;
    setLandsStatus("Loading…");
    try {
      const data = await fetchPublicLands(r);
      if (myToken !== landsFetchToken.current) return;
      if (!data.features) {
        setLandsStatus("Couldn't load public lands data.");
        return;
      }
      setLandsFeatures(data.features);
      setLandsStatus(`${data.features.length} unit${data.features.length === 1 ? "" : "s"} in view`);
    } catch (e) {
      if (myToken === landsFetchToken.current) setLandsStatus("Couldn't load public lands data.");
    }
  }, []);

  function toggleLands(on: boolean) {
    setLandsOn(on);
    if (on) refreshPublicLands(region);
    else {
      setLandsFeatures([]);
      setLandsStatus("");
    }
  }

  // Mirrors refreshRidb() in CampTrack/js/explore.js — same viewport-scoped,
  // zoom-gated pattern as the public-lands layer above, with master/sub
  // toggles for standard/RV/cabin site types and first-come-first-served.
  const refreshRidb = useCallback(
    async (r: Region) => {
      if (r.latitudeDelta > RIDB_MIN_ZOOM_DELTA) {
        setRidbCampgrounds([]);
        setRidbStatus("Zoom in to see campgrounds");
        return;
      }
      const myToken = ++ridbFetchToken.current;
      setRidbStatus("Loading…");
      try {
        const west = r.longitude - r.longitudeDelta / 2;
        const east = r.longitude + r.longitudeDelta / 2;
        const south = r.latitude - r.latitudeDelta / 2;
        const north = r.latitude + r.latitudeDelta / 2;
        const params: Record<string, string> = { west: String(west), south: String(south), east: String(east), north: String(north) };
        if (ridbStandard) params.standard = "1";
        if (ridbRv) params.rv = "1";
        if (ridbCabin) params.cabin = "1";
        if (ridbFcfs) params.fcfs = "1";
        const list = await api.getRidbCampgrounds(params);
        if (myToken !== ridbFetchToken.current) return;
        setRidbCampgrounds(list);
        setRidbStatus(`${list.length} campground${list.length === 1 ? "" : "s"} in view`);
      } catch (e: any) {
        if (myToken === ridbFetchToken.current) setRidbStatus(e.message || "Couldn't load federal campgrounds.");
      }
    },
    [ridbStandard, ridbRv, ridbCabin, ridbFcfs]
  );

  function toggleRidb(on: boolean) {
    setRidbOn(on);
    if (on) refreshRidb(region);
    else {
      setRidbCampgrounds([]);
      setRidbStatus("");
    }
  }

  // USGS's Instantaneous Values service hard-rejects (HTTP 400) any
  // bounding box wider than ~2.9° (see lib/usgs.ts), so gauges only ever
  // load once the map is zoomed in past isRegionQueryable's threshold —
  // otherwise the query would either error or silently cover some
  // arbitrary sub-slice of a much larger viewport than what's on screen.
  // Debounced (unlike the other layers above) so rapid panning doesn't
  // fire a request per frame — this one's an external, unauthenticated
  // fetch straight to USGS, not our own rate-limited server.
  const refreshGauges = useCallback((r: Region) => {
    if (gaugeFetchTimer.current) clearTimeout(gaugeFetchTimer.current);
    gaugeFetchTimer.current = setTimeout(() => {
      if (!isRegionQueryable(r)) {
        setGauges([]);
        return;
      }
      setGaugesLoading(true);
      fetchGauges(bboxFromRegion(r))
        .then(setGauges)
        .catch(() => setGauges([]))
        .finally(() => {
          setGaugesLoading(false);
          setGaugesFetchedOnce(true);
        });
    }, 600);
  }, []);

  function toggleGauges(on: boolean) {
    setGaugesOn(on);
    if (on) {
      setGaugesFetchedOnce(false);
      refreshGauges(region);
    } else {
      if (gaugeFetchTimer.current) clearTimeout(gaugeFetchTimer.current);
      setGauges([]);
    }
  }

  // Same zoom-gated, debounced pattern as refreshGauges above — the
  // dynamic reservoir gap-filler is a straight bbox query against USGS
  // too, so it's bound by the same ~2.9° limit and needs the same
  // "don't fire on every pan frame" debounce.
  const refreshDynamicReservoirs = useCallback((r: Region) => {
    if (dynamicReservoirFetchTimer.current) clearTimeout(dynamicReservoirFetchTimer.current);
    dynamicReservoirFetchTimer.current = setTimeout(() => {
      if (!isRegionQueryable(r)) {
        setDynamicReservoirs([]);
        return;
      }
      fetchReservoirStorage(bboxFromRegion(r))
        .then(setDynamicReservoirs)
        .catch(() => setDynamicReservoirs([]));
    }, 600);
  }, []);

  useEffect(
    () => () => {
      if (gaugeFetchTimer.current) clearTimeout(gaugeFetchTimer.current);
      if (dynamicReservoirFetchTimer.current) clearTimeout(dynamicReservoirFetchTimer.current);
    },
    []
  );

  const gaugesStatus = !gaugesOn
    ? ""
    : !isRegionQueryable(region)
      ? "Zoom in to see stream gauges"
      : gaugesLoading
        ? "Loading…"
        : gaugesFetchedOnce
          ? `${gauges.length} gauge${gauges.length === 1 ? "" : "s"} in view`
          : "";

  function onRegionChangeComplete(r: Region) {
    setRegion(r);
    if (landsOn) refreshPublicLands(r);
    if (ridbOn) refreshRidb(r);
    if (gaugesOn) refreshGauges(r);
    if (reservoirsOn) refreshDynamicReservoirs(r);
  }

  useEffect(() => {
    if (ridbOn) refreshRidb(region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ridbStandard, ridbRv, ridbCabin, ridbFcfs]);

  // ~0.02° (roughly 1.4 miles) counts as "the same reservoir" — close
  // enough that a dynamic USGS point this near a curated one is almost
  // certainly the same body of water (the curated entry's own coordinate
  // and the USGS gauge sitting on that reservoir's dam are never exactly
  // equal), so it's dropped rather than shown as a second overlapping pin.
  const DEDUP_DEGREES = 0.02;

  const allReservoirMarkers = useMemo((): api.Reservoir[] => {
    if (!reservoirsOn) return [];
    const dynamicMapped: api.Reservoir[] = dynamicReservoirs
      .filter((d) => !reservoirs.some((c) => Math.abs(c.lat - d.lat) < DEDUP_DEGREES && Math.abs(c.lng - d.lng) < DEDUP_DEGREES))
      .map((d) => ({
        id: d.siteId,
        name: d.name,
        agency: "USGS",
        lat: d.lat,
        lng: d.lng,
        storageAf: d.storageAf,
        capacityAf: null,
        elevationFt: null,
        percentFull: null,
        lastUpdated: d.measuredAt || new Date().toISOString(),
      }));
    return [...reservoirs, ...dynamicMapped];
  }, [reservoirsOn, reservoirs, dynamicReservoirs]);

  const legendEntries = useMemo(() => {
    const entries: { color: string; label: string }[] = [{ color: "#5BD46B", label: "Public campsites" }];
    if (dumpOn) entries.push({ color: "#8a6d3b", label: "Dump stations" });
    if (wildfireOn) entries.push({ color: "#C0392B", label: "Active wildfires" });
    if (ridbOn) entries.push({ color: "#3B6FA0", label: "Federal campgrounds" });
    if (gaugesOn) entries.push({ color: GAUGE_COLOR, label: "Stream gauges" });
    if (reservoirsOn) entries.push({ color: "#60A5FA", label: "Reservoir levels" });
    return entries;
  }, [dumpOn, wildfireOn, ridbOn, gaugesOn, reservoirsOn]);

  const landsByAgency = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const f of landsFeatures) {
      const style = agencyStyle(f.properties?.Agency);
      const key = style.color;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
    return [...groups.entries()].map(([color, features]) => ({ color, geojson: { type: "FeatureCollection", features } }));
  }, [landsFeatures]);

  return (
    <View className="flex-1 bg-bg">
      <MapView
        ref={mapRef}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={locationEnabled}
        showsMyLocationButton={false}>
        {filteredSites
          .filter((s) => s.lat && s.lng)
          .map((s) => (
            <Marker
              // Keying on selection state forces the marker to remount
              // when it's deselected — react-native-maps/MapKit otherwise
              // leaves the pin's native "selected" (enlarged) visual state
              // stuck after our custom SiteDetailSheet is dismissed, since
              // closing that modal never tells the underlying map view to
              // deselect the annotation itself.
              key={`${s.id}-${selectedSite?.id === s.id ? "sel" : "unsel"}`}
              coordinate={{ latitude: Number(s.lat), longitude: Number(s.lng) }}
              pinColor="#5BD46B"
              onPress={() => setSelectedSite(s)}>
              {/* Empty Callout child suppresses MapKit's default empty-title
                  bubble — the tap is handled by SiteDetailSheet instead. */}
              <Callout tooltip pointerEvents="none">
                <View />
              </Callout>
            </Marker>
          ))}

        {dumpOn &&
          (dumpStationsData as { stations: DumpStation[] }).stations.map((d, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: d.lat, longitude: d.lng }}
              pinColor="#8a6d3b"
              title={d.name || "Dump station"}
              description={[d.fee ? `Fee: ${d.fee}` : "", d.access ? `Access: ${d.access}` : ""].filter(Boolean).join(" · ")}
            />
          ))}

        {wildfireOn &&
          wildfires.map((w, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: w.lat, longitude: w.lng }}
              pinColor="#C0392B"
              title={`🔥 ${w.name}`}
              description={[
                w.typeLabel,
                w.state,
                w.size != null ? `${Math.round(w.size).toLocaleString()} acres` : "",
                w.contained != null ? `${w.contained}% contained` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}

        {landsOn &&
          landsByAgency.map(({ color, geojson }, i) => (
            <Geojson key={i} geojson={geojson as any} strokeColor={color} fillColor={`${color}47`} strokeWidth={1.5} />
          ))}

        {ridbOn &&
          ridbCampgrounds.map((c) => {
            const types = [c.hasStandard && "Standard", c.hasRv && "RV", c.hasCabin && "Cabin/lodging"].filter(Boolean).join(" · ");
            return (
              <Marker
                key={c.id}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                pinColor="#3B6FA0"
                title={c.name}
                description={[c.reservable ? "Reservable" : "First-come, first-served", types, "Data from Recreation.gov"]
                  .filter(Boolean)
                  .join(" · ")}
              />
            );
          })}

        {gaugesOn &&
          gauges.map((g) => (
            <Marker
              key={g.siteCode}
              coordinate={{ latitude: g.lat, longitude: g.lng }}
              onPress={() => setSelectedGauge(g)}
              anchor={{ x: 0.5, y: 0.5 }}>
              <GaugeMarker />
              {/* Empty Callout child suppresses MapKit's default empty-title
                  bubble — the tap is handled by GaugeDetailSheet instead. */}
              <Callout tooltip pointerEvents="none">
                <View />
              </Callout>
            </Marker>
          ))}

        {allReservoirMarkers.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            onPress={() => setSelectedReservoir(r)}
            anchor={{ x: 0.5, y: 0.5 }}>
            <ReservoirMarker percentFull={r.percentFull} />
            {/* Empty Callout child suppresses MapKit's default empty-title
                bubble — the tap is handled by ReservoirDetailSheet instead. */}
            <Callout tooltip pointerEvents="none">
              <View />
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Floating, translucent controls overlaid on the map — replaces the
          old opaque header row now that the map fills the whole screen. */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2.5"
          style={{ backgroundColor: "rgba(23,28,24,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
          <Icon name="filter" size={15} color="#F2F5F1" />
          <Text className="text-ink text-[13px] font-body-semibold">Filters</Text>
        </Pressable>
        <Pressable
          onPress={() => setLayersOpen(true)}
          className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2.5"
          style={{ backgroundColor: "rgba(23,28,24,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
          <Icon name="layers" size={15} color="#F2F5F1" />
          <Text className="text-ink text-[13px] font-body-semibold">Map layers</Text>
        </Pressable>
        <View
          className="flex-1 rounded-full px-3 py-2.5"
          style={{ backgroundColor: "rgba(23,28,24,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }}>
          <Text className="text-[#cdd8ce] text-[11px] text-right" numberOfLines={1}>
            {count}
          </Text>
        </View>
      </View>

      <MapLegend entries={legendEntries} />

      <Pressable
        onPress={centerOnMe}
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(23,28,24,0.92)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <Icon name="location" size={20} color="#5BD46B" />
      </Pressable>

      <FilterSheet visible={filtersOpen} filters={filters} states={states} onChange={setFilters} onClose={() => setFiltersOpen(false)} />

      <SiteDetailSheet
        site={selectedSite}
        alreadySaved={selectedSite ? myCoords.has(coordKey(Number(selectedSite.lat), Number(selectedSite.lng))) : false}
        isOwnSite={selectedSite ? !!selectedSite.id && myIds.has(selectedSite.id) : false}
        onClose={() => setSelectedSite(null)}
        onSaved={() => {
          if (selectedSite) setMyCoords((prev) => new Set(prev).add(coordKey(Number(selectedSite.lat), Number(selectedSite.lng))));
        }}
      />

      <GaugeDetailSheet gauge={selectedGauge} onClose={() => setSelectedGauge(null)} />

      <ReservoirDetailSheet reservoir={selectedReservoir} onClose={() => setSelectedReservoir(null)} />

      <LayersSheet
        visible={layersOpen}
        onClose={() => setLayersOpen(false)}
        dumpOn={dumpOn}
        onDumpChange={setDumpOn}
        wildfireOn={wildfireOn}
        wildfireStatus={wildfireStatus}
        onWildfireChange={toggleWildfire}
        landsOn={landsOn}
        landsStatus={landsStatus}
        onLandsChange={toggleLands}
        ridbOn={ridbOn}
        ridbStatus={ridbStatus}
        onRidbChange={toggleRidb}
        ridbStandard={ridbStandard}
        onRidbStandardChange={setRidbStandard}
        ridbRv={ridbRv}
        onRidbRvChange={setRidbRv}
        ridbCabin={ridbCabin}
        onRidbCabinChange={setRidbCabin}
        ridbFcfs={ridbFcfs}
        onRidbFcfsChange={setRidbFcfs}
        gaugesOn={gaugesOn}
        gaugesStatus={gaugesStatus}
        onGaugesChange={toggleGauges}
        reservoirsOn={reservoirsOn}
        reservoirStatus={reservoirStatus}
        onReservoirsChange={toggleReservoirs}
      />
    </View>
  );
}

function LayersSheet({
  visible,
  onClose,
  dumpOn,
  onDumpChange,
  wildfireOn,
  wildfireStatus,
  onWildfireChange,
  landsOn,
  landsStatus,
  onLandsChange,
  ridbOn,
  ridbStatus,
  onRidbChange,
  ridbStandard,
  onRidbStandardChange,
  ridbRv,
  onRidbRvChange,
  ridbCabin,
  onRidbCabinChange,
  ridbFcfs,
  onRidbFcfsChange,
  gaugesOn,
  gaugesStatus,
  onGaugesChange,
  reservoirsOn,
  reservoirStatus,
  onReservoirsChange,
}: {
  visible: boolean;
  onClose: () => void;
  dumpOn: boolean;
  onDumpChange: (v: boolean) => void;
  ridbOn: boolean;
  ridbStatus: string;
  onRidbChange: (v: boolean) => void;
  ridbStandard: boolean;
  onRidbStandardChange: (v: boolean) => void;
  ridbRv: boolean;
  onRidbRvChange: (v: boolean) => void;
  ridbCabin: boolean;
  onRidbCabinChange: (v: boolean) => void;
  ridbFcfs: boolean;
  onRidbFcfsChange: (v: boolean) => void;
  wildfireOn: boolean;
  wildfireStatus: string;
  onWildfireChange: (v: boolean) => void;
  landsOn: boolean;
  landsStatus: string;
  onLandsChange: (v: boolean) => void;
  gaugesOn: boolean;
  gaugesStatus: string;
  onGaugesChange: (v: boolean) => void;
  reservoirsOn: boolean;
  reservoirStatus: string;
  onReservoirsChange: (v: boolean) => void;
}) {
  return (
    <FormModal visible={visible} title="Map layers" onClose={onClose}>
      <SwitchRow icon="sewer" label="Dump stations" value={dumpOn} onChange={onDumpChange} />
      <SwitchRow icon="fire" label="Active wildfires" hint={wildfireStatus} value={wildfireOn} onChange={onWildfireChange} />
      <SwitchRow icon="map" label="Public lands boundaries" hint={landsStatus} value={landsOn} onChange={onLandsChange} />
      {landsOn && (
        <View className="flex-row flex-wrap gap-x-3 gap-y-1.5 mt-2">
          {AGENCY_STYLES.map((s) => (
            <View key={s.label} className="flex-row items-center gap-1.5">
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
              <Text className="text-stone text-[11px]">{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <SwitchRow icon="campsites" label="Federal Campgrounds" hint={ridbStatus} value={ridbOn} onChange={onRidbChange} />
      <Text className="text-stone text-[11px] -mt-1 mb-1">Data from Recreation.gov</Text>

      <SwitchRow icon="gauge" label="Stream Gauges" hint={gaugesStatus} value={gaugesOn} onChange={onGaugesChange} />
      <Text className="text-stone text-[11px] -mt-1 mb-1">Live flow, gauge height & water temp from USGS</Text>

      <SwitchRow icon="water" label="Reservoir Levels" hint={reservoirStatus} value={reservoirsOn} onChange={onReservoirsChange} />
      <Text className="text-stone text-[11px] -mt-1 mb-1">Storage, capacity & elevation from USBR & USACE</Text>
      {ridbOn && (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-2">
          {/* SwitchRow's label relies on flex-1 to claim the width left over
              after the Switch — inside a flex-wrap row, an unconstrained
              child has no definite width for that flex-1 to resolve against
              (same class of bug fixed in Modal.tsx's maxHeight), so the
              label collapsed instead of showing. A fixed percentage width
              per item gives it something concrete to measure against. */}
          <View style={{ width: "48%" }}>
            <SwitchRow label="Standard campsites" value={ridbStandard} onChange={onRidbStandardChange} />
          </View>
          <View style={{ width: "48%" }}>
            <SwitchRow label="RV sites only" value={ridbRv} onChange={onRidbRvChange} />
          </View>
          <View style={{ width: "48%" }}>
            <SwitchRow label="Cabins & lodging" value={ridbCabin} onChange={onRidbCabinChange} />
          </View>
          <View style={{ width: "48%" }}>
            <SwitchRow label="First-come, first-served" value={ridbFcfs} onChange={onRidbFcfsChange} />
          </View>
        </View>
      )}

      <View className="mt-5 mb-2">
        <Button title="Done" onPress={onClose} />
      </View>
    </FormModal>
  );
}
