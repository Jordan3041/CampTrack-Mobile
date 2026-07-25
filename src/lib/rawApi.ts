// The network-only layer — every function here always hits the real API,
// no local cache or queue involved. lib/api.ts is the public surface every
// screen imports; it re-exports the functions below unchanged for
// endpoints that only make sense online (auth, Explore/Map data, admin,
// activities, the assistant), and additionally wraps the offline-capable
// domains (campsites, trips, maintenance, reminders, packing template,
// settings, rig) with a local cache + mutation queue defined in
// src/lib/offline/. This file is what src/lib/offline/sync.ts replays
// queued mutations against — kept import-free of api.ts/offline/* so
// there's no circular dependency between the two layers.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { CT_CONFIG } from "./config";

const TOKEN_KEY = "ct_token";
const USER_KEY = "ct_username";
const FIRST_NAME_KEY = "ct_first_name";
const IS_ADMIN_KEY = "ct_is_admin";
const IS_VERIFIED_KEY = "ct_is_verified";
const CAN_DELETE_USERS_KEY = "ct_can_delete_users";

export function apiBase() {
  // Android emulator loopback quirk — real devices/iOS use the same host.
  if (__DEV__ && Platform.OS === "android") return CT_CONFIG.LOCAL_API_BASE.replace("localhost", "10.0.2.2");
  if (__DEV__) return CT_CONFIG.LOCAL_API_BASE;
  return CT_CONFIG.API_BASE;
}

async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}
async function setItem(key: string, value: string) {
  return SecureStore.setItemAsync(key, value);
}
async function deleteItem(key: string) {
  return SecureStore.deleteItemAsync(key);
}

export async function getToken() {
  return getItem(TOKEN_KEY);
}
export async function currentUser() {
  return getItem(USER_KEY);
}
export async function currentFirstName() {
  return (await getItem(FIRST_NAME_KEY)) || "";
}
export async function currentIsAdmin() {
  return (await getItem(IS_ADMIN_KEY)) === "1";
}
export async function currentIsVerified() {
  return (await getItem(IS_VERIFIED_KEY)) === "1";
}
export async function currentCanDeleteUsers() {
  return (await getItem(CAN_DELETE_USERS_KEY)) === "1";
}

export async function setSession(
  username: string,
  token: string,
  firstName?: string,
  isAdmin?: boolean,
  isVerified?: boolean,
  canDeleteUsers?: boolean
) {
  await setItem(USER_KEY, username);
  await setItem(TOKEN_KEY, token);
  if (firstName !== undefined) await setItem(FIRST_NAME_KEY, firstName || "");
  if (isAdmin !== undefined) await setItem(IS_ADMIN_KEY, isAdmin ? "1" : "0");
  if (isVerified !== undefined) await setItem(IS_VERIFIED_KEY, isVerified ? "1" : "0");
  if (canDeleteUsers !== undefined) await setItem(CAN_DELETE_USERS_KEY, canDeleteUsers ? "1" : "0");
}

export async function clearSession() {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
  await deleteItem(FIRST_NAME_KEY);
  await deleteItem(IS_ADMIN_KEY);
  await deleteItem(IS_VERIFIED_KEY);
  await deleteItem(CAN_DELETE_USERS_KEY);
}

export async function updateCachedVerified(isVerified: boolean) {
  await setItem(IS_VERIFIED_KEY, isVerified ? "1" : "0");
}
export async function updateCachedCanDeleteUsers(canDeleteUsers: boolean) {
  await setItem(CAN_DELETE_USERS_KEY, canDeleteUsers ? "1" : "0");
}

export class ApiError extends Error {}

// Thrown specifically for "the request never reached the server" — this is
// the signal the offline layer in lib/api.ts watches for to decide whether
// to fall back to the local cache / queue a mutation, as opposed to a real
// server-side error (bad input, 404, etc.) which should surface as normal.
export class NetworkUnavailableError extends ApiError {}

export class SessionExpiredError extends ApiError {}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as any) };
  const token = await getToken();
  if (token) headers.Authorization = "Bearer " + token;

  let res: Response;
  try {
    res = await fetch(apiBase() + path, { ...options, headers });
  } catch (e) {
    throw new NetworkUnavailableError("Can't reach the CampTrack server. Is it running?");
  }

  if (res.status === 401 && path !== "/auth/login" && path !== "/auth/register") {
    await clearSession();
    throw new SessionExpiredError("Session expired");
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch (_) {
    /* no body */
  }

  if (!res.ok) throw new ApiError((body && body.error) || "Something went wrong. Try again.");
  return body;
}

