// Custom campsite folders/groups — a device-local organizational layer on
// top of the campsites collection. There's no server concept of a "group"
// (it's purely a personal way to declutter the list), so this lives in the
// same per-user AsyncStorage store as settings/rig/packingTemplate rather
// than going through the offline mutation queue — nothing here needs to
// sync anywhere.
import { getLocalValue, setLocalValue } from "./offline/storage";
import { uid } from "./rawApi";

export type CampsiteGroup = { id: string; name: string; siteIds: string[] };

const KEY = "campsiteGroups";

export function getCampsiteGroups(): Promise<CampsiteGroup[]> {
  return getLocalValue<CampsiteGroup[]>(KEY, []);
}

export async function createCampsiteGroup(name: string): Promise<CampsiteGroup[]> {
  const groups = await getCampsiteGroups();
  const next = [...groups, { id: uid(), name: name.trim(), siteIds: [] }];
  await setLocalValue(KEY, next);
  return next;
}

export async function renameCampsiteGroup(id: string, name: string): Promise<CampsiteGroup[]> {
  const groups = await getCampsiteGroups();
  const next = groups.map((g) => (g.id === id ? { ...g, name: name.trim() } : g));
  await setLocalValue(KEY, next);
  return next;
}

// Deleting a group just dissolves it — its sites fall back to "ungrouped"
// rather than being deleted themselves.
export async function deleteCampsiteGroup(id: string): Promise<CampsiteGroup[]> {
  const groups = await getCampsiteGroups();
  const next = groups.filter((g) => g.id !== id);
  await setLocalValue(KEY, next);
  return next;
}

// A site belongs to at most one group — assigning it to a new one removes
// it from whichever group it was previously in. Passing groupId=null moves
// it back to "ungrouped".
export async function assignCampsiteToGroup(siteId: string, groupId: string | null): Promise<CampsiteGroup[]> {
  const groups = await getCampsiteGroups();
  const next = groups.map((g) => ({
    ...g,
    siteIds: g.id === groupId ? [...g.siteIds.filter((id) => id !== siteId), siteId] : g.siteIds.filter((id) => id !== siteId),
  }));
  await setLocalValue(KEY, next);
  return next;
}
