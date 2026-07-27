import { router } from "expo-router";
import React, { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FormModal } from "@/components/ui/Modal";
import { StarsDisplay } from "@/components/ui/Stars";
import * as api from "@/lib/api";
import { useToast } from "@/lib/toast";

function siteTypeLabel(t?: string) {
  return t === "rv" ? "RV" : t === "tent" ? "Tent" : t === "both" ? "RV & Tent" : "";
}

// Mirrors popupHtml() + addToMyCampsites() in CampTrack/js/explore.js — a
// bottom-sheet detail view replaces the Leaflet popup, since interactive
// buttons inside native map callouts aren't reliable cross-platform.
type Site = Omit<api.Campsite, "lat" | "lng"> & { lat: number; lng: number };

export function SiteDetailSheet({
  site,
  alreadySaved,
  isOwnSite = false,
  onClose,
  onSaved,
}: {
  site: Site | null;
  alreadySaved: boolean;
  isOwnSite?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(alreadySaved);

  if (!site) return <FormModal visible={false} title="" onClose={onClose}><View /></FormModal>;

  // Server-relative "/uploads/..." paths need resolving to a full URL for
  // <Image> to load them on native — see resolvePhotoUrl(). This also
  // filters out any empty entries, so the row only ever renders when
  // there's a real photo to show.
  const photos = (site.photos || []).map((p) => api.resolvePhotoUrl(p)).filter(Boolean);

  async function addToMine() {
    setSaving(true);
    try {
      await api.saveCampsite({
        name: site!.name,
        locationType: "gps",
        lat: String(site!.lat),
        lng: String(site!.lng),
        state: site!.state || "",
        siteType: site!.siteType || "",
        rating: 0,
        hookupPower: site!.hookupPower,
        hookupWater: site!.hookupWater,
        hookupSewer: site!.hookupSewer,
        powerAmp: site!.powerAmp || "",
        notes: site!.notes ? `Saved from Explore.\n\n${site!.notes}` : "Saved from Explore.",
        isPublic: false,
        photos: [],
      });
      setSaved(true);
      onSaved();
      toast("Added to your campsites");
    } catch (e: any) {
      toast(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={!!site} title={site.name} onClose={onClose}>
      {!isOwnSite && site.ownerUsername ? (
        <Pressable
          onPress={() => {
            onClose();
            router.push(`/(app)/user/${site.ownerUsername}`);
          }}
          className="flex-row items-center gap-1.5 mb-1.5">
          <Icon name="user" size={13} color="#5BD46B" />
          <Text className="text-lime text-xs">Posted by @{site.ownerUsername}</Text>
        </Pressable>
      ) : null}
      <Text className="text-stone text-sm">{[site.state, siteTypeLabel(site.siteType)].filter(Boolean).join(" · ")}</Text>
      {!!site.rating && (
        <View className="mt-1.5">
          <StarsDisplay rating={site.rating} size={16} />
        </View>
      )}
      <View className="flex-row flex-wrap gap-3 mt-2">
        {site.hookupPower ? (
          <View className="flex-row items-center gap-1">
            <Icon name="power" size={13} color="#a9c2da" />
            <Text className="text-[#a9c2da] text-xs">Power{site.powerAmp ? ` ${site.powerAmp}A` : ""}</Text>
          </View>
        ) : null}
        {site.hookupWater ? (
          <View className="flex-row items-center gap-1">
            <Icon name="water" size={13} color="#a9c2da" />
            <Text className="text-[#a9c2da] text-xs">Water</Text>
          </View>
        ) : null}
        {site.hookupSewer ? (
          <View className="flex-row items-center gap-1">
            <Icon name="sewer" size={13} color="#a9c2da" />
            <Text className="text-[#a9c2da] text-xs">Sewer</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={() => Linking.openURL(`https://www.google.com/maps?q=${site.lat},${site.lng}`)}
        className="flex-row items-center gap-1.5 mt-2">
        <Text className="font-mono text-stone text-xs">
          {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
        </Text>
        <Icon name="openLink" size={13} color="#5BD46B" />
      </Pressable>
      {site.notes ? <Text className="text-ink text-sm mt-2">{site.notes}</Text> : null}
      {photos.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-2.5">
          {photos.slice(0, 4).map((p, i) => (
            <Image key={i} source={{ uri: p }} style={{ width: 72, height: 72, borderRadius: 10 }} />
          ))}
        </View>
      )}
      <View className="mt-4 mb-2">
        {isOwnSite ? (
          <>
            <Button title="This is your campsite" icon="check" variant="ghost" disabled />
            <Text className="text-stone text-xs mt-1.5">
              You made this campsite public — it's already in your own campsites list.
            </Text>
          </>
        ) : (
          <Button
            title={saved ? "In your campsites" : "Add to my campsites"}
            icon={saved ? "check" : "add"}
            variant={saved ? "ghost" : "primary"}
            disabled={saved}
            loading={saving}
            onPress={addToMine}
          />
        )}
      </View>
    </FormModal>
  );
}
