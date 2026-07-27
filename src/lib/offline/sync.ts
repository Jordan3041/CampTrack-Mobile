// Replays the mutation queue against the real API, in order, whenever
// there's a connection. "Mobile wins": queued mutations are simply
// re-sent as-is — no merge, no conflict prompt. The backend accepts a
// client-supplied id and upserts on it (see CampTrack server's
// lib/clientId.js), so a create that already succeeded once is safe to
// resend if the app was killed mid-sync.
import NetInfo from "@react-native-community/netinfo";

import * as rawApi from "@/lib/rawApi";

import { dequeue, getQueue, QueueItem, subscribeQueue } from "./queue";
import { removeFromCollection, setSingleton, upsertInCollection } from "./storage";

export type SyncStatus = "idle" | "syncing" | "offline";
type SyncListener = (status: { status: SyncStatus; pendingCount: number; lastError?: string }) => void;

const listeners = new Set<SyncListener>();
let currentStatus: SyncStatus = "idle";
let currentPending = 0;
let lastError: string | undefined;
let isOnline = true;
let syncing = false;

function emit() {
  listeners.forEach((fn) => fn({ status: currentStatus, pendingCount: currentPending, lastError }));
}

// The banner reflects whether the API is ACTUALLY reachable, not just
// whether the device has a network interface up — a phone can have full
// WiFi bars while the CampTrack server itself is unreachable (down for
// maintenance, a firewall block, etc.), and that should read as "offline"
// too. Called by lib/offline/helpers.ts after every real network attempt;
// NetInfo below is only used as a trigger to retry, not as the source of
// truth for this status.
export function reportNetworkOk() {
  if (!syncing) currentStatus = "idle";
  emit();
}
export function reportNetworkUnreachable() {
  if (!syncing) {
    currentStatus = "offline";
    emit();
  }
}

export function subscribeSyncStatus(fn: SyncListener) {
  listeners.add(fn);
  fn({ status: currentStatus, pendingCount: currentPending, lastError });
  return () => {
    listeners.delete(fn);
  };
}

subscribeQueue((items) => {
  currentPending = items.length;
  emit();
});

async function applyToNetwork(item: QueueItem) {
  switch (item.target) {
    case "campsites":
      if (item.op === "create") return rawApi.networkCreateCampsite(item.payload);
      if (item.op === "update") return rawApi.networkUpdateCampsite(item.payload);
      return rawApi.networkDeleteCampsite(item.id);
    case "trips":
      if (item.op === "create") return rawApi.networkCreateTrip(item.payload);
      if (item.op === "update") return rawApi.networkUpdateTrip(item.payload);
      return rawApi.networkDeleteTrip(item.id);
    case "maintenance":
      if (item.op === "create") return rawApi.networkCreateMaintenance(item.payload);
      if (item.op === "update") return rawApi.networkUpdateMaintenance(item.payload);
      return rawApi.networkDeleteMaintenance(item.id);
    case "reminders":
      if (item.op === "create") return rawApi.networkCreateMaintenanceReminder(item.payload);
      if (item.op === "update") return rawApi.networkUpdateMaintenanceReminder(item.payload);
      return rawApi.networkDeleteMaintenanceReminder(item.id);
    case "settings":
      return rawApi.networkSaveSettings(item.payload);
    case "rig":
      return rawApi.networkSaveRig(item.payload);
    case "packingTemplate":
      return rawApi.networkSavePackingTemplate(item.payload);
  }
}

// After a queued create/update succeeds, the server's response (which may
// normalize fields) becomes the new local cache entry for that record.
async function reconcileLocal(item: QueueItem, serverResult: any) {
  if (item.target === "settings" || item.target === "rig" || item.target === "packingTemplate") {
    if (item.op !== "delete") await setSingleton(item.target, serverResult ?? item.payload);
    return;
  }
  if (item.op === "delete") {
    await removeFromCollection(item.target, item.id);
  } else {
    await upsertInCollection(item.target, serverResult ?? item.payload);
  }
}

// Processes the queue strictly FIFO, one item at a time — preserves
// causal ordering (e.g. a campsite created offline syncs before a trip
// that references its id, since the id is stable client-side regardless,
// but ordering still keeps things predictable and easy to reason about).
export async function processQueue() {
  if (syncing) return;
  syncing = true;
  currentStatus = "syncing";
  lastError = undefined;
  emit();

  try {
    let queue = await getQueue();
    while (queue.length) {
      const item = queue[0];
      try {
        const result = await applyToNetwork(item);
        await reconcileLocal(item, result);
        await dequeue(item.target, item.id);
      } catch (e: any) {
        if (e instanceof rawApi.NetworkUnavailableError) {
          // Connection dropped mid-sync — stop for now, the rest stays
          // queued and this same item is retried on the next pass.
          currentStatus = "offline";
          emit();
          return;
        }
        // A real server-side error (validation, etc.) — this item can
        // never succeed as-is. Drop it rather than blocking everything
        // behind it forever, but surface that something was lost.
        lastError = `Couldn't sync a change: ${e.message || "unknown error"}`;
        await dequeue(item.target, item.id);
      }
      queue = await getQueue();
    }
    currentStatus = "idle";
  } finally {
    syncing = false;
    emit();
  }
}

let unsubscribeNetInfo: (() => void) | null = null;

export function startSyncEngine() {
  if (unsubscribeNetInfo) return; // already running
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const nowOnline = !!state.isConnected && state.isInternetReachable !== false;
    if (nowOnline && !isOnline) {
      // The device's network interface just came back — worth trying to
      // drain the queue. Also clears the banner immediately rather than
      // waiting for the next screen to make a network call, since a
      // reconnect with nothing queued would otherwise never touch the API.
      reportNetworkOk();
      processQueue();
    } else if (!nowOnline && isOnline) {
      // Surfaces a device-level disconnect (airplane mode, no signal, etc.)
      // right away, without waiting for something to actually try — and
      // still, this is only ever a secondary signal: reportNetworkOk()/
      // Unreachable() driven by real API call outcomes (see above) are
      // what the banner ultimately trusts, since the device can read
      // "connected" while the API itself isn't actually reachable.
      reportNetworkUnreachable();
    }
    isOnline = nowOnline;
  });
}

export function stopSyncEngine() {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
}

export function getIsOnline() {
  return isOnline;
}
