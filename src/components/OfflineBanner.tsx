import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { setQueueUser } from "@/lib/offline/queue";
import { setStorageUser } from "@/lib/offline/storage";
import { startSyncEngine, subscribeSyncStatus, SyncStatus } from "@/lib/offline/sync";
import { useAuth } from "@/lib/auth";

// A thin top banner, shown only when there's something worth telling the
// user about: offline with changes pending, or actively syncing. Silent
// (renders nothing) once everything's caught up — most of the time nobody
// should notice this exists at all.
export function OfflineBanner() {
  const { session } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setStorageUser(session?.username || null);
    setQueueUser(session?.username || null);
    startSyncEngine();
  }, [session?.username]);

  useEffect(() => {
    return subscribeSyncStatus(({ status: s, pendingCount: p }) => {
      setStatus(s);
      setPendingCount(p);
    });
  }, []);

  if (status === "idle" && pendingCount === 0) return null;

  const offline = status === "offline";
  const label = offline
    ? pendingCount > 0
      ? `Offline — ${pendingCount} change${pendingCount === 1 ? "" : "s"} will sync automatically`
      : "Offline — showing your last saved data"
    : `Syncing ${pendingCount} change${pendingCount === 1 ? "" : "s"}…`;

  return (
    <View className={`flex-row items-center gap-2 px-4 py-2 ${offline ? "bg-amber-deep" : "bg-lime"}`}>
      <Icon name={offline ? "warning" : "sync"} size={14} color="#0B0F0B" />
      <Text className="text-[#0B0F0B] text-xs font-body-semibold flex-1">{label}</Text>
    </View>
  );
}
