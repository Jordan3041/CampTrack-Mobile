import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";

// Renders light Markdown (**bold**, "* "/"- " bullets) as RN Text/View
// nodes — mirrors formatAssistantText() in CampTrack/js/ui.js, which does
// the same thing as real HTML there.
function AssistantMessageText({ text }: { text: string }) {
  const lines = text.split("\n");
  const renderInline = (line: string, key: number) => {
    const parts = line.split(/(\*\*.+?\*\*)/g).filter(Boolean);
    return (
      <Text key={key} className="text-ink text-sm">
        {parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <Text key={i} className="font-body-bold">
              {p.slice(2, -2)}
            </Text>
          ) : (
            <Text key={i}>{p}</Text>
          )
        )}
      </Text>
    );
  };
  return (
    <View>
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        const bullet = /^[*-]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <View key={i} className="flex-row gap-1.5 mb-1">
              <Text className="text-ink text-sm">•</Text>
              {renderInline(bullet[1], i)}
            </View>
          );
        }
        if (!line) return null;
        return <View key={i} className="mb-1">{renderInline(line, i)}</View>;
      })}
    </View>
  );
}

type ChatMessage = { role: "user" | "assistant"; text: string };

// Mirrors initAssistantWidget()/buildAssistantWidget() in CampTrack/js/ui.js
// — a floating chat bubble, only present at all for a signed-in, verified
// user with AI features enabled and Gemini configured server-side.
export function AssistantWidget() {
  const { session } = useAuth();
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! Ask me about your upcoming trips, packing lists, gear, or weather." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session?.isVerified) return;
    api
      .assistantEnabled()
      .then(({ enabled }) => setAvailable(enabled))
      .catch(() => setAvailable(false));
  }, [session?.isVerified]);

  if (!session?.isVerified || !available) return null;

  async function send() {
    const message = input.trim();
    if (!message) return;
    setInput("");
    setSending(true);
    const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: message }]);
    try {
      const { reply } = await api.assistantChat(message, history, null);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: e.message || "Something went wrong — try again in a moment." }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        className="absolute bottom-28 right-5 w-14 h-14 rounded-full bg-lime items-center justify-center"
        style={{ elevation: 6, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
        <Icon name="chat" size={24} color="#0B0F0B" />
      </Pressable>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="absolute bottom-28 right-4 left-4 max-w-[420px] self-end"
      style={{ height: "70%", maxHeight: 520 }}>
      <View className="flex-1 bg-surface-2 border border-glass-border rounded-md overflow-hidden">
        <View className="flex-row items-center justify-between px-4 py-3 bg-pine/50 border-b border-glass-border">
          <View className="flex-row items-center gap-2">
            <Icon name="trips" size={16} color="#fff" />
            <Text className="text-white font-body-bold text-sm">CampTrack Assistant</Text>
          </View>
          <Pressable onPress={() => setOpen(false)} hitSlop={10}>
            <Icon name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView ref={scrollRef} className="flex-1 px-3 py-2" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) => (
            <View
              key={i}
              className={`max-w-[85%] rounded-md px-3 py-2 mb-2 ${m.role === "user" ? "bg-lime self-end" : "bg-white/5 self-start"}`}>
              {m.role === "user" ? <Text className="text-[#0B0F0B] text-sm font-body-medium">{m.text}</Text> : <AssistantMessageText text={m.text} />}
            </View>
          ))}
          {sending && <ActivityIndicator color="#5BD46B" className="self-start ml-1 mb-2" />}
        </ScrollView>

        <View className="flex-row items-center gap-2 p-2.5 border-t border-glass-border">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask something…"
            placeholderTextColor="#6d766e"
            maxLength={2000}
            onSubmitEditing={send}
            className="flex-1 bg-white/5 border border-line rounded-full px-4 py-2 text-ink"
          />
          <Pressable onPress={send} disabled={sending} className="w-9 h-9 rounded-full bg-lime items-center justify-center">
            <Icon name="send" size={16} color="#0B0F0B" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
