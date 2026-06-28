import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";

type Message = { id: string; role: "user" | "assistant"; content: string };

function detectArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

async function sendChat(messages: Array<{ role: "user" | "assistant"; content: string }>): Promise<string> {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  const base = domain ? `https://${domain}` : "";
  const res = await fetch(`${base}/api/rkz/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json() as { reply: string };
  return data.reply ?? "";
}

function TypingDots() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 420);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={b.bubble}>
      <Text style={b.botText}>{"●".repeat(dot + 1)}</Text>
    </View>
  );
}

export default function AiChatScreen() {
  const { isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);

  const greeting = isAr
    ? "هلا! أنا مساعدك العقاري الذكي 🤖\nتدلل واسألني عن أي شي — أسعار، مناطق، إيجار أو شراء 😎"
    : "Hello! I'm your HousIn AI assistant 🤖\nAsk me anything about real estate in Saudi Arabia!";

  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  function scrollBottom() {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    scrollBottom();

    try {
      const history = next
        .filter((m) => m.id !== "0")
        .map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendChat(history);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "r", role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "e",
          role: "assistant",
          content: isAr
            ? "عذراً يا غالي، ما قدرت أتواصل مع الخادم. حاول مرة ثانية 🙏"
            : "Sorry, couldn't reach the server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  }

  const isUserAr = detectArabic(messages.filter((m) => m.role === "user").map((m) => m.content).join("") || (isAr ? "أ" : ""));

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      {/* Header */}
      <View style={[b.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={b.backBtn} hitSlop={12}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View style={b.headerCenter}>
          <Text style={b.headerEmoji}>🤖</Text>
          <View>
            <Text style={b.headerTitle}>{isAr ? "مساعد HousIn الذكي" : "HousIn AI Assistant"}</Text>
            <Text style={b.headerSub}>{isAr ? "متوفر الآن • يفهم عربي وإنجليزي" : "Online • Bilingual AR / EN"}</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={loading ? [...messages, { id: "__typing__", role: "assistant" as const, content: "" }] : messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 12 }}
        onContentSizeChange={scrollBottom}
        renderItem={({ item }) => {
          if (item.id === "__typing__") {
            return (
              <View style={b.row}>
                <Text style={b.avatar}>🤖</Text>
                <TypingDots />
              </View>
            );
          }
          const isUser = item.role === "user";
          const msgAr = detectArabic(item.content);
          return (
            <View style={[b.row, isUser && b.rowReverse]}>
              {!isUser && <Text style={b.avatar}>🤖</Text>}
              <View style={[b.bubble, isUser ? b.userBubble : b.botBubble]}>
                <Text style={[isUser ? b.userText : b.botText, { textAlign: msgAr ? "right" : "left" }]}>
                  {item.content}
                </Text>
              </View>
              {isUser && <Text style={b.avatar}>👤</Text>}
            </View>
          );
        }}
      />

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[b.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          {/* Camera — disabled */}
          <Pressable style={b.iconBtn} disabled>
            <Text style={{ fontSize: 22, opacity: 0.3 }}>📹</Text>
          </Pressable>

          {/* Mic — placeholder */}
          <Pressable style={b.iconBtn}>
            <Text style={{ fontSize: 22 }}>🎤</Text>
          </Pressable>

          <TextInput
            style={[
              b.textInput,
              { textAlign: isUserAr ? "right" : "left" },
            ]}
            placeholder={isAr ? "اكتب رسالتك..." : "Type your message..."}
            placeholderTextColor="rgba(15,32,64,0.35)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            maxLength={800}
          />

          <Pressable
            style={[b.sendBtn, (!input.trim() || loading) && b.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <MaterialIcons name={isAr ? "send" : "send"} size={20} color="#fff" />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const b = StyleSheet.create({
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerEmoji:  { fontSize: 28 },
  headerTitle:  { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:    { fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },

  row:        { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowReverse: { flexDirection: "row-reverse" },
  avatar:     { fontSize: 22, marginBottom: 2 },

  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botBubble:  { backgroundColor: "#fff", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  userBubble: { backgroundColor: NAVY, borderBottomRightRadius: 4 },
  botText:    { fontSize: 14, fontFamily: "Inter_400Regular", color: NAVY, lineHeight: 21 },
  userText:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 21 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(15,32,64,0.08)",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: "rgba(15,32,64,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: NAVY,
    backgroundColor: "#f9fafb",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
