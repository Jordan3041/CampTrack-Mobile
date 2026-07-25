// The mutation queue: every write made while offline (or that fails due to
// no connectivity) lands here instead of being lost, and gets replayed in
// order once the connection comes back. Collapses redundant ops for a
// record that hasn't synced yet at all, so e.g. editing something twice
// before ever going online sends one create, not a create-then-update.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CollectionName, SingletonName } from "./storage";

export type QueueOp = "create" | "update" | "delete";
export type QueueTarget = CollectionName | SingletonName;

export type QueueItem = {
  id: string; // record id for collections; the singleton name itself for settings/rig/packingTemplate
  target: QueueTarget;
  op: QueueOp;
  payload?: any;
  enqueuedAt: string;
};

let currentUsername: string | null = null;
const listeners = new Set<(items: QueueItem[]) => void>();

export function setQueueUser(username: string | null) {
  currentUsername = username;
}

function key() {
  return `ct_offline_${currentUsername || "anon"}_queue`;
}

export function subscribeQueue(fn: (items: QueueItem[]) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function notify(items: QueueItem[]) {
  listeners.forEach((fn) => fn(items));
}

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(key());
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveQueue(items: QueueItem[]) {
  await AsyncStorage.setItem(key(), JSON.stringify(items));
  await notify(items);
}

// Singletons (settings/rig/packingTemplate) only ever need their latest
// value synced — always collapse to a single queued "update" per target.
const SINGLETON_TARGETS = new Set(["settings", "rig", "packingTemplate"]);

export async function enqueue(item: Omit<QueueItem, "enqueuedAt">) {
  const items = await getQueue();

  if (SINGLETON_TARGETS.has(item.target)) {
    const next = items.filter((i) => i.target !== item.target);
    next.push({ ...item, enqueuedAt: new Date().toISOString() });
    await saveQueue(next);
    return;
  }

  const pendingIdx = items.findIndex((i) => i.target === item.target && i.id === item.id);
  if (pendingIdx === -1) {
    items.push({ ...item, enqueuedAt: new Date().toISOString() });
    await saveQueue(items);
    return;
  }

  const pending = items[pendingIdx];
  if (pending.op === "create") {
    if (item.op === "delete") {
      // Created and deleted before ever syncing — nothing to tell the
      // server at all, the record never existed there.
      items.splice(pendingIdx, 1);
    } else {
      // Still-unsynced create — fold the newer payload into it rather than
      // queuing a separate update behind it.
      items[pendingIdx] = { ...pending, payload: item.payload, enqueuedAt: pending.enqueuedAt };
    }
  } else if (pending.op === "update") {
    if (item.op === "delete") {
      items[pendingIdx] = { ...item, enqueuedAt: pending.enqueuedAt };
    } else {
      items[pendingIdx] = { ...pending, payload: item.payload };
    }
  } else {
    // pending.op === "delete" — a later create/update after a queued
    // delete (e.g. undo) just replaces it outright.
    items[pendingIdx] = { ...item, enqueuedAt: pending.enqueuedAt };
  }
  await saveQueue(items);
}

export async function dequeue(target: QueueTarget, id: string) {
  const items = await getQueue();
  await saveQueue(items.filter((i) => !(i.target === target && i.id === id)));
}

export async function pendingCount(): Promise<number> {
  return (await getQueue()).length;
}

export async function getQueueForTarget(target: QueueTarget): Promise<QueueItem[]> {
  return (await getQueue()).filter((i) => i.target === target);
}
