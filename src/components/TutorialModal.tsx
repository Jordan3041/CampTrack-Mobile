import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TUTORIAL_STEPS } from "@/lib/tutorial-steps";

// Mirrors showTutorial() in CampTrack/js/tutorial.js.
export function TutorialModal({ visible, onFinish }: { visible: boolean; onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const s = TUTORIAL_STEPS[step];

  function finish() {
    setStep(0);
    onFinish();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={finish}>
      <Pressable className="flex-1 bg-black/60 justify-center px-6" onPress={finish}>
        <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface-2 border border-glass-border rounded-md p-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-stone text-xs">
              Step {step + 1} of {TUTORIAL_STEPS.length}
            </Text>
            <Pressable onPress={finish} hitSlop={10}>
              <Icon name="close" size={22} color="#9BA69C" />
            </Pressable>
          </View>
          {s.icon ? (
            <View className="mb-2">
              <Icon name={s.icon} size={26} color="#5BD46B" />
            </View>
          ) : null}
          <Text className="font-display text-lg text-ink mt-1">{s.title}</Text>
          <Text className="text-ink text-sm mt-2">{s.body}</Text>
          <View className="flex-row justify-center gap-1.5 my-4">
            {TUTORIAL_STEPS.map((_, i) => (
              <View key={i} style={{ width: 7, height: 7, borderRadius: 4 }} className={i === step ? "bg-lime" : "bg-white/20"} />
            ))}
          </View>
          <View className="flex-row justify-between items-center">
            {isFirst ? <View /> : <Button title="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />}
            <Button title={isLast ? "Get started" : "Next"} onPress={() => (isLast ? finish() : setStep((s) => s + 1))} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
