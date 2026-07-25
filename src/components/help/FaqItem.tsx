import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="border-b border-line py-2.5">
      <Pressable className="flex-row justify-between items-center gap-2.5" onPress={() => setOpen((o) => !o)}>
        <Text className="text-ink font-body-bold flex-1">{question}</Text>
        <Text className="text-lime text-xl">{open ? "–" : "+"}</Text>
      </Pressable>
      {open ? <Text className="text-stone text-sm mt-2.5">{answer}</Text> : null}
    </View>
  );
}
