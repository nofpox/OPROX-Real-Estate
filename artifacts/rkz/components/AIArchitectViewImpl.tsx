/**
 * AIArchitectView — Native React Native component
 *
 * Handles Tripo3D generation entirely via native fetch (no WebView HTML).
 * WebView is used only to render the resulting GLB via <model-viewer>.
 *
 * Props:
 *  mode          — "auto" | "level" | "manual" (set by parent mode tabs)
 *  tripoKey      — Tripo3D API key (loaded from AsyncStorage by parent)
 *  brain         — rules object (new_design_cost)
 *  onNeedCredits — called when credits < new_design_cost; parent shows PlansSheet
 *  onCreditUsed  — called after successful generation; parent decrements display
 *
 * Tripo3D flow (correct endpoints):
 *  POST   https://api.tripo3d.ai/v2/openapi/task       → { data: { task_id } }
 *  GET    https://api.tripo3d.ai/v2/openapi/task/{id}  → { data: { status, output: { model: { url } } } }
 *
 * Credit flow:
 *  1. Read AsyncStorage "architect_credits" — if < 1 → onNeedCredits()
 *  2. Generate → poll → on success → deduct 1 → onCreditUsed()
 *  (Swap AsyncStorage calls for Supabase RPC when backend is ready)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import WebView from "react-native-webview";

/* ── Constants ───────────────────────────────────────────────────────────── */
const NAVY        = "#0f2040";
const GOLD        = "#c9a84c";
const BG          = "#0a0f1e";
const TRIPO_BASE  = "https://api.tripo3d.ai/v2/openapi";
const CREDITS_KEY = "architect_credits";
const OPENAI_KEY  = "openai_key";

type Mode = "auto" | "level" | "manual";

interface Props {
  mode:          Mode;
  tripoKey:      string;
  brain:         { rules: { new_design_cost: number } };
  onNeedCredits: () => void;
  onCreditUsed:  () => void;
}

/* ── Mode helpers ────────────────────────────────────────────────────────── */
const PLACEHOLDER: Record<Mode, string> = {
  auto:   "صف المشروع باختصار — مثال: فيلا عصرية في الرياض",
  level:  "صف المشروع + عدد الطوابق — مثال: فيلا طابقان مع مسبح وحديقة",
  manual: "صف التصميم بالتفصيل: المساحة، الطراز، عدد الغرف، الواجهة...",
};

const MODE_SUFFIX: Record<Mode, string> = {
  auto:   ", Saudi contemporary luxury villa, photo-realistic exterior",
  level:  ", Saudi villa with specified floors and pool area, detailed architecture",
  manual: "",
};

/* ── model-viewer HTML (WebView source) ──────────────────────────────────── */
function viewerHtml(url: string) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0f1e;overflow:hidden}
model-viewer{width:100%;height:100vh;--poster-color:transparent}
</style></head><body>
<model-viewer
  src="${url}"
  auto-rotate
  camera-controls
  tone-mapping="commerce"
  shadow-intensity="1"
  environment-image="neutral"
  ar>
