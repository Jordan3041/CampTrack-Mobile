import React from "react";
import { Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";

// Mirrors .modal-backdrop / .modal in styles.css.
export function FormModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <RNModal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60 justify-center px-4" onPress={onClose}>
        {/* maxHeight lives here, not on the inner View — its parent (this
            Pressable) is what actually resolves against the full-screen
            modal's definite height, so the sheet stays bounded and the
            ScrollView below can pick up the overflow instead of growing
            content off the bottom of the screen. */}
        <Pressable onPress={(e) => e.stopPropagation()} style={{ maxHeight: "85%" }}>
          <View className="bg-surface-2 border border-glass-border rounded-md" style={{ maxHeight: "100%" }}>
            <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
              <Text className="text-ink font-display text-lg">{title}</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Icon name="close" size={22} color="#9BA69C" />
              </Pressable>
            </View>
            <ScrollView className="px-5 pb-5" keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
