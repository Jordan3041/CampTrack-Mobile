// Live USGS stream gauge data for the Explore map's "Stream Gauges" layer.
//
// ROOT CAUSE OF THE "no markers" BUG: this originally called the legacy
// waterservices.usgs.gov/nwis/iv and /nwis/dv endpoints (a pattern ported
// from a sibling project where it had been verified live). Diagnosing the
// blank layer live against those exact URLs turned up intermittent HTTP
// 503s and, on repeated attempts, outright connection hangs — the legacy
// NWIS web services are unreliable right now. fetchGauges() swallows any
// failed/non-OK response into an empty array by design (so one bad
// request can't crash the map), which is exactly what made this fail
// *silently*: no error, just zero markers.
//
// The fix: query the modern, actively-maintained USGS Water Data OGC API
// (api.waterdata.usgs.gov) instead — the same API CampTrack's own server
// already relies on for the Activities tab's fishing-gauge search (see
// CampTrack/server/src/services/usgsService.js). Verified live during this
// fix: bbox search, per-site metadata lookup, and both history collections
// below all return clean 200s where the legacy endpoints were failing.
const OGC_BASE = "https://api.waterdata.usgs.gov/ogcapi/v0";
const PARAM_CODES = "00060,00065,00010"; // discharge (cfs), gage height (ft), water temp (°C)

export type GaugeReading = {
  siteCode: string; // full monitoring_location_id, e.g. "USGS-08074540" — not every site is USGS-run (some are "TX071-…" etc), so this is kept unstripped and used as-is for history queries.
  siteName: string;
  lat: number;
  lng: number;
  flowCfs: number | null;
  gaugeHeightFt: number | null;
  waterTempF: number | null;
  measuredAt: string | null;
};

export type GaugeHistoryPoint = { time: Date; value: number };
export type HistoryPeriod = "P7D" | "P30D" | "P365D";

// The legacy service's bbox limit doesn't necessarily apply to the OGC
// API, but the map layer only ever wants a "what's near me" query anyway
// — capping the box keeps queries fast and results relevant regardless.
const MAX_BBOX_DEGREES = 2;

export type MapRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

// Whether the current map viewport is narrow enough to query directly —
// below this, Explore should show a "zoom in" hint instead of either a
// huge, slow request or a result set that only covers some arbitrary
// sub-area of a much larger viewport than what's actually on screen.
export function isRegionQueryable(region: MapRegion): boolean {
  return region.latitudeDelta <= MAX_BBOX_DEGREES && region.longitudeDelta <= MAX_BBOX_DEGREES;
}

export function bboxFromRegion(region: MapRegion): [number, number, number, number] {
  const halfLat = Math.min(region.latitudeDelta, MAX_BBOX_DEGREES) / 2;
  const halfLng = Math.min(region.longitudeDelta, MAX_BBOX_DEGREES) / 2;
  return [region.longitude - halfLng, region.latitude - halfLat, region.longitude + halfLng, region.latitude + halfLat];
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

async function ogcGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ f: "json", ...params }).toString();
  const res = await fetch(`${OGC_BASE}${path}?${qs}`);
  if (!res.ok) throw new Error(`USGS API returned ${res.status}`);
  return res.json();
}

type GaugeAccum = { lat: number; lng: number; flowCfs: number | null; gaugeHeightFt: number | null; waterTempF: number | null; measuredAt: string | null };

