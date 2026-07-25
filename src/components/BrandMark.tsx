import React from "react";
import { Circle, Path, Svg } from "react-native-svg";

// Mirrors ctLogoSvg() in CampTrack/js/ui.js — compass + mountain + trail mark.
export function BrandMark({ size = 30, variant = "dark" }: { size?: number; variant?: "light" | "dark" }) {
  const terrain =
    variant === "dark"
      ? { mountain: "#F7F5F2", trees: "#DCE0D6", dot: "#B9852B" }
      : { mountain: "#2F5D50", trees: "#1E3F35", dot: "#1E3F35" };
  const ring = variant === "dark" ? "#FFFFFF" : "#2F5D50";
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={27} fill="none" stroke={ring} strokeWidth={2.5} />
      <Path d="M32 2 L35.5 9 L28.5 9 Z" fill={ring} />
      <Path d="M32 62 L35.5 55 L28.5 55 Z" fill={ring} />
      <Path d="M2 32 L9 35.5 L9 28.5 Z" fill={ring} />
      <Path d="M62 32 L55 35.5 L55 28.5 Z" fill={ring} />
      <Path d="M13 41 L22.5 23.5 L28.5 33 L34.5 21.5 L49 41 Z" fill={terrain.mountain} />
      <Path d="M16.5 41 L19.5 33.5 L22.5 41 Z" fill={terrain.trees} />
      <Path d="M42 41 L45 33.5 L48 41 Z" fill={terrain.trees} />
      <Path d="M32 32 L45 19 L36.5 29.5 Z" fill="#D9A441" />
      <Circle cx={32} cy={32} r={3.4} fill="#fff" stroke={terrain.dot} strokeWidth={1.3} />
    </Svg>
  );
}
