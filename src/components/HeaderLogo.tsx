import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

import { BrandMark } from "@/components/BrandMark";
import { Icon } from "@/components/ui/Icon";

// Used as every screen's headerLeft — shows the CampTrack mark on every
// page, and additionally a back chevron on pushed screens that have
// somewhere to go back to (main tab screens never do). Built by hand
// rather than pulling in @react-navigation/elements' HeaderBackButton,
// since that package isn't a direct/resolvable dependency here — only
// bundled transitively inside expo-router.
//
// `canGoBack` must come from React Navigation's own headerLeft render
// props (screenOptions={{ headerLeft: (props) => <HeaderLogo canGoBack={props.canGoBack} /> }})
// rather than the global router.canGoBack() — the global one reflects the
// whole app's navigation history (including e.g. earlier deep links),
// which showed a back button on root tab screens that have nowhere of
// their own to go back to.
export function HeaderLogo({ canGoBack }: { canGoBack?: boolean }) {
  return (
    <View className="flex-row items-center gap-3 ml-1">
      {canGoBack && (
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Icon name="chevronRight" size={22} color="#F2F5F1" style={{ transform: [{ rotate: "180deg" }] }} />
        </Pressable>
      )}
      <BrandMark size={30} variant="light" />
    </View>
  );
}