/* ---------- auth ---------- */
type AuthResponse = { username: string; token: string; firstName: string; isAdmin: boolean; isVerified: boolean; canDeleteUsers: boolean };

export async function register(username: string, password: string, email: string, firstName: string, lastName: string) {
  const data: AuthResponse = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, email, firstName, lastName }),
  });
  await setSession(data.username, data.token, data.firstName, data.isAdmin, data.isVerified, data.canDeleteUsers);
  return data;
}
export async function login(username: string, password: string) {
  const data: AuthResponse = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  await setSession(data.username, data.token, data.firstName, data.isAdmin, data.isVerified, data.canDeleteUsers);
  return data;
}
export type Me = { username: string; firstName: string; lastName: string; email: string; isAdmin: boolean; isVerified: boolean; canDeleteUsers: boolean };
export function getMe(): Promise<Me> {
  return apiFetch("/auth/me");
}
export function updateProfile(profile: Record<string, unknown>) {
  return apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(profile) });
}
export function forgotPassword(email: string) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}
export function resetPassword(token: string, password: string) {
  return apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}
export function verifyEmail(token: string) {
  return apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}
export function resendVerification(): Promise<{ ok: boolean; alreadyVerified?: boolean; sentTo?: string }> {
  return apiFetch("/auth/resend-verification", { method: "POST" });
}

/* ---------- campsites ---------- */
export type Campsite = {
  id?: string;
  name: string;
  locationType: "gps" | "address" | "name";
  lat?: string;
  lng?: string;
  address?: string;
  locationName?: string;
  state?: string;
  siteType?: string;
  rating?: number;
  hookupPower?: boolean;
  hookupWater?: boolean;
  hookupSewer?: boolean;
  powerAmp?: string;
  notes?: string;
  photos?: string[];
  isPublic?: boolean;
  landAgency?: string;
  landUnitName?: string;
  cellVerizon?: number | null;
  cellTmobile?: number | null;
  cellAtt?: number | null;
  createdAt?: string;
};
export function networkGetCampsites(): Promise<Campsite[]> {
  return apiFetch("/campsites");
}
export function networkCreateCampsite(site: Campsite): Promise<Campsite> {
  return apiFetch("/campsites", { method: "POST", body: JSON.stringify(site) });
}
export function networkUpdateCampsite(site: Campsite): Promise<Campsite> {
  return apiFetch(`/campsites/${site.id}`, { method: "PUT", body: JSON.stringify(site) });
}
export function networkDeleteCampsite(id: string) {
  return apiFetch(`/campsites/${id}`, { method: "DELETE" });
}
export function cloneCampsite(id: string): Promise<Campsite> {
  return apiFetch(`/campsites/${id}/clone`, { method: "POST" });
}

/* ---------- shared campsite link (public, read-only) ---------- */
export function getSharedCampsite(id: string): Promise<Campsite> {
  return apiFetch(`/shared/campsite/${encodeURIComponent(id)}`);
}

/* ---------- trips ---------- */
export type PackingItem = { id: string; text: string; packed: boolean };
export type Trip = {
  id?: string;
  title: string;
  start: string;
  end?: string;
  campsiteId?: string | null;
  location?: string;
  notes?: string;
  packing?: PackingItem[];
  createdAt?: string;
};
export function networkGetTrips(): Promise<Trip[]> {
  return apiFetch("/trips");
}
export function networkCreateTrip(trip: Trip): Promise<Trip> {
  return apiFetch("/trips", { method: "POST", body: JSON.stringify(trip) });
}
export function networkUpdateTrip(trip: Trip): Promise<Trip> {
  return apiFetch(`/trips/${trip.id}`, { method: "PUT", body: JSON.stringify(trip) });
}
export function networkDeleteTrip(id: string) {
  return apiFetch(`/trips/${id}`, { method: "DELETE" });
}
export type TripSuggestion = { icon?: string; category?: string; message?: string };
export function getTripSuggestions(tripId: string, weatherForecast: unknown): Promise<{ suggestions: TripSuggestion[] }> {
  return apiFetch(`/trips/${encodeURIComponent(tripId)}/suggestions`, {
    method: "POST",
    body: JSON.stringify({ weatherForecast }),
  });
}

