import React from "react";
import { View, ViewProps } from "react-native";

// Mirrors .card in styles.css. NativeWind can't do backdrop-filter blur
// on native, so we approximate the "dark glass" look with a solid-ish
// translucent surface instead of true frosted glass.
export function Card({ className, children, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-surface border border-glass-border rounded-md p-5 mb-4 ${className ?? ""}`}
      {...rest}>
      {children}
    </View>
  );
}
