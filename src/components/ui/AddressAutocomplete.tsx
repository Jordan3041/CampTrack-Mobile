import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { TextField } from "@/components/ui/TextField";

export type AddressSuggestion = { displayName: string; lat: number; lng: number; state?: string };

// Free, no-key geocoder — same Nominatim endpoint already used for search
// in map.tsx. Nominatim's usage policy caps this around 1 request/sec, so
// results are debounced well past typing speed and only fire once there's
// enough text to narrow things down.
async function fetchSuggestions(query: string): Promise<AddressSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const results = await res.json();
  return (results || []).map((r: any) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    state: r.address?.state,
  }));
}

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChangeText,
  onSelect,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  onSelect?: (s: AddressSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = value.trim();
    if (!focused || q.length < 4) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myId = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(q);
        if (myId === requestId.current) setSuggestions(results);
      } catch (_) {
        if (myId === requestId.current) setSuggestions([]);
      } finally {
        if (myId === requestId.current) setLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [value, focused]);

  const showDropdown = focused && (loading || suggestions.length > 0);

  return (
    <View>
      <TextField
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
      />
      {showDropdown && (
        <View className="rounded-sm border border-line bg-surface-2 -mt-1 mb-2 overflow-hidden">
          {loading && suggestions.length === 0 ? (
            <View className="px-3 py-3 items-center">
              <ActivityIndicator size="small" color="#5BD46B" />
            </View>
          ) : (
            suggestions.map((s, i) => (
              <Pressable
                key={`${s.lat},${s.lng},${i}`}
                onPress={() => {
                  onChangeText(s.displayName);
                  onSelect?.(s);
                  setSuggestions([]);
                }}
                className={`px-3 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
                <Text className="text-ink text-sm" numberOfLines={2}>
                  {s.displayName}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}