/* ---------- packing template ---------- */
export function networkGetPackingTemplate(): Promise<string[]> {
  return apiFetch("/packing-template");
}
export function networkSavePackingTemplate(items: string[]) {
  return apiFetch("/packing-template", { method: "PUT", body: JSON.stringify({ items }) });
}

/* ---------- maintenance ---------- */
export type MaintenanceRecord = {
  id?: string;
  title: string;
  type: "routine" | "repair";
  date: string;
  cost?: number | "";
  mileage?: string;
  nextDue?: string;
  notes?: string;
  attachments?: { url: string; name: string }[];
  createdAt?: string;
};
export function networkGetMaintenance(): Promise<MaintenanceRecord[]> {
  return apiFetch("/maintenance");
}
export function networkCreateMaintenance(rec: MaintenanceRecord): Promise<MaintenanceRecord> {
  return apiFetch("/maintenance", { method: "POST", body: JSON.stringify(rec) });
}
export function networkUpdateMaintenance(rec: MaintenanceRecord): Promise<MaintenanceRecord> {
  return apiFetch(`/maintenance/${rec.id}`, { method: "PUT", body: JSON.stringify(rec) });
}
export function networkDeleteMaintenance(id: string) {
  return apiFetch(`/maintenance/${id}`, { method: "DELETE" });
}

/* ---------- maintenance reminders (standalone, email-only) ---------- */
export type MaintenanceReminder = {
  id?: string;
  title: string;
  dueDate: string;
  repeatMonths: 0 | 3 | 6 | 12;
  leadDays: 0 | 3 | 7 | 14 | 30;
  notes?: string;
  lastSentAt?: string | null;
  createdAt?: string;
};
export function networkGetMaintenanceReminders(): Promise<MaintenanceReminder[]> {
  return apiFetch("/maintenance/reminders");
}
export function networkCreateMaintenanceReminder(reminder: MaintenanceReminder): Promise<MaintenanceReminder> {
  return apiFetch("/maintenance/reminders", { method: "POST", body: JSON.stringify(reminder) });
}
export function networkUpdateMaintenanceReminder(reminder: MaintenanceReminder): Promise<MaintenanceReminder> {
  return apiFetch(`/maintenance/reminders/${reminder.id}`, { method: "PUT", body: JSON.stringify(reminder) });
}
export function networkDeleteMaintenanceReminder(id: string) {
  return apiFetch(`/maintenance/reminders/${id}`, { method: "DELETE" });
}

/* ---------- public campsites (explore map) ---------- */
export function getPublicCampsites() {
  return apiFetch("/public/campsites");
}
export function getCampflareCampgrounds(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/campflare/campgrounds${qs}`);
}
export function getCampflareCampground(id: string) {
  return apiFetch(`/campflare/campground/${encodeURIComponent(id)}`);
}
export function getCampflareCampsites(campgroundId: string) {
  return apiFetch(`/campflare/campground/${encodeURIComponent(campgroundId)}/campsites`);
}
export type RidbCampground = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stateCode?: string;
  reservable?: boolean;
  stayLimit?: string;
  mapUrl?: string;
  reservationUrl?: string;
  hasStandard?: boolean;
  hasRv?: boolean;
  hasCabin?: boolean;
};
export function getRidbCampgrounds(params?: Record<string, string>): Promise<RidbCampground[]> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/ridb/campgrounds${qs}`);
}

/* ---------- admin ---------- */
export function adminGetUsers(query?: string) {
  const qs = query ? "?q=" + encodeURIComponent(query) : "";
  return apiFetch(`/admin/users${qs}`);
}
export function adminGetUser(id: string) {
  return apiFetch(`/admin/users/${id}`);
}
export function adminSetIsAdmin(id: string, isAdmin: boolean) {
  return apiFetch(`/admin/users/${id}/admin`, { method: "PUT", body: JSON.stringify({ isAdmin }) });
}
export function adminSendResetLink(id: string) {
  return apiFetch(`/admin/users/${id}/send-reset-link`, { method: "POST" });
}
export function adminForceReset(id: string) {
  return apiFetch(`/admin/users/${id}/force-reset`, { method: "POST" });
}
export function adminSetCanDeleteUsers(id: string, canDeleteUsers: boolean) {
  return apiFetch(`/admin/users/${id}/delete-permission`, { method: "PUT", body: JSON.stringify({ canDeleteUsers }) });
}
export function adminDeleteUser(id: string) {
  return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}
