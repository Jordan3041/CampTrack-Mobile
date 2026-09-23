import React from "react";
import { Text, View } from "react-native";

import { reservoirFillColor } from "@/components/explore/ReservoirMarker";
import { FormModal } from "@/components/ui/Modal";
import * as api from "@/lib/api";
import { timeAgo } from "@/lib/dates";

const AGENCY_LABEL: Record<api.Reservoir["agency"], string> = {
  USBR: "U.S. Bureau of Reclamation",
  USACE: "U.S. Army Corps of Engineers",
  USGS: "U.S. Geological Survey",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-sm border border-line bg-white/[0.03] p-3">
      <Text className="text-stone text-[11px] font-body-semibold uppercase tracking-wide mb-1">{label}</Text>
      <Text className="text-ink text-base font-body-semibold">{value}</Text>
    </View>
  );
}

export function ReservoirDetailSheet({ reservoir, onClose }: { reservoir: api.Reservoir | null; onClose: () => void }) {
  if (!reservoir) return <FormModal visible={false} title="" onClose={onClose}><View /></FormModal>;

  const color = reservoirFillColor(reservoir.percentFull);
  const pct = reservoir.percentFull != null ? Math.max(0, Math.min(100, reservoir.percentFull)) : 0;

  return (
    <FormModal visible={!!reservoir} title={reservoir.name} onClose={onClose}>
      <Text className="text-stone text-xs mb-3">
        {AGENCY_LABEL[reservoir.agency]}
        {reservoir.state ? ` · ${reservoir.state}` : ""}
      </Text>

      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-ink font-body-semibold text-sm">Percent full</Text>
        <Text style={{ color }} className="font-display text-lg">
          {reservoir.percentFull != null ? `${reservoir.percentFull.toFixed(1)}%` : "N/A"}
        </Text>
      </View>
      <View className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
        <View style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full" />
      </View>

      <View className="flex-row gap-2">
        <Stat label="Current storage" value={reservoir.storageAf != null ? `${Math.round(reservoir.storageAf).toLocaleString()} ac-ft` : "N/A"} />
        <Stat label="Max capacity" value={reservoir.capacityAf != null ? `${Math.round(reservoir.capacityAf).toLocaleString()} ac-ft` : "N/A"} />
      </View>
      <View className="mt-2">
        <Stat label="Current elevation" value={reservoir.elevationFt != null ? `${Math.round(reservoir.elevationFt).toLocaleString()} ft MSL` : "N/A"} />
      </View>

      <Text className="text-stone text-[11px] mt-3">Updated {timeAgo(reservoir.lastUpdated)}</Text>
    </FormModal>
  );
}
