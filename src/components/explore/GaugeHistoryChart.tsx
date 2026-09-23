import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";

import { GAUGE_COLOR } from "@/components/explore/GaugeMarker";
import { FormModal } from "@/components/ui/Modal";
import { fetchGaugeHistory, GaugeHistoryPoint, HistoryPeriod } from "@/lib/usgs";

const PERIODS: { key: HistoryPeriod; label: string }[] = [
  { key: "P7D", label: "7 Days" },
  { key: "P30D", label: "30 Days" },
  { key: "P365D", label: "Year to date" },
];

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

// No charting library in this project (react-native-svg is the only
// relevant dependency) — a simple hand-rolled line chart rather than
// pulling one in, matching the codebase's existing preference for
// custom-built UI (e.g. the custom Select instead of native Picker).
function LineChart({ points }: { points: GaugeHistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <Text className="text-stone text-sm">Not enough data for this range.</Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const plotW = CHART_WIDTH - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const xAt = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;
  const yAt = (v: number) => PAD.top + (1 - (v - min) / range) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xAt(points.length - 1).toFixed(1)} ${PAD.top + plotH} L ${xAt(0)} ${PAD.top + plotH} Z`;

  const firstLabel = points[0].time.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastLabel = points[points.length - 1].time.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
      <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      <Line x1={PAD.left} y1={PAD.top + plotH} x2={CHART_WIDTH - PAD.right} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

      <SvgText x={PAD.left - 4} y={PAD.top + 4} fill="#9BA69C" fontSize={9} textAnchor="end">
        {max.toFixed(0)}
      </SvgText>
      <SvgText x={PAD.left - 4} y={PAD.top + plotH} fill="#9BA69C" fontSize={9} textAnchor="end">
        {min.toFixed(0)}
      </SvgText>
      <SvgText x={PAD.left} y={CHART_HEIGHT - 6} fill="#9BA69C" fontSize={9}>
        {firstLabel}
      </SvgText>
      <SvgText x={CHART_WIDTH - PAD.right} y={CHART_HEIGHT - 6} fill="#9BA69C" fontSize={9} textAnchor="end">
        {lastLabel}
      </SvgText>

      <Path d={areaPath} fill="rgba(14,165,160,0.14)" />
      <Path d={linePath} stroke={GAUGE_COLOR} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function GaugeHistoryChart({
  visible,
  siteCode,
  siteName,
  onClose,
}: {
  visible: boolean;
  siteCode: string;
  siteName: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<HistoryPeriod>("P7D");
  const [points, setPoints] = useState<GaugeHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchGaugeHistory(siteCode, period)
      .then(setPoints)
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [visible, siteCode, period]);

  return (
    <FormModal visible={visible} title="Flow history" onClose={onClose}>
      <Text className="text-stone text-xs mb-3" numberOfLines={1}>
        {siteName}
      </Text>

      <View className="flex-row gap-2 mb-3">
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1.5 ${period === p.key ? "bg-lime" : "border border-line bg-white/[0.04]"}`}>
            <Text className={`text-xs font-body-semibold ${period === p.key ? "text-[#0B0F0B]" : "text-stone"}`}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ height: CHART_HEIGHT, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#5BD46B" />
        </View>
      ) : (
        <LineChart points={points} />
      )}
      <Text className="text-stone text-[11px] text-center mt-2">Streamflow (cfs)</Text>
    </FormModal>
  );
}
