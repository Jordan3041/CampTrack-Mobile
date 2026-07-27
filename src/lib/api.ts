// The public data layer every screen imports — mirrors CampTrack/js/
// storage.js CT.*. Auth, Explore/Map data, admin, activities, and the
// assistant are re-exported straight from lib/rawApi.ts (network-only,
// same as before). Campsites, trips, maintenance, reminders, packing
// template, settings, and rig additionally go through a local cache +
// mutation queue (src/lib/offline/) so they keep working offline and
// resync automatically once the connection comes back — see
// src/lib/offline/sync.ts for the "mobile wins" replay logic.
import * as rawApi from "./rawApi";
import {
  deleteFromCollectionWithOffline,
  fetchCollectionWithOffline,
  fetchSingletonWithOffline,
  saveInCollectionWithOffline,
  saveSingletonWithOffline,
} from "./offline/helpers";

/* ---------- re-exported unchanged (network-only) ---------- */
export {
  // session
  getToken,
  resolvePhotoUrl,
  currentUser,
  currentFirstName,
  currentIsAdmin,
  currentIsVerified,
  currentCanDeleteUsers,
  setSession,
  clearSession,
  updateCachedVerified,
  updateCachedCanDeleteUsers,
  ApiError,
  NetworkUnavailableError,
  SessionExpiredError,
  // auth
  register,
  login,
  loginWithGoogle,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  deleteAccount,
  // campsite sharing/cloning (already network-required — clone needs a live lookup of the source)
  cloneCampsite,
  getSharedCampsite,
  // trip AI suggestions (always needs a live Gemini call)
  getTripSuggestions,
  // explore/map data
  getPublicCampsites,
  getPublicProfile,
  getCampflareCampgrounds,
  getCampflareCampground,
  getCampflareCampsites,
  getRidbCampgrounds,
  // admin
  adminGetUsers,
  adminGetUser,
  adminSetIsAdmin,
  adminSendResetLink,
  adminForceReset,
  adminSetCanDeleteUsers,
  adminDeleteUser,
  adminGetIntegrations,
  adminSyncIntegration,
  getAppInfo,
  adminSetAppVersion,
  adminDownloadUsersCsvUrl,
  // activities
  searchFishingGauges,
  getFishingGauge,
  getNearbyTrails,
  getNearbyMotorizedTrails,
  getNearbyBikeRoutes,
  // assistant
  assistantEnabled,
  assistantChat,
  // misc
  uid,
} from "./rawApi";

export type {
  Me,
  Campsite,
  PackingItem,
  Trip,
  TripSuggestion,
  MaintenanceRecord,
  MaintenanceReminder,
  RidbCampground,
  IntegrationStatus,
  FishingGauge,
  GaugeReading,
  Trail,
  TrailResult,
  Settings,
  Rig,
  AssistantMessage,
  PublicProfile,
} from "./rawApi";

/* ---------- campsites (offline-capable) ---------- */
export function getCampsites() {
  return fetchCollectionWithOffline("campsites", rawApi.networkGetCampsites);
}
export function saveCampsite(site: rawApi.Campsite) {
  return saveInCollectionWithOffline("campsites", site, !site.id, rawApi.networkCreateCampsite, rawApi.networkUpdateCampsite);
}
export function deleteCampsite(id: string) {
  return deleteFromCollectionWithOffline("campsites", id, rawApi.networkDeleteCampsite);
}

/* ---------- trips (offline-capable) ---------- */
export function getTrips() {
  return fetchCollectionWithOffline("trips", rawApi.networkGetTrips);
}
export async function saveTrip(trip: rawApi.Trip) {
  // A brand-new trip needs its packing list seeded from the template up
  // front, same as the server would — otherwise a trip created offline
  // would sit with an empty packing list until it eventually syncs.
  let record = trip;
  if (!record.id && !record.packing) {
    const template = await getPackingTemplate();
    record = { ...record, packing: template.map((text) => ({ id: rawApi.uid(), text, packed: false })) };
  }
  return saveInCollectionWithOffline("trips", record, !trip.id, rawApi.networkCreateTrip, rawApi.networkUpdateTrip);
}
export function deleteTrip(id: string) {
  return deleteFromCollectionWithOffline("trips", id, rawApi.networkDeleteTrip);
}

/* ---------- packing template (offline-capable) ---------- */
export function getPackingTemplate() {
  return fetchSingletonWithOffline("packingTemplate", [] as string[], rawApi.networkGetPackingTemplate);
}
export function savePackingTemplate(items: string[]) {
  return saveSingletonWithOffline("packingTemplate", items, rawApi.networkSavePackingTemplate);
}

/* ---------- maintenance (offline-capable) ---------- */
export function getMaintenance() {
  return fetchCollectionWithOffline("maintenance", rawApi.networkGetMaintenance);
}
export function saveMaintenance(rec: rawApi.MaintenanceRecord) {
  return saveInCollectionWithOffline("maintenance", rec, !rec.id, rawApi.networkCreateMaintenance, rawApi.networkUpdateMaintenance);
}
export function deleteMaintenance(id: string) {
  return deleteFromCollectionWithOffline("maintenance", id, rawApi.networkDeleteMaintenance);
}

/* ---------- maintenance reminders (offline-capable) ---------- */
export function getMaintenanceReminders() {
  return fetchCollectionWithOffline("reminders", rawApi.networkGetMaintenanceReminders);
}
export function saveMaintenanceReminder(reminder: rawApi.MaintenanceReminder) {
  return saveInCollectionWithOffline(
    "reminders",
    reminder,
    !reminder.id,
    rawApi.networkCreateMaintenanceReminder,
    rawApi.networkUpdateMaintenanceReminder
  );
}
export function deleteMaintenanceReminder(id: string) {
  return deleteFromCollectionWithOffline("reminders", id, rawApi.networkDeleteMaintenanceReminder);
}

/* ---------- settings (offline-capable) ---------- */
const DEFAULT_SETTINGS: rawApi.Settings = { tempUnit: "F", distanceUnit: "mi", weekStart: "sunday", showPastInCalendar: true };
export function getSettings() {
  return fetchSingletonWithOffline("settings", DEFAULT_SETTINGS, rawApi.networkGetSettings);
}
export async function saveSettings(settings: Partial<rawApi.Settings>) {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  return saveSingletonWithOffline("settings", merged, rawApi.networkSaveSettings);
}

/* ---------- rig (offline-capable) ---------- */
const DEFAULT_RIG: rawApi.Rig = { vehicleType: "", rvLength: "", rvMake: "", rvModel: "", rvYear: "", rvAmpService: "", features: [] };
export function getRig() {
  return fetchSingletonWithOffline("rig", DEFAULT_RIG, rawApi.networkGetRig);
}
export function saveRig(rig: rawApi.Rig) {
  return saveSingletonWithOffline("rig", rig, rawApi.networkSaveRig);
}
