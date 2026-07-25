// Generic offline-wrapping helpers — the "try the network, fall back to
// local cache/queue only on NetworkUnavailableError" pattern, written once
// and reused for every offline-capable domain in lib/api.ts. A real
// server-side error (validation, etc.) always propagates normally; only a
// genuine connectivity failure triggers the offline path.
import { NetworkUnavailableError, uid } from "@/lib/rawApi";

import { enqueue, getQueueForTarget, pendingCount, QueueItem } from "./queue";
import { processQueue, reportNetworkOk, reportNetworkUnreachable } from "./sync";
import { CollectionName, getCollection, getSingleton, removeFromCollection, setCollection, setSingleton, SingletonName, upsertInCollection } from "./storage";

// A successful network call proves the server's reachable right now — even
// if NetInfo never saw a connectivity state change (e.g. the phone's WiFi
// was "up" the whole time but this specific server had briefly restarted).
// Fire-and-forget: never lets draining the queue slow down or fail the
// call that triggered it.
function onNetworkSuccess() {
  reportNetworkOk();
  pendingCount()
    .then((n) => {
      if (n > 0) processQueue();
    })
    .catch(() => {});
}

function applyPending<T extends { id?: string }>(fresh: T[], pending: QueueItem[]): T[] {
  let merged = fresh;
  for (const p of pending) {
    if (p.op === "delete") {
      merged = merged.filter((r) => r.id !== p.id);
    } else {
      const idx = merged.findIndex((r) => r.id === p.id);
      if (idx === -1) merged = [...merged, p.payload];
      else merged = merged.map((r, i) => (i === idx ? p.payload : r));
    }
  }
  return merged;
}

// GET a collection: fetch fresh from the network, re-apply anything still
// queued (so a change made moments ago doesn't visually vanish before the
// queue has a chance to drain), and cache the result. Falls back to
// whatever's cached locally if the network's unreachable.
export async function fetchCollectionWithOffline<T extends { id?: string }>(
  target: CollectionName,
  networkFetch: () => Promise<T[]>
): Promise<T[]> {
  try {
    const fresh = await networkFetch();
    const pending = await getQueueForTarget(target);
    const merged = pending.length ? applyPending(fresh, pending) : fresh;
    await setCollection(target, merged);
    onNetworkSuccess();
    return merged;
  } catch (e) {
    if (e instanceof NetworkUnavailableError) {
      reportNetworkUnreachable();
      return getCollection<T>(target);
    }
    throw e;
  }
}

// Create or update a record in a collection. `record.id` is always
// present by the time this runs (generated client-side up front if it's a
// new record) — that's what lets an offline-created record keep the same
// id all the way through sync instead of needing a remap later.
export async function saveInCollectionWithOffline<T extends { id?: string }>(
  target: CollectionName,
  record: T,
  isCreate: boolean,
  networkCreate: (r: T) => Promise<T>,
  networkUpdate: (r: T) => Promise<T>
): Promise<T> {
  const withId = record.id ? record : { ...record, id: uid() };
  try {
    const result = isCreate ? await networkCreate(withId) : await networkUpdate(withId);
    await upsertInCollection(target, result);
    onNetworkSuccess();
    return result;
  } catch (e) {
    if (e instanceof NetworkUnavailableError) {
      reportNetworkUnreachable();
      await upsertInCollection(target, withId);
      await enqueue({ id: withId.id!, target, op: isCreate ? "create" : "update", payload: withId });
      return withId;
    }
    throw e;
  }
}

export async function deleteFromCollectionWithOffline(
  target: CollectionName,
  id: string,
  networkDelete: (id: string) => Promise<any>
): Promise<{ ok: true }> {
  try {
    const result = await networkDelete(id);
    await removeFromCollection(target, id);
    onNetworkSuccess();
    return result;
  } catch (e) {
    if (e instanceof NetworkUnavailableError) {
      reportNetworkUnreachable();
      await removeFromCollection(target, id);
      await enqueue({ id, target, op: "delete" });
      return { ok: true };
    }
    throw e;
  }
}

/* ---------- singletons: settings, rig, packing template ---------- */
export async function fetchSingletonWithOffline<T>(target: SingletonName, fallback: T, networkFetch: () => Promise<T>): Promise<T> {
  try {
    const fresh = await networkFetch();
    await setSingleton(target, fresh);
    onNetworkSuccess();
    return fresh;
  } catch (e) {
    if (e instanceof NetworkUnavailableError) {
      reportNetworkUnreachable();
      return getSingleton(target, fallback);
    }
    throw e;
  }
}

export async function saveSingletonWithOffline<T>(target: SingletonName, value: T, networkSave: (v: T) => Promise<T>): Promise<T> {
  try {
    const result = await networkSave(value);
    await setSingleton(target, result);
    onNetworkSuccess();
    return result;
  } catch (e) {
    if (e instanceof NetworkUnavailableError) {
      reportNetworkUnreachable();
      await setSingleton(target, value);
      await enqueue({ id: target, target, op: "update", payload: value });
      return value;
    }
    throw e;
  }
}