// Mirrors searchNearbyGaugesImpl() in the server's usgsService.js: query
// latest-continuous for live readings inside the bbox (guarantees every
// result actually has current data, unlike monitoring-locations which
// includes long-discontinued sites), then a second batched lookup against
// monitoring-locations for each site's display name.
// A gauge whose most recent reading is over a year old is effectively
// inactive/decommissioned (USGS doesn't reliably prune these out of the
// `latest-continuous` collection itself, it just keeps returning
// whatever the last recorded value was) — no point pinning a stale,
// misleading marker on the map for it.
const MAX_GAUGE_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function isWithinLastYear(measuredAt: string | null): boolean {
  if (!measuredAt) return false;
  const t = new Date(measuredAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= MAX_GAUGE_AGE_MS;
}

export async function fetchGauges(bbox: [number, number, number, number]): Promise<GaugeReading[]> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  let data: any;
  try {
    data = await ogcGet("/collections/latest-continuous/items", {
      bbox: [minLng, minLat, maxLng, maxLat].join(","),
      parameter_code: PARAM_CODES,
      limit: "500",
    });
  } catch (_) {
    return [];
  }

  const features = data?.features;
  if (!Array.isArray(features) || !features.length) return [];

  const byLocation = new Map<string, GaugeAccum>();
  for (const f of features) {
    const p = f?.properties;
    const id = p?.monitoring_location_id;
    const coords = f?.geometry?.coordinates;
    if (!id || !coords || p.value == null) continue;
    const num = Number(p.value);
    if (Number.isNaN(num)) continue;

    let g = byLocation.get(id);
    if (!g) {
      g = { lat: coords[1], lng: coords[0], flowCfs: null, gaugeHeightFt: null, waterTempF: null, measuredAt: null };
      byLocation.set(id, g);
    }
    if (p.parameter_code === "00060") g.flowCfs = num;
    else if (p.parameter_code === "00065") g.gaugeHeightFt = num;
    else if (p.parameter_code === "00010") g.waterTempF = celsiusToFahrenheit(num);

    if (!g.measuredAt || p.time > g.measuredAt) g.measuredAt = p.time;
  }
  if (!byLocation.size) return [];

  // Drop stations that haven't reported in over a year before even
  // bothering to look up their names — inactive/decommissioned gauges
  // shouldn't render on the map at all (see MAX_GAUGE_AGE_MS above).
  const ids = [...byLocation.keys()].filter((id) => isWithinLastYear(byLocation.get(id)!.measuredAt));
  if (!ids.length) return [];

  const names = new Map<string, string>();
  try {
    const meta = await ogcGet("/collections/monitoring-locations/items", { id: ids.join(","), limit: String(ids.length) });
    for (const f of meta?.features || []) {
      if (f?.properties?.id) names.set(f.properties.id, f.properties.monitoring_location_name || "");
    }
  } catch (_) {
    // Non-fatal — markers still render with a generic name if this fails.
  }

  return ids.map((id) => {
    const g = byLocation.get(id)!;
    return {
      siteCode: id,
      siteName: names.get(id) || "Unnamed gauge",
      lat: g.lat,
      lng: g.lng,
      flowCfs: g.flowCfs,
      gaugeHeightFt: g.gaugeHeightFt,
      waterTempF: g.waterTempF,
      measuredAt: g.measuredAt,
    };
  });
}

// Dynamic, bbox-driven reservoir storage for the Explore map's "Reservoir
// Levels" layer — fills in the gaps outside the curated, capacity-
// verified list the server caches (see CampTrack server's
// reservoirService.js), which is Western-US-only because capacity isn't
// published live anywhere and had to be hand-verified per reservoir.
// This covers everywhere else (Midwest/East, plus any reservoir west of
// the Mississippi the curated list simply doesn't include yet) using the
// same live, keyless USGS Water Data API the Stream Gauges layer above
// already uses. There's no live capacity figure available for these, so
// percentFull is always null here — the marker/detail sheet already
// render a neutral color and "N/A" for that case.
//
// Three parameter codes, not just one: USGS uses 00054 for most reservoir
// storage sites, but a real Southeast bbox query came back empty on 00054
// alone and only turned up results once 72036 was added too (72022 is a
// third, closely related "Reservoir storage" code, included for the same
// reason) — different sites/districts apparently prefer different codes
// for what's conceptually the same measurement. A site reporting under
// more than one of these just keeps whichever reading is most recent.
//
// Real, structural gap even with all three: sizable stretches of Texas
// and the Southeast (e.g. TVA's reservoir system) came back with zero
// results in bbox tests during this build — those are monitored by
// state/utility systems (Texas Water Development Board, TVA, etc.), not
// USGS, and aren't reachable through this API at all. Nationwide here
// means "everywhere USGS publishes live reservoir storage," not literally
// every reservoir in the country.
const RESERVOIR_STORAGE_PARAMS = "00054,72022,72036";

