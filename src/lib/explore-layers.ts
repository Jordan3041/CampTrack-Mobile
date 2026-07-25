// Mirrors the third-party GIS layers wired up in CampTrack/js/explore.js.
import type { Region } from "react-native-maps";

export type DumpStation = { lat: number; lng: number; name?: string; fee?: string; access?: string };

export const AGENCY_STYLES = [
  { match: /national park/i, color: "#6D4C33", label: "National Park Service" },
  { match: /forest service/i, color: "#3F8F4F", label: "US Forest Service" },
  { match: /bureau of land management|\bblm\b/i, color: "#C2A66B", label: "Bureau of Land Management" },
  { match: /fish (and|&) wildlife/i, color: "#4A90A4", label: "US Fish & Wildlife Service" },
  { match: /reclamation/i, color: "#3B6FA0", label: "Bureau of Reclamation" },
  { match: /defense|military|army|navy|air force|marine/i, color: "#8A8A8A", label: "Department of Defense" },
];
export const AGENCY_DEFAULT_COLOR = "#9E9E9E";

export function agencyStyle(agencyName?: string) {
  const found = AGENCY_STYLES.find((a) => a.match.test(agencyName || ""));
  if (found) return found;
  return { color: AGENCY_DEFAULT_COLOR, label: agencyName || "Other federal" };
}

const PUBLIC_LANDS_URL = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Federal_Lands/FeatureServer/0/query";
export const PUBLIC_LANDS_MIN_ZOOM_DELTA = 1.4; // roughly zoom >= 8 equivalent in lat delta

export async function fetchPublicLands(region: Region) {
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  const bbox = `${west},${south},${east},${north}`;
  const url =
    `${PUBLIC_LANDS_URL}?where=1=1&outFields=Agency,unit_name,Shape__Area,link` +
    `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects&outSR=4326&geometryPrecision=5&f=geojson&resultRecordCount=1000`;
  const res = await fetch(url);
  return res.json();
}

const WILDFIRE_URL = "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query";

export type WildfireIncident = {
  lat: number;
  lng: number;
  name: string;
  typeLabel: string;
  state: string;
  size: number | null;
  contained: number | null;
  discovered: string;
};

export async function fetchWildfires(): Promise<WildfireIncident[]> {
  const fields = "IncidentName,FireDiscoveryDateTime,IncidentSize,PercentContained,IncidentTypeCategory,POOState";
  const url = `${WILDFIRE_URL}?where=1%3D1&outFields=${fields}&f=json&resultRecordCount=2000`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "CampTrack couldn't load wildfire data.");
  if (!data.features) throw new Error("Unexpected response from the wildfire service.");

  const typeLabels: Record<string, string> = { WF: "Wildfire", RX: "Prescribed fire", CX: "Incident complex" };
  return data.features
    .filter((f: any) => f.geometry && f.geometry.x != null && f.geometry.y != null)
    .map((f: any) => {
      const p = f.attributes || {};
      return {
        lat: f.geometry.y,
        lng: f.geometry.x,
        name: p.IncidentName || "Unnamed incident",
        typeLabel: typeLabels[p.IncidentTypeCategory] || "Wildfire",
        state: p.POOState ? String(p.POOState).replace(/^US-/, "") : "",
        size: p.IncidentSize != null ? p.IncidentSize : null,
        contained: p.PercentContained != null ? p.PercentContained : null,
        discovered: p.FireDiscoveryDateTime ? new Date(p.FireDiscoveryDateTime).toLocaleDateString() : "",
      };
    });
}
