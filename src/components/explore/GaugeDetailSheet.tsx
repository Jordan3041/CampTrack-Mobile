import React, { useState } from "react";
import { Text, View } from "react-native";

import { GaugeHistoryChart } from "@/components/explore/GaugeHistoryChart";
import { Button } from "@/components/ui/Button";
import { Icon, IconName } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { GaugeReading } from "@/lib/usgs";

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string | null }) {
  return (
    <View className="flex-1 rounded-sm border border-line bg-white/[0.03] p-3">
      <View className="flex-row items-center gap-1.5 mb-1.5">
        <Icon name={icon} size={14} color="#9BA69C" />
        <Text className="text-stone text-[11px] font-body-semibold uppercase tracking-wide">{label}</Text>
      </View>
      <Text className={value ? "text-ink text-base font-body-semibold" : "text-stone text-sm"}>{value ?? "N/A"}</Text>
    </View>
  );
}

// Tapping a stream gauge marker opens this — current-conditions summary
// plus a way into the historical flow chart. Reuses FormModal (same
// pattern as SiteDetailSheet) rather than a real bottom-sheet primitive —
// no bottom-sheet library exists in this project.
export function GaugeDetailSheet({ gauge, onClose }: { gauge: GaugeReading | null; onClose: () => void }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!gauge) return <FormModal visible={false} title="" onClose={onClose}><View /></FormModal>;

  return (
    <>
      <FormModal visible={!historyOpen} title={gauge.siteName} onClose={onClose}>
        <Text className="text-stone text-xs mb-3">Site {gauge.siteCode.replace(/^USGS-/, "")}</Text>

        <View className="flex-row gap-2">
          <Stat icon="water" label="Flow" value={gauge.flowCfs != null ? `${gauge.flowCfs.toFixed(0)} cfs` : null} />
          <Stat icon="gauge" label="Gauge height" value={gauge.gaugeHeightFt != null ? `${gauge.gaugeHeightFt.toFixed(2)} ft` : null} />
        </View>
        <View className="mt-2">
          <Stat icon="thermometer" label="Water temp" value={gauge.waterTempF != null ? `${gauge.waterTempF.toFixed(0)}°F` : null} />
        </View>

        {gauge.measuredAt ? (
          <Text className="text-stone text-[11px] mt-3">Last measured {new Date(gauge.measuredAt).toLocaleString()}</Text>
        ) : null}

        <View className="flex-row justify-end gap-2 mt-5 mb-2">
          <Button title="Close" variant="ghost" onPress={onClose} />
          <Button title="View flow history" icon="chevronRight" onPress={() => setHistoryOpen(true)} />
        </View>
      </FormModal>

      <GaugeHistoryChart visible={historyOpen} siteCode={gauge.siteCode} siteName={gauge.siteName} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
