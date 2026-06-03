import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAIAssistant, type Message } from "@/hooks/useAIAssistant";
import { useLocale } from "@/hooks/useLocale";

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 220, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.delay(300),
        ])
      );
    const anim = Animated.parallel([bounce(dot1, 0), bounce(dot2, 180), bounce(dot3, 360)]);
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: "row", gap: 5, padding: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.gold,
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
}

// ── Bold-text renderer for **bold** markers ──────────────────────────────────
function RichText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontFamily: "Inter_700Bold" }}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

// ── Quick-action suggestion chips ────────────────────────────────────────────
const AR_SUGGESTIONS = [
  "كيف أحسّن أداء عقاراتي؟",
  "ما أفضل وقت للبيع في الرياض؟",
  "تحليل نسب التحويل لديّ",
];
const EN_SUGGESTIONS = [
  "How can I improve my listing performance?",
  "What's the best time to sell in Riyadh?",
  "Analyze my conversion rates",
];

export default function AIConciergeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isAr } = useLocale();
  const { messages, isThinking, sendMessage, clearMessages } = useAIAssistant();

  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 + 84 : 84);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, isThinking]);

  function handleSend() {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendMessage(text);
  }

  function handleSuggestion(q: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendMessage(q);
  }

  const S = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.navy,
      paddingTop: topPad + 12,
      paddingBottom: 16,
      paddingHorizontal: 20,
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: { flex: 1 },
    headerTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      textAlign: isAr ? "right" : "left",
    },
    headerSub: {
      color: "rgba(255,255,255,0.5)",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
      textAlign: isAr ? "right" : "left",
    },
    clearBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    // Message bubbles
    msgRow: {
      marginBottom: 12,
      maxWidth: "85%",
    },
    msgRowUser: { alignSelf: isAr ? "flex-start" : "flex-end" },
    msgRowAI: { alignSelf: isAr ? "flex-end" : "flex-start" },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    bubbleUser: {
      backgroundColor: colors.navy,
      borderBottomRightRadius: isAr ? 18 : 4,
      borderBottomLeftRadius: isAr ? 4 : 18,
    },
    bubbleAI: {
      backgroundColor: colors.card,
      borderBottomRightRadius: isAr ? 4 : 18,
      borderBottomLeftRadius: isAr ? 18 : 4,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: isAr ? 1 : 3,
      borderLeftColor: isAr ? colors.border : colors.gold,
      borderRightWidth: isAr ? 3 : 1,
      borderRightColor: isAr ? colors.gold : colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    msgTextUser: {
      color: "#FFFFFF",
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 22,
      textAlign: isAr ? "left" : "right",
    },
    msgTextAI: {
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      lineHeight: 23,
      textAlign: isAr ? "right" : "left",
    },
    timestamp: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
      textAlign: isAr ? "right" : "left",
    },
    // Typing bubble
    typingBubble: {
      alignSelf: isAr ? "flex-end" : "flex-start",
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: isAr ? 1 : 3,
      borderLeftColor: isAr ? colors.border : colors.gold,
      borderRightWidth: isAr ? 3 : 1,
      borderRightColor: isAr ? colors.gold : colors.border,
      marginBottom: 12,
    },
    // Suggestion chips
    suggestionsRow: {
      flexDirection: isAr ? "row-reverse" : "row",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 8,
      marginBottom: 4,
    },
    chip: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.goldLight,
      borderWidth: 1,
      borderColor: colors.gold + "60",
    },
    chipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.navyLight,
    },
    // Input bar
    inputBar: {
      flexDirection: isAr ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: bottomPad > 84 ? bottomPad - 84 + 10 : 10,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    inputBox: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: colors.muted,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: 10,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.foreground,
      textAlignVertical: "center",
      textAlign: isAr ? "right" : "left",
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.gold,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.gold,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    sendBtnDisabled: { backgroundColor: colors.muted, shadowOpacity: 0 },
  });

  const suggestions = isAr ? AR_SUGGESTIONS : EN_SUGGESTIONS;
  const showSuggestions = messages.length <= 1 && !isThinking;

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString(isAr ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMessage(msg: Message) {
    const isUser = msg.role === "user";
    return (
      <View
        key={msg.id}
        style={[S.msgRow, isUser ? S.msgRowUser : S.msgRowAI]}
      >
        <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleAI]}>
          {isUser ? (
            <Text style={S.msgTextUser}>{msg.content}</Text>
          ) : (
            <RichText text={msg.content} style={S.msgTextAI} />
          )}
        </View>
        <Text style={[S.timestamp, isUser && { textAlign: isAr ? "left" : "right" }]}>
          {formatTime(msg.ts)}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={S.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ── Header ── */}
      <View style={S.header}>
        <View style={S.headerLeft}>
          <Text style={S.headerTitle}>✨ {t.assistant.title}</Text>
          <Text style={S.headerSub}>{t.assistant.subtitle}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [S.clearBtn, pressed && { opacity: 0.7 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            clearMessages();
          }}
        >
          <MaterialIcons name="refresh" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}

        {/* Typing indicator */}
        {isThinking && (
          <View style={S.typingBubble}>
            <TypingDots />
          </View>
        )}

        {/* Suggestion chips — only after greeting */}
        {showSuggestions && (
          <View style={S.suggestionsRow}>
            {suggestions.map((q) => (
              <Pressable
                key={q}
                style={({ pressed }) => [S.chip, pressed && { opacity: 0.75 }]}
                onPress={() => handleSuggestion(q)}
              >
                <Text style={S.chipText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Input Bar ── */}
      <View style={S.inputBar}>
        <TextInput
          ref={inputRef}
          style={S.inputBox}
          value={input}
          onChangeText={setInput}
          placeholder={t.assistant.placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!isThinking}
        />
        <Pressable
          style={({ pressed }) => [
            S.sendBtn,
            (!input.trim() || isThinking) && S.sendBtnDisabled,
            pressed && input.trim() && { transform: [{ scale: 0.94 }] },
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isThinking}
        >
          <MaterialIcons
            name={isAr ? "arrow-back" : "arrow-forward"}
            size={20}
            color={!input.trim() || isThinking ? colors.mutedForeground : colors.navy}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
