import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { StarsDisplay } from "@/components/ui/Stars";
import * as api from "@/lib/api";
import { RIG_RV_TYPES } from "@/lib/rig-constants";

function siteTypeLabel(t?: string) {
  return t === "rv" ? "RV" : t === "tent" ? "Tent" : t === "both" ? "RV & Tent" : "";
}

// Read-only view of another member's public presence — mirrors
// CampTrack/user.html: username, avatar, bio, rig, and only the
// campsites they've explicitly marked public.
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<api.PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        setProfile(await api.getPublicProfile(username));
      } catch (e: any) {
        setError(e.message || "Couldn't load this profile.");
      }
    })();
  }, [username]);

  if (error) {
    return (
      <Screen>
        <EmptyState icon="user">{error}</EmptyState>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <ActivityIndicator color="#5BD46B" />
      </Screen>
    );
  }

  const rig = profile.rig;
  const showRvFields = !!rig && RIG_RV_TYPES.has(rig.vehicleType);

  return (
    <Screen>
      <Card>
        <View className="flex-row items-center gap-3">
          {profile.avatarUrl ? (
            <Image source={{ uri: api.resolvePhotoUrl(profile.avatarUrl) }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center">
              <Icon name="user" size={26} color="#a9c2da" />
            </View>
          )}
          <View className="flex-1">
            <Text className="font-display text-lg text-ink">{profile.displayName}</Text>
            <Text className="text-stone text-sm">@{profile.username}</Text>
          </View>
        </View>
        {profile.bio ? <Text className="text-ink text-sm mt-3">{profile.bio}</Text> : null}
      </Card>

      {rig && rig.vehicleType ? (
        <Card>
          <Text className="font-display text-lg text-ink mb-2">Rig</Text>
          <Text className="text-ink font-body-bold">{rig.vehicleType}</Text>
          {showRvFields && (
            <>
              <Text className="text-stone text-sm mt-1">
                {[rig.rvYear, rig.rvMake, rig.rvModel].filter(Boolean).join(" ")}
                {rig.rvLength ? ` · ${rig.rvLength} ft` : ""}
              </Text>
              {rig.rvAmpService ? <Text className="text-stone text-sm">{rig.rvAmpService}A service</Text> : null}
            </>
          )}
          {rig.features.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {rig.features.map((f) => (
                <Badge key={f} kind="hookup">
                  {f}
                </Badge>
              ))}
            </View>
          )}
        </Card>
      ) : null}

      <Card>
        <Text className="font-display text-lg text-ink mb-2">Public campsites</Text>
        {profile.campsites.length === 0 ? (
          <EmptyState icon="campsites">Nothing public yet.</EmptyState>
        ) : (
          profile.campsites.map((s) => (
            <View key={s.id} className="py-2.5 border-b border-line">
              <Text className="text-ink font-body-bold">{s.name}</Text>
              <Text className="text-stone text-xs">{[s.state, siteTypeLabel(s.siteType)].filter(Boolean).join(" · ")}</Text>
              {!!s.rating && (
                <View className="mt-1">
                  <StarsDisplay rating={s.rating} size={14} />
                </View>
              )}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