export type DynamicReservoirReading = {
  siteId: string; // full monitoring_location_id, e.g. "USGS-07190000"
  name: string;
  lat: number;
  lng: number;
  storageAf: number | null;
  measuredAt: string | null;
};

export async function fetchReservoirStorage(bbox: [number, number, number, number]): Promise<DynamicReservoirReading[]> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  let data: any;
  try {
    data = await ogcGet("/collections/latest-continuous/items", {
      bbox: [minLng, minLat, maxLng, maxLat].join(","),
      parameter_code: RESERVOIR_STORAGE_PARAMS,
      limit: "500",
    });
  } catch (_) {
    return [];
  }

  const features = data?.features;
  if (!Array.isArray(features) || !features.length) return [];

  type Accum = { lat: number; lng: number; storageAf: number; measuredAt: string };
  const byLocation = new Map<string, Accum>();
  for (const f of features) {
    const p = f?.properties;
    const id = p?.monitoring_location_id;
    const coords = f?.geometry?.coordinates;
    if (!id || !coords || p.value == null) continue;
    const num = Number(p.value);
    if (Number.isNaN(num)) continue;
    const existing = byLocation.get(id);
    if (!existing || p.time > existing.measuredAt) {
      byLocation.set(id, { lat: coords[1], lng: coords[0], storageAf: num, measuredAt: p.time });
    }
  }
  if (!byLocation.size) return [];

  const ids = [...byLocation.keys()];
  const names = new Map<string, string>();
  try {
    const meta = await ogcGet("/collections/monitoring-locations/items", { id: ids.join(","), limit: String(ids.length) });
    for (const f of meta?.features || []) {
      if (f?.properties?.id) names.set(f.properties.id, f.properties.monitoring_location_name || "");
    }
  } catch (_) {
    // Non-fatal — markers still render with a generic name if this fails.
  }

  return ids.map((id) => {
    const g = byLocation.get(id)!;
    return { siteId: id, name: names.get(id) || "Unnamed reservoir", lat: g.lat, lng: g.lng, storageAf: g.storageAf, measuredAt: g.measuredAt };
  });
}

// Downsamples to a stride so a year-long series doesn't get handed to the
// chart wholesale — a fixed target count keeps the line legible without a
// real charting library's built-in decimation to lean on.
const MAX_CHART_POINTS = 180;

function downsample(points: GaugeHistoryPoint[]): GaugeHistoryPoint[] {
  if (points.length <= MAX_CHART_POINTS) return points;
  const stride = Math.ceil(points.length / MAX_CHART_POINTS);
  return points.filter((_, i) => i % stride === 0);
}

const PERIOD_DAYS: Record<HistoryPeriod, number> = { P7D: 7, P30D: 30, P365D: 365 };

// 7-day/30-day windows read from `continuous` (the ~5-15 min interval
// sensor feed); the year-to-date window reads from `daily` (statistic_id
// 00003 = mean) instead — a year of continuous-interval data would be
// both slow to fetch and mostly noise at chart scale.
export async function fetchGaugeHistory(siteCode: string, period: HistoryPeriod, parameterCd = "00060"): Promise<GaugeHistoryPoint[]> {
  const days = PERIOD_DAYS[period];
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const datetime = `${start.toISOString()}/${end.toISOString()}`;
  const collection = period === "P365D" ? "daily" : "continuous";

  const params: Record<string, string> = {
    monitoring_location_id: siteCode,
    parameter_code: parameterCd,
    datetime,
    limit: "5000",
  };
  if (period === "P365D") params.statistic_id = "00003"; // daily mean

  let data: any;
  try {
    data = await ogcGet(`/collections/${collection}/items`, params);
  } catch (_) {
    return [];
  }

  const points: GaugeHistoryPoint[] = (data?.features || [])
    .map((f: any) => ({ time: new Date(f?.properties?.time), value: Number(f?.properties?.value) }))
    .filter((p: GaugeHistoryPoint) => !Number.isNaN(p.value) && !Number.isNaN(p.time.getTime()))
    .sort((a: GaugeHistoryPoint, b: GaugeHistoryPoint) => a.time.getTime() - b.time.getTime());

  return downsample(points);
}
