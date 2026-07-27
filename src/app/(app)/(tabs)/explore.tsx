import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MapView, { Callout, Geojson, Marker, Region } from "react-native-maps";

import dumpStationsData from "@/assets/data/dump-stations.json";
import { FilterSheet, DEFAULT_FILTERS, ExploreFilters } from "@/components/explore/FilterSheet";
import { MapLegend } from "@/components/explore/MapLegend";
import { SiteDetailSheet } from "@/components/explore/SiteDetailSheet";
import { StatsStrip } from "@/components/explore/StatsStrip";
import { Button } from "@/components/ui/Button";
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

  function onRegionChangeComplete(r: Region) {
    setRegion(r);
    if (landsOn) refreshPublicLands(r);
    if (ridbOn) refreshRidb(r);
  }

  useEffect(() => {
    if (ridbOn) refreshRidb(region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ridbStandard, ridbRv, ridbCabin, ridbFcfs]);

  const legendEntries = useMemo(() => {
    const entries: { color: string; label: string }[] = [{ color: "#5BD46B", label: "Public campsites" }];
    if (dumpOn) entries.push({ color: "#8a6d3b", label: "Dump stations" });
    if (wildfireOn) entries.push({ color: "#C0392B", label: "Active wildfires" });
    if (ridbOn) entries.push({ color: "#3B6FA0", label: "Federal campgrounds" });
    return entries;
  }, [dumpOn, wildfireOn, ridbOn]);

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
      <View className="pt-3">
        <StatsStrip sites={allSites} />
      </View>

      <View className="flex-row gap-2 px-4 py-3">
        <Button title="Filters" variant="ghost" size="sm" onPress={() => setFiltersOpen(true)} />
        <Button title="Map layers" variant="ghost" size="sm" onPress={() => setLayersOpen(true)} />
        <Text className="text-stone text-xs flex-1 text-right self-center" numberOfLines={1}>
          {count}
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={onRegionChangeComplete}>
        {filteredSites
          .filter((s) => s.lat && s.lng)
          .map((s) => (
            <Marker
              key={s.id}
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
      </MapView>

      <MapLegend entries={legendEntries} />

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
