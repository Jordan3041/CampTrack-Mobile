import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Text } from "react-native";

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      }, 2400);
    },
    [opacity]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 34,
          alignSelf: "center",
          opacity,
          backgroundColor: "#1F261F",
          borderColor: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          paddingHorizontal: 20,
          paddingVertical: 11,
          borderRadius: 99,
        }}>
        <Text style={{ color: "#fff", fontSize: 14 }}>{message}</Text>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