</model-viewer>
</body></html>`;
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function AIArchitectView({
  mode,
  tripoKey,
  brain,
  onNeedCredits,
  onCreditUsed,
}: Props) {
  const [prompt,      setPrompt]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [status,      setStatus]      = useState("");
  const [progress,    setProgress]    = useState(0);
  const [glbUrl,      setGlbUrl]      = useState<string | null>(null);
  const [hasOpenAI,   setHasOpenAI]   = useState(false);
  const [showChat,    setShowChat]    = useState(false);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsgs,    setChatMsgs]    = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "مرحباً! أنا Housin3D، مستشارك المعماري.\nاسألني عن التصميم، الطراز السعودي، أو أي شيء عن مشروعك 🏠" },
  ]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Load OpenAI key flag */
  useEffect(() => {
    AsyncStorage.getItem(OPENAI_KEY).then((k) => setHasOpenAI(!!k?.trim()));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  /* ── generate3D ─────────────────────────────────────────────────────────── */
  const generate3D = useCallback(async () => {
    if (!prompt.trim() || loading) return;

    /* 1. Credit check
       — Swap for Supabase: const { data } = await supabase.rpc('get_credits')
         if (data < brain.rules.new_design_cost) { onNeedCredits(); return; }   */
    const raw = await AsyncStorage.getItem(CREDITS_KEY);
    const c   = parseInt(raw ?? "0", 10);
    if (c < brain.rules.new_design_cost) {
      onNeedCredits();
      return;
    }

    setLoading(true);
    setGlbUrl(null);
    setProgress(10);
    setStatus("جاري إرسال الطلب...");

    const fullPrompt = prompt.trim() + MODE_SUFFIX[mode];

    try {
      /* 2. POST task — endpoint: /v2/openapi/task (NOT /generate/task) */
      const postRes  = await fetch(`${TRIPO_BASE}/task`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${tripoKey}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "text_to_model", prompt: fullPrompt, model_version: "v2.5-20250123" }),
      });
      const postData = await postRes.json();

      /* 3. Extract task_id — guard against missing/error response before destructuring */
      if (!postRes.ok || !postData?.data) {
        throw new Error(
          postData?.message ?? postData?.error ?? `فشل إنشاء الطلب (${postRes.status}) — تحقق من مفتاح Tripo3D`
        );
      }
      const { task_id } = postData.data as { task_id: string };
      if (!task_id) throw new Error(postData.message ?? "فشل إنشاء الطلب — تحقق من المفتاح");

      setProgress(30);
      setStatus("جاري التوليد... (1-3 دقائق)");

      /* 4. Poll every 4000ms */
      pollRef.current = setInterval(async () => {
        try {
          const getRes = await fetch(`${TRIPO_BASE}/task/${task_id}`, {
            headers: { Authorization: `Bearer ${tripoKey}` },
          });
          const result = await getRes.json();
          const st     = result.data?.status as string | undefined;

          if (st === "running" || st === "queued") {
            setProgress((p) => Math.min(p + 7, 85));
          }

          if (st === "success") {
            clearInterval(pollRef.current!);

            /* 5. Get GLB URL — correct path: output.model.url (NOT output.model_url) */
            const url = result.data.output?.model?.url as string | undefined;
            if (!url) throw new Error("لم يُرجع Tripo3D رابط الملف");

            setGlbUrl(url);
            setProgress(100);
            setStatus("اكتمل التصميم ✓");
            setLoading(false);

            /* 6. Deduct credit
               — Swap for Supabase: await supabase.rpc('deduct_credit', { amount: 1 }) */
            await AsyncStorage.setItem(CREDITS_KEY, String(c - brain.rules.new_design_cost));
            onCreditUsed();
          }

          if (st === "failed" || st === "cancelled") {
            clearInterval(pollRef.current!);
            setLoading(false);
            setStatus("فشل الإنشاء — حاول مرة أخرى");
          }
        } catch { /* keep polling silently */ }
      }, 4000);

    } catch (err: unknown) {
      setLoading(false);
      setStatus(err instanceof Error ? err.message : "خطأ في الاتصال");
    }
  }, [prompt, loading, mode, tripoKey, brain, onNeedCredits, onCreditUsed]);

  /* ── sendChat ───────────────────────────────────────────────────────────── */
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const openAiKey = await AsyncStorage.getItem(OPENAI_KEY);
    if (!openAiKey) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMsgs((m) => [...m, { role: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method:  "POST",
        headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role:    "system",
              content: "أنت Housin3D، مستشار معماري متخصص في التصميم السعودي المعاصر والفلل الفاخرة. أجب باللغة العربية، باختصار وعملية.",
            },
            ...chatMsgs.map((m) => ({
              role:    m.role === "user" ? "user" : ("assistant" as const),
              content: m.text,
            })),
            { role: "user", content: userMsg },
          ],
        }),
      });
      const data  = await res.json();
      const reply = (data.choices?.[0]?.message?.content as string) ?? "عذراً، حدث خطأ";
      setChatMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setChatMsgs((m) => [...m, { role: "ai", text: "⚠️ خطأ في الاتصال بـ OpenAI" }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMsgs]);

  /* ── Chat screen (تبويب استشر) ─────────────────────────────────────────── */
  if (showChat) {
    return (
      <View style={[s.fill, { backgroundColor: BG }]}>
        <View style={s.chatHeader}>
          <Pressable style={s.chatBack} onPress={() => setShowChat(false)}>
            <Text style={s.chatBackText}>← رجوع</Text>
          </Pressable>
          <Text style={s.chatTitle}>💬 استشر Housin3D</Text>
        </View>

        <ScrollView
          style={s.fill}
          contentContainerStyle={s.chatList}
          keyboardShouldPersistTaps="handled"
        >
          {chatMsgs.map((m, i) => (
            <View
              key={i}
              style={[s.bubble, m.role === "user" ? s.bubbleUser : s.bubbleAi]}
            >
              <Text style={[s.bubbleText, m.role === "user" ? s.bubbleTxtUser : s.bubbleTxtAi]}>
                {m.text}
              </Text>
            </View>
          ))}
          {chatLoading && <ActivityIndicator color={GOLD} style={{ marginTop: 8 }} />}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.chatInputRow}>
            <TextInput
              style={s.chatTextInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="اسأل عن التصميم..."
              placeholderTextColor="rgba(200,215,255,0.35)"
              onSubmitEditing={sendChat}
              returnKeyType="send"
            />
            <Pressable style={s.chatSendBtn} onPress={sendChat} disabled={chatLoading}>
              <Text style={s.chatSendText}>→</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  /* ── Main generate screen ───────────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={[s.fill, { backgroundColor: BG }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Prompt */}
        <View style={s.section}>
          <Text style={s.label}>وصف التصميم</Text>
          <TextInput
            style={s.textarea}
            value={prompt}
            onChangeText={setPrompt}
            placeholder={PLACEHOLDER[mode]}
            placeholderTextColor="rgba(200,215,255,0.32)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        {/* Generate button */}
        <Pressable
          style={({ pressed }) => [
            s.genBtn,
            (loading || !prompt.trim()) && s.genBtnOff,
            pressed && !loading && { opacity: 0.88 },
          ]}
          onPress={generate3D}
          disabled={loading || !prompt.trim()}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.genBtnText}>⚡ إنشاء موديل 3D</Text>
          }
        </Pressable>

        {/* Status + progress */}
        {(loading || status) ? (
          <View style={s.statusBox}>
            <View style={s.track}>
              <View style={[s.bar, { width: `${progress}%` as `${number}%` }]} />
            </View>
            <Text style={s.statusText}>{status}</Text>
          </View>
        ) : null}

        {/* 3D model viewer */}
        {glbUrl ? (
          <View style={s.viewerSection}>
            <Text style={s.label}>نتيجة التصميم</Text>
            <View style={s.viewer}>
              <WebView
                source={{ html: viewerHtml(glbUrl), baseUrl: "https://app.housin3d.ai" }}
                style={{ flex: 1, backgroundColor: BG }}
                javaScriptEnabled
                originWhitelist={["*"]}
              />
            </View>
            <Pressable
              style={s.newBtn}
              onPress={() => { setGlbUrl(null); setStatus(""); setProgress(0); setPrompt(""); }}
            >
              <Text style={s.newBtnText}>+ تصميم جديد</Text>
            </Pressable>
          </View>
        ) : null}

        {/* استشر tab — only if OpenAI key is set */}
        {hasOpenAI ? (
          <Pressable style={s.chatTrigger} onPress={() => setShowChat(true)}>
            <Text style={s.chatTriggerText}>💬 استشر المعماري الذكي</Text>
          </Pressable>
        ) : null}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  fill:   { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },

  section: { gap: 7 },
  label:   { fontSize: 12, fontWeight: "700", color: GOLD },

  textarea: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.22)",
    borderRadius: 14,
    padding: 13,
    color: "#fff",
    fontSize: 14,
    minHeight: 110,
    lineHeight: 22,
  },

  genBtn: {
    backgroundColor: "#0055ff",
    borderRadius: 16,
    padding: 17,
    alignItems: "center",
    shadowColor: "#0055ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
  genBtnOff: { backgroundColor: "rgba(0,80,200,0.28)", shadowOpacity: 0, elevation: 0 },
  genBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  statusBox: { gap: 8 },
  track: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 5,
    overflow: "hidden",
  },
  bar: {
    height: 5,
    backgroundColor: GOLD,
    borderRadius: 5,
  },
  statusText: { fontSize: 12, color: "rgba(200,215,255,0.55)", textAlign: "center" },

  viewerSection: { gap: 10 },
  viewer: {
    height: 310,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
  },
  newBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.4)",
    borderRadius: 13,
    padding: 13,
    alignItems: "center",
  },
  newBtnText: { color: GOLD, fontSize: 14, fontWeight: "700" },

  chatTrigger: {
    backgroundColor: "rgba(90,30,200,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.38)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  chatTriggerText: { color: "#a78bfa", fontSize: 14, fontWeight: "700" },

  /* Chat screen */
  chatHeader: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,168,76,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatBack:     { paddingVertical: 6 },
  chatBackText: { color: GOLD, fontSize: 14, fontWeight: "700" },
  chatTitle:    { fontSize: 16, fontWeight: "800", color: "#fff", flex: 1, textAlign: "center" },
  chatList:     { padding: 16, gap: 10 },

  bubble:      { maxWidth: "88%", borderRadius: 16, padding: 12 },
  bubbleUser:  { alignSelf: "flex-start", backgroundColor: "rgba(0,85,255,0.16)", borderWidth: 1, borderColor: "rgba(0,100,255,0.24)" },
  bubbleAi:    { alignSelf: "flex-end",   backgroundColor: NAVY,                  borderWidth: 1, borderColor: "rgba(201,168,76,0.18)" },
  bubbleText:  { fontSize: 14, lineHeight: 22 },
  bubbleTxtUser: { color: "#c8d7ff" },
  bubbleTxtAi:   { color: "#fff" },

  chatInputRow: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(201,168,76,0.11)",
    backgroundColor: NAVY,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
  },
  chatSendBtn: {
    backgroundColor: "#0055ff",
    borderRadius: 12,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chatSendText: { color: "#fff", fontSize: 20, fontWeight: "800" },
});
