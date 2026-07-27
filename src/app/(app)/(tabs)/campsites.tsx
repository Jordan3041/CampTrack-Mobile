import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, Share, Text, View } from "react-native";

import { CampsiteForm } from "@/components/campsites/CampsiteForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, IconName } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { Select } from "@/components/ui/Select";
import { StarsDisplay } from "@/components/ui/Stars";
import { TextField } from "@/components/ui/TextField";
import * as api from "@/lib/api";
import { CT_CONFIG } from "@/lib/config";
import { useToast } from "@/lib/toast";

const SITE_TYPE_LABEL: Record<string, string> = { rv: "RV", tent: "Tent", both: "RV & Tent" };
const CELL_STRENGTH_LABELS = ["No service", "1-2 bars", "3-4 bars", "Strong / 5G"];

function hookupChips(s: api.Campsite): { icon: IconName; label: string }[] {
  const parts: { icon: IconName; label: string }[] = [];
  if (s.hookupPower) parts.push({ icon: "power", label: `Power${s.powerAmp ? " " + s.powerAmp + "A" : ""}` });
  if (s.hookupWater) parts.push({ icon: "water", label: "Water" });
  if (s.hookupSewer) parts.push({ icon: "sewer", label: "Sewer" });
  return parts;
}

function cellChips(s: api.Campsite): { icon: IconName; label: string }[] {
  const carriers: [string, number | null | undefined][] = [
    ["Verizon", s.cellVerizon],
    ["T-Mobile", s.cellTmobile],
    ["AT&T", s.cellAtt],
  ];
  return carriers
    .filter(([, v]) => v != null)
    .map(([name, v]) => ({ icon: "signal" as IconName, label: `${name}: ${CELL_STRENGTH_LABELS[v!]}` }));
}

function locationLine(s: api.Campsite): string {
  if (s.locationType === "gps" && s.lat && s.lng) return `${s.lat}, ${s.lng}`;
  if (s.locationType === "address") return s.address || "";
  return s.locationName || "";
}

function mapUrl(s: api.Campsite): string | null {
  if (s.locationType === "gps" && s.lat && s.lng) return `https://www.google.com/maps?q=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
  if (s.locationType === "address" && s.address) return `https://www.google.com/maps?q=${encodeURIComponent(s.address)}`;
  return null;
}

export default function CampsitesScreen() {
  const toast = useToast();
  const [sites, setSites] = useState<api.Campsite[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [formSite, setFormSite] = useState<api.Campsite | null | undefined>(undefined);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getCampsites().then(setSites).catch((e) => setError(e.message));
  }, []);

  // Re-fetch on every focus, not just first mount — Tabs screens stay
  // mounted when you switch away, so a campsite saved elsewhere (e.g. from
  // Explore's "Add to my campsites") would otherwise never show up here
  // until the app restarts.
  useFocusEffect(load);

  async function handleShare(id: string) {
    const url = `${CT_CONFIG.WEB_ORIGIN}/shared/campsite/${id}`;
    try {
      await Share.share({ message: url, url });
    } catch (_) {
      /* user dismissed the share sheet — nothing to do */
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete campsite", "Delete this campsite and its photos?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteCampsite(id);
            load();
            toast("Campsite deleted");
          } catch (e: any) {
            toast(e.message);
          }
        },
      },
    ]);
  }

  const presentStates = [...new Set((sites || []).map((s) => s.state).filter(Boolean))].sort() as string[];
  let filtered = (sites || []).slice().reverse();
  if (stateFilter) filtered = filtered.filter((s) => s.state === stateFilter);
  const q = search.trim().toLowerCase();
  if (q) filtered = filtered.filter((s) => [s.name, s.notes, s.address, s.locationName].join(" ").toLowerCase().includes(q));

  return (
    <Screen>
      <View className="flex-row items-center justify-end mb-3 mt-1">
        <Button title="+ Add" size="sm" onPress={() => setFormSite(null)} />
      </View>

      <TextField placeholder="Search campsites…" value={search} onChangeText={setSearch} />
      <Select
        value={stateFilter}
        onChange={setStateFilter}
        options={[{ label: "All states", value: "" }, ...presentStates.map((s) => ({ label: s, value: s }))]}
      />

      {error ? (
        <Text className="text-danger">{error}</Text>
      ) : sites === null ? (
        <ActivityIndicator color="#5BD46B" className="mt-4" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="campsites">
            {q || stateFilter ? "No campsites match those filters." : "No campsites logged yet. Add your first spot."}
          </EmptyState>
        </Card>
      ) : (
        filtered.map((s) => {
          const url = mapUrl(s);
          return (
            <Card key={s.id}>
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-2">
                  <Text className="font-display text-lg text-ink">{s.name}</Text>
                  <View className="flex-row flex-wrap gap-1.5 mt-1">
                    {s.state ? <Badge kind="routine">{s.state}</Badge> : null}
                    {s.siteType ? <Badge kind="routine">{SITE_TYPE_LABEL[s.siteType]}</Badge> : null}
                    {s.isPublic ? (
                      <Badge kind="public" icon="publicGlobe">
                        Public
                      </Badge>
                    ) : null}
                    {s.landAgency ? (
                      <Badge kind="routine" icon="land">
                        {s.landUnitName || s.landAgency}
                      </Badge>
                    ) : null}
                  </View>
                  {!!s.rating && (
                    <View className="mt-1">
                      <StarsDisplay rating={s.rating} />
                    </View>
                  )}
                  {(hookupChips(s).length > 0 || cellChips(s).length > 0) && (
                    <View className="flex-row flex-wrap gap-1.5 mt-1.5">
                      {hookupChips(s).map((c) => (
                        <Badge key={c.label} kind="hookup" icon={c.icon}>
                          {c.label}
                        </Badge>
                      ))}
                      {cellChips(s).map((c) => (
                        <Badge key={c.label} kind="hookup" icon={c.icon}>
                          {c.label}
                        </Badge>
                      ))}
                    </View>
                  )}
                  <Pressable onPress={() => url && Linking.openURL(url)} className="flex-row items-center gap-1.5 mt-1.5">
                    <Text className="text-stone text-xs">{locationLine(s)}</Text>
                    {url ? <Icon name="openLink" size={12} color="#5BD46B" /> : null}
                  </Pressable>
                </View>
                <View className="gap-1.5">
                  <Button title="Share" variant="ghost" size="sm" icon="share" onPress={() => handleShare(s.id!)} />
                  <Button title="Edit" variant="ghost" size="sm" onPress={() => setFormSite(s)} />
                  <Button title="Delete" variant="danger" size="sm" onPress={() => handleDelete(s.id!)} />
                </View>
              </View>
              {s.notes ? <Text className="text-ink text-sm mt-2">{s.notes}</Text> : null}
              {(s.photos || []).length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-2.5">
                  {s.photos!.map((p, i) => {
                    const url = api.resolvePhotoUrl(p);
                    return (
                      <Pressable key={i} onPress={() => setLightbox(url)}>
                        <Image source={{ uri: url }} style={{ width: 84, height: 84, borderRadius: 10 }} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        })
      )}

      <CampsiteForm
        visible={formSite !== undefined}
        site={formSite || null}
        onClose={() => setFormSite(undefined)}
        onSaved={() => {
          setFormSite(undefined);
          load();
        }}
      />

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable className="flex-1 bg-black/90 items-center justify-center" onPress={() => setLightbox(null)}>
          {lightbox ? <Image source={{ uri: lightbox }} style={{ width: "92%", height: "70%" }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}