export type IntegrationStatus = {
  key: string;
  name: string;
  category: string;
  status: "success" | "failed" | "in_progress" | "never";
  lastAttemptAt?: string | null;
  lastError?: string | null;
  manualSync: boolean;
};
export function adminGetIntegrations(): Promise<IntegrationStatus[]> {
  return apiFetch("/admin/integrations");
}
export function adminSyncIntegration(key: string, state?: string) {
  return apiFetch(`/admin/integrations/${encodeURIComponent(key)}/sync`, {
    method: "POST",
    body: JSON.stringify(state ? { state } : {}),
  });
}
export function getAppInfo(): Promise<{ version: string }> {
  return apiFetch("/app-info");
}
export function adminSetAppVersion(version: string) {
  return apiFetch("/admin/app-version", { method: "PUT", body: JSON.stringify({ version }) });
}
export async function adminDownloadUsersCsvUrl() {
  return `${apiBase()}/admin/users/export`;
}

/* ---------- activities: fishing (USGS gauges) ---------- */
export type FishingGauge = { gaugeId: string; name: string; distanceMiles: number; state: string };
export function searchFishingGauges(bounds: { west: number; south: number; east: number; north: number }): Promise<FishingGauge[]> {
  return apiFetch(`/activities/fishing/search?${new URLSearchParams(bounds as any).toString()}`);
}
export type GaugeReading = {
  gaugeId: string;
  streamflowCfs: number | null;
  waterTempC: number | null;
  waterTempF: number | null;
  gageHeightFt: number | null;
  flowLabel: string | null;
  lastUpdated: string;
};
export function getFishingGauge(gaugeId: string): Promise<GaugeReading> {
  return apiFetch(`/activities/fishing/${encodeURIComponent(gaugeId)}`);
}

/* ---------- activities: hiking / UTV / biking (nearby trails for a campsite) ---------- */
export type Trail = {
  id: string;
  trailName: string;
  distanceMiles?: number;
  vehicleTypes?: string[];
  surface?: string;
  difficultyScale?: string;
  difficultyValue?: number;
  difficultyLabel?: string;
  coordinates: [number, number][];
};
export type TrailResult = { campsiteId: string; lat: number; lng: number; trails: Trail[] };
export function getNearbyTrails(campsiteId: string): Promise<TrailResult> {
  return apiFetch(`/activities/hiking/trails/${encodeURIComponent(campsiteId)}`);
}
export function getNearbyMotorizedTrails(campsiteId: string): Promise<TrailResult> {
  return apiFetch(`/activities/utv/trails/${encodeURIComponent(campsiteId)}`);
}
export function getNearbyBikeRoutes(campsiteId: string): Promise<TrailResult> {
  return apiFetch(`/activities/biking/trails/${encodeURIComponent(campsiteId)}`);
}

/* ---------- settings ---------- */
export type Settings = {
  tempUnit: "F" | "C";
  distanceUnit: "mi" | "km";
  weekStart: "sunday" | "monday";
  showPastInCalendar: boolean;
  hasSeenTutorial?: boolean;
  hasSeenRigSetup?: boolean;
  aiSuggestionsEnabled?: boolean;
};
export function networkGetSettings(): Promise<Settings> {
  return apiFetch("/settings");
}
export function networkSaveSettings(settings: Partial<Settings>): Promise<Settings> {
  return apiFetch("/settings", { method: "PUT", body: JSON.stringify(settings) });
}

/* ---------- rig (vehicle profile) ---------- */
export type Rig = {
  vehicleType: string;
  rvLength: string;
  rvMake: string;
  rvModel: string;
  rvYear: string;
  rvAmpService: "" | "30" | "50";
  features: string[];
};
export function networkGetRig(): Promise<Rig> {
  return apiFetch("/rig");
}
export function networkSaveRig(rig: Rig): Promise<Rig> {
  return apiFetch("/rig", { method: "PUT", body: JSON.stringify(rig) });
}

/* ---------- CampTrack Assistant ---------- */
export function assistantEnabled(): Promise<{ enabled: boolean }> {
  return apiFetch("/assistant/enabled");
}
export type AssistantMessage = { role: "user" | "assistant"; text: string };
export function assistantChat(message: string, history: AssistantMessage[], weather: unknown): Promise<{ reply: string }> {
  return apiFetch("/assistant/chat", { method: "POST", body: JSON.stringify({ message, history, weather }) });
}

/* ---------- misc ---------- */
export function uid() {
  // @ts-ignore — RN 0.86 / Hermes provides crypto.randomUUID
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
