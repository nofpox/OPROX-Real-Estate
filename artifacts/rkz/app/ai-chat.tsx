import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
type MicState = "idle" | "recording" | "processing";

function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

async function callAiChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  domain: string
): Promise<string> {
  const base = domain ? `https://${domain}` : "";
  const res = await fetch(`${base}/api/rkz/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("API error");
  const data = (await res.json()) as { reply: string };
  return data.reply ?? "";
}

async function transcribeAudio(blob: Blob, domain: string): Promise<string> {
  const base = domain ? `https://${domain}` : "";
  const form = new FormData();
  form.append("audio", blob, "voice.webm");
  const res = await fetch(`${base}/api/rkz/transcribe`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Transcription failed");
  const data = (await res.json()) as { text: string };
  return data.text ?? "";
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
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const greeting: Message = {
    id: "0",
    role: "assistant",
    content: isAr
      ? "هلا! أنا HousIn AI سكرتيرك العقاري الذكي 🤖\nتدلل واسألني — ابحث لك عن العقار المناسب 😎"
      : "Hello! I'm HousIn AI, your smart real estate secretary 🤖\nTell me what you're looking for and I'll find it for you!",
  };

  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");

  // Web MediaRecorder refs (works on Expo web)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function scrollBottom() {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      setInput("");

      const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };

      setMessages((prev) => {
        const updated = [...prev, userMsg];
        (async () => {
          setLoading(true);
          scrollBottom();
          try {
            const history = updated
              .filter((m) => m.id !== "0")
              .map((m) => ({ role: m.role, content: m.content }));
            const reply = await callAiChat(history, domain);
            setMessages((p) => [
              ...p,
              { id: Date.now().toString() + "r", role: "assistant", content: reply },
            ]);
          } catch {
            setMessages((p) => [
              ...p,
              {
                id: Date.now().toString() + "e",
                role: "assistant",
                content: isAr
                  ? "عذراً يا غالي، ما قدرت أتواصل مع الخادم. حاول مرة ثانية 🙏"
                  : "Sorry, could not reach the server. Please try again.",
              },
            ]);
          } finally {
            setLoading(false);
            scrollBottom();
          }
        })();
        return updated;
      });
    },
    [loading, domain, isAr]
  );

  // ── Mic (web only via MediaRecorder) ──────────────────────────────────────
  async function toggleMic() {
    if (Platform.OS !== "web") {
      alert(isAr ? "التسجيل الصوتي متاح على الويب فقط حالياً" : "Voice recording is available on web only for now.");
      return;
    }

    if (micState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (micState === "processing" || loading) return;

    try {
      // @ts-ignore — navigator.mediaDevices available in Expo web
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
        // @ts-ignore
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      // @ts-ignore
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      mr.onstop = async () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setMicState("processing");
        try {
          const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
          const text = await transcribeAudio(blob, domain);
          if (text.trim()) await sendText(text.trim());
        } catch {
          // silent fail
        } finally {
          setMicState("idle");
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setMicState("recording");
      // auto-stop after 60s
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 60_000);
    } catch {
      alert(isAr ? "تعذّر الوصول للميكروفون. تأكد من منح الإذن." : "Cannot access microphone. Please allow permission.");
    }
  }

  const userAr = isArabic(
    messages.filter((m) => m.role === "user").map((m) => m.content).join("") || (isAr ? "أ" : "")
  );

  const micIcon = micState === "recording" ? "mic-off" : "mic";
  const micColor =
    micState === "recording" ? "#ef4444" :
    micState === "processing" ? "#f59e0b" :
    NAVY;

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
            <Text style={b.headerTitle}>HousIn AI</Text>
            <Text style={b.headerSub}>
              {isAr ? "سكرتيرك العقاري الذكي · متاح دائماً" : "Your Smart Real Estate Secretary · Always on"}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={
          loading
            ? [...messages, { id: "__typing__", role: "assistant" as const, content: "" }]
            : messages
        }
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
          const msgAr = isArabic(item.content);
          return (
            <View style={[b.row, isUser && b.rowReverse]}>
              {!isUser && <Text style={b.avatar}>🤖</Text>}
              <View style={[b.bubble, isUser ? b.userBubble : b.botBubble]}>
                <Text
                  style={[
                    isUser ? b.userText : b.botText,
                    { textAlign: msgAr ? "right" : "left" },
                  ]}
                >
                  {item.content}
                </Text>
              </View>
              {isUser && <Text style={b.avatar}>👤</Text>}
            </View>
          );
        }}
      />

      {/* Recording indicator */}
      {micState === "recording" && (
        <View style={b.recordingBar}>
          <View style={b.recDot} />
          <Text style={b.recText}>{isAr ? "جارٍ التسجيل... اضغط 🎤 للإيقاف" : "Recording... tap 🎤 to stop"}</Text>
        </View>
      )}
      {micState === "processing" && (
        <View style={[b.recordingBar, { backgroundColor: "#f59e0b" }]}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={b.recText}>{isAr ? "جارٍ التحويل للنص..." : "Transcribing..."}</Text>
        </View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[b.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          {/* Camera — disabled */}
          <Pressable style={b.iconBtn} disabled>
            <Text style={{ fontSize: 22, opacity: 0.3 }}>📹</Text>
          </Pressable>

          {/* Mic button */}
          <Pressable
            style={[
              b.iconBtn,
              micState === "recording" && { backgroundColor: "#fee2e2" },
              micState === "processing" && { backgroundColor: "#fef3c7" },
            ]}
            onPress={toggleMic}
            disabled={loading}
          >
            {micState === "processing" ? (
              <ActivityIndicator color={micColor} size="small" />
            ) : (
              <MaterialIcons name={micIcon} size={22} color={micColor} />
            )}
          </Pressable>

          <TextInput
            style={[b.textInput, { textAlign: userAr ? "right" : "left" }]}
            placeholder={
              micState === "recording"
                ? (isAr ? "🔴 جارٍ التسجيل..." : "🔴 Recording...")
                : micState === "processing"
                ? (isAr ? "⏳ جارٍ التحويل..." : "⏳ Transcribing...")
                : (isAr ? "اكتب أو تحدث..." : "Type or speak...")
            }
            placeholderTextColor="rgba(15,32,64,0.35)"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendText(input)}
            returnKeyType="send"
            multiline
            maxLength={800}
            editable={micState === "idle"}
          />

          <Pressable
            style={[b.sendBtn, (!input.trim() || loading || micState !== "idle") && b.sendBtnDisabled]}
            onPress={() => sendText(input)}
            disabled={!input.trim() || loading || micState !== "idle"}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const b = StyleSheet.create({
  header: {
    backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
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
    maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
  },
  botBubble:  { backgroundColor: "#fff", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  userBubble: { backgroundColor: NAVY, borderBottomRightRadius: 4 },
  botText:    { fontSize: 14, fontFamily: "Inter_400Regular", color: NAVY, lineHeight: 21 },
  userText:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", lineHeight: 21 },

  recordingBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#ef4444", paddingHorizontal: 16, paddingVertical: 8,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  recText: { fontSize: 13, color: "#fff", fontFamily: "Inter_500Medium" },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "rgba(15,32,64,0.08)",
  },
  iconBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    borderRadius: 20, backgroundColor: "#f1f5f9",
  },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 120,
    borderWidth: 1.5, borderColor: "rgba(15,32,64,0.12)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, fontFamily: "Inter_400Regular", color: NAVY, backgroundColor: "#f9fafb",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
