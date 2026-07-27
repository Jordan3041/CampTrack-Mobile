import React from "react";
import { ScrollView, ScrollViewProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, scroll = true, ...rest }: { children: React.ReactNode; scroll?: boolean } & ScrollViewProps) {
  const Wrapper = scroll ? ScrollView : View;
  // No "top" edge: every screen that uses this already renders below a
  // visible native header (Tabs or Stack with headerShown: true), which
  // accounts for the status bar itself — adding it here too double-pads.
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["left", "right"]}>
      <Wrapper
        className="flex-1 px-4"
        contentContainerStyle={scroll ? { paddingTop: 16, paddingBottom: 64 } : undefined}
        style={!scroll ? { flex: 1, paddingTop: 16 } : undefined}
        {...rest}>
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}
