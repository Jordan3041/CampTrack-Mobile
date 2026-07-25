// Local, per-user cache for the offline-capable collections. Namespaced by
// username so switching accounts on the same device never leaks one
// person's cached data into another's session.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CollectionName = "campsites" | "trips" | "maintenance" | "reminders";
export type SingletonName = "settings" | "rig" | "packingTemplate";

let currentUsername: string | null = null;

export function setStorageUser(username: string | null) {
  currentUsername = username;
}

function key(suffix: string) {
  return `ct_offline_${currentUsername || "anon"}_${suffix}`;
}

async function readJson<T>(k: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (_) {
    return fallback;
  }
}
async function writeJson(k: string, value: unknown) {
  await AsyncStorage.setItem(k, JSON.stringify(value));
}

/* ---------- collections (arrays of records with an `id`) ---------- */
export async function getCollection<T extends { id?: string }>(name: CollectionName): Promise<T[]> {
  return readJson(key(name), [] as T[]);
}
export async function setCollection<T extends { id?: string }>(name: CollectionName, items: T[]) {
  await writeJson(key(name), items);
}
export async function upsertInCollection<T extends { id?: string }>(name: CollectionName, item: T) {
  const items = await getCollection<T>(name);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx === -1) items.push(item);
  else items[idx] = item;
  await setCollection(name, items);
  return items;
}
export async function removeFromCollection<T extends { id?: string }>(name: CollectionName, id: string) {
  const items = await getCollection<T>(name);
  const next = items.filter((i) => i.id !== id);
  await setCollection(name, next);
  return next;
}

/* ---------- singletons (settings, rig, packing template) ---------- */
export async function getSingleton<T>(name: SingletonName, fallback: T): Promise<T> {
  return readJson(key(name), fallback);
}
export async function setSingleton(name: SingletonName, value: unknown) {
  await writeJson(key(name), value);
}

/* ---------- wipe on sign-out (not on sync — cache persists across sessions) ---------- */
export async function clearOfflineDataForUser(username: string) {
  const prefix = `ct_offline_${username}_`;
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => k.startsWith(prefix));
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
}
