import React from "react";
import { ScrollView, ScrollViewProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, scroll = true, ...rest }: { children: React.ReactNode; scroll?: boolean } & ScrollViewProps) {
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "left", "right"]}>
      <Wrapper
        className="flex-1 px-4"
        contentContainerStyle={scroll ? { paddingTop: 16, paddingBottom: 40 } : undefined}
        style={!scroll ? { flex: 1, paddingTop: 16 } : undefined}
        {...rest}>
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}
