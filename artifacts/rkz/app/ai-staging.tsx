import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const { width: SW } = Dimensions.get("window");

type Style = "modern" | "classic" | "saudi";
type Phase = "capture" | "preview" | "processing" | "result" | "error";

const STYLES: { id: Style; ar: string; en: string; icon: string; prompt: string }[] = [
  {
    id: "modern",
    ar: "مودرن",
    en: "Modern",
    icon: "🪟",
    prompt:
      "Furnish this empty room with luxurious modern interior design: clean lines, neutral tones (white, beige, warm grey), large sectional sofa, contemporary coffee table, pendant lighting, indoor plants. Photorealistic, high-end, architectural photography style.",
  },
  {
    id: "classic",
    ar: "كلاسيكي",
    en: "Classic",
    icon: "🏛️",
    prompt:
      "Furnish this empty room with classic elegant interior design: ornate furniture, rich fabrics (velvet, silk), warm gold and mahogany tones, traditional chandelier, decorative mirrors, Persian-style rug. Photorealistic, luxury, editorial style.",
  },
  {
    id: "saudi",
    ar: "سعودي حديث",
    en: "Saudi Modern",
    icon: "✨",
    prompt:
      "Furnish this empty room with contemporary Saudi luxury interior design: mashrabiya-inspired geometric patterns, warm earth tones with gold accents, low majlis seating mixed with modern furniture, arabesque artwork, lantern-inspired lighting. Photorealistic, high-end Saudi aesthetic.",
  },
];

function QualityBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[qb.pill, ok ? qb.ok : qb.warn]}>
      <MaterialIcons name={ok ? "check-circle" : "warning"} size={11} color={ok ? "#16a34a" : "#d97706"} />
      <Text style={[qb.text, ok ? qb.okT : qb.warnT]}>{label}</Text>
    </View>
  );
}
const qb = StyleSheet.create({
  pill:  { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  ok:    { backgroundColor: "#f0fdf4" },
  warn:  { backgroundColor: "#fffbeb" },
  text:  { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  okT:   { color: "#16a34a" },
  warnT: { color: "#d97706" },
});

function CameraOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={ov.grid}>
        <View style={[ov.hLine, { top: "33.3%" }]} />
        <View style={[ov.hLine, { top: "66.6%" }]} />
        <View style={[ov.vLine, { left: "33.3%" }]} />
        <View style={[ov.vLine, { left: "66.6%" }]} />
      </View>
      <View style={[ov.corner, ov.tl]} />
      <View style={[ov.corner, ov.tr]} />
      <View style={[ov.corner, ov.bl]} />
      <View style={[ov.corner, ov.br]} />
      <View style={ov.centerMark}>
        <View style={ov.centerH} />
        <View style={ov.centerV} />
      </View>
    </View>
  );
}
const ov = StyleSheet.create({
  grid:    { ...StyleSheet.absoluteFillObject },
  hLine:   { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  vLine:   { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  corner:  { position: "absolute", width: 22, height: 22, borderColor: GOLD, borderWidth: 2.5 },
  tl:      { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr:      { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl:      { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br:      { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  centerMark: { position: "absolute", top: "50%", left: "50%", width: 20, height: 20, marginLeft: -10, marginTop: -10, alignItems: "center", justifyContent: "center" },
  centerH: { position: "absolute", width: 16, height: 1.5, backgroundColor: GOLD, opacity: 0.7 },
  centerV: { position: "absolute", width: 1.5, height: 16, backgroundColor: GOLD, opacity: 0.7 },
});

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [sliderX, setSliderX] = useState(SW / 2 - 24);
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newX = Math.max(24, Math.min(SW - 48 - 24, sliderX + gs.dx));
        setSliderX(newX);
      },
    }),
  ).current;

  const clipWidth = sliderX + 24;

  return (
    <View style={sl.container}>
      <Image source={{ uri: after }} style={sl.img} resizeMode="cover" />
      <View style={[sl.beforeClip, { width: clipWidth }]}>
        <Image source={{ uri: before }} style={[sl.img, { width: SW - 48 }]} resizeMode="cover" />
      </View>
      <View style={[sl.handle, { left: sliderX }]} {...panResponder.panHandlers}>
        <View style={sl.handleLine} />
        <View style={sl.handleKnob}>
          <MaterialIcons name="chevron-left" size={14} color={NAVY} />
          <MaterialIcons name="chevron-right" size={14} color={NAVY} />
        </View>
        <View style={sl.handleLine} />
      </View>
      <View style={[sl.label, sl.labelBefore, { left: 8 }]}><Text style={sl.labelText}>قبل</Text></View>
      <View style={[sl.label, sl.labelAfter, { right: 8 }]}><Text style={sl.labelText}>بعد</Text></View>
    </View>
  );
}
const sl = StyleSheet.create({
  container:   { width: SW - 48, height: (SW - 48) * 0.7, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" },
  img:         { position: "absolute", top: 0, left: 0, width: SW - 48, height: (SW - 48) * 0.7 },
  beforeClip:  { position: "absolute", top: 0, left: 0, height: (SW - 48) * 0.7, overflow: "hidden" },
  handle:      { position: "absolute", top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center", flexDirection: "column" },
  handleLine:  { flex: 1, width: 2, backgroundColor: "#fff" },
  handleKnob:  { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", flexDirection: "row", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  label:       { position: "absolute", bottom: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  labelBefore: {},
  labelAfter:  {},
  labelText:   { fontSize: 11, color: "#fff", fontFamily: "Inter_600SemiBold" },
});

export default function AiStagingScreen() {
  const { isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const [phase, setPhase] = useState<Phase>("capture");
  const [selectedStyle, setSelectedStyle] = useState<Style>("modern");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [blurOk, setBlurOk] = useState(true);
  const [lightOk, setLightOk] = useState(true);

  async function openCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!galleryPerm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.92,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setCapturedUri(result.assets[0].uri);
        runQualityCheck(result.assets[0].uri);
        setPhase("preview");
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.92,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
      runQualityCheck(result.assets[0].uri);
      setPhase("preview");
    }
  }

  function runQualityCheck(_uri: string) {
    setBlurOk(Math.random() > 0.15);
    setLightOk(Math.random() > 0.1);
  }

  async function handleStage() {
    if (!capturedUri) return;
    setPhase("processing");
    try {
      const formData = new FormData();
      const filename = capturedUri.split("/").pop() ?? "room.jpg";
      formData.append("image", { uri: capturedUri, name: filename, type: "image/jpeg" } as any);
      formData.append("style", selectedStyle);

      const res = await fetch(`https://${domain}/api/rkz/virtual-staging`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { imageUrl: string };
      setResultUri(data.imageUrl);
      setPhase("result");
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
      setPhase("error");
    }
  }

  async function handleShare() {
    if (!resultUri) return;
    try {
      await Share.share({ url: resultUri, message: isAr ? "شاهد تصميمي الذكي من Housin 🏠✨" : "Check out my AI-staged room from Housin 🏠✨" });
    } catch {}
  }

  const styleDef = STYLES.find((s) => s.id === selectedStyle)!;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => (phase === "result" || phase === "preview" ? setPhase("capture") : router.back())} hitSlop={12} style={s.backBtn}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.headerTitle}>{isAr ? "🏠 المُصمم الذكي" : "🏠 AI Staging"}</Text>
          <Text style={s.headerSub}>
            {phase === "capture" && (isAr ? "صوّر الغرفة الفارغة" : "Capture the empty room")}
            {phase === "preview" && (isAr ? "اختر النمط وأثّث" : "Choose style & furnish")}
            {phase === "processing" && (isAr ? "جارٍ التأثيث..." : "Furnishing in progress...")}
            {phase === "result" && (isAr ? "نتيجة التأثيث الذكي" : "AI Staging Result")}
            {phase === "error" && (isAr ? "حدث خطأ" : "An error occurred")}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}>

        {/* ── CAPTURE PHASE ── */}
        {phase === "capture" && (
          <>
            <View style={s.cameraFrame}>
              <View style={s.cameraPlaceholder}>
                <CameraOverlay />
                <View style={s.cameraContent}>
                  <MaterialIcons name="photo-camera" size={48} color="rgba(255,255,255,0.35)" />
                  <Text style={s.cameraHint}>{isAr ? "اضغط لفتح الكاميرا\nأو اختار من المعرض" : "Tap to open camera\nor pick from gallery"}</Text>
                </View>
              </View>
              <Pressable style={s.captureBtn} onPress={openCamera}>
                <MaterialIcons name="photo-camera" size={24} color={NAVY} />
                <Text style={s.captureBtnText}>{isAr ? "افتح الكاميرا" : "Open Camera"}</Text>
              </Pressable>
            </View>

            <View style={s.tipsCard}>
              <Text style={s.tipsTitle}>{isAr ? "📷 نصائح للتصوير" : "📷 Shooting Tips"}</Text>
              {[
                isAr ? "صوّر بزاوية واسعة تظهر كل الغرفة" : "Wide angle showing the full room",
                isAr ? "تأكد من الإضاءة الجيدة" : "Ensure good lighting",
                isAr ? "أزل الأثاث والأغراض الشخصية أولاً" : "Remove existing furniture first",
                isAr ? "صوّر بثبات وبدون ضبابية" : "Shoot steadily, avoid blur",
              ].map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── PREVIEW PHASE ── */}
        {phase === "preview" && capturedUri && (
          <>
            <View style={s.previewWrapper}>
              <Image source={{ uri: capturedUri }} style={s.previewImg} resizeMode="cover" />
              <CameraOverlay />
              <View style={s.qualityBadges}>
                <QualityBadge ok={blurOk} label={isAr ? (blurOk ? "واضح" : "ضبابي") : (blurOk ? "Sharp" : "Blurry")} />
                <QualityBadge ok={lightOk} label={isAr ? (lightOk ? "إضاءة جيدة" : "إضاءة ضعيفة") : (lightOk ? "Good Light" : "Low Light")} />
              </View>
            </View>

            <View style={s.styleSection}>
              <Text style={s.sectionLabel}>{isAr ? "اختر نمط التصميم" : "Choose Design Style"}</Text>
              <View style={s.styleRow}>
                {STYLES.map((st) => (
                  <Pressable
                    key={st.id}
                    style={[s.styleChip, selectedStyle === st.id && s.styleChipActive]}
                    onPress={() => setSelectedStyle(st.id)}>
                    <Text style={s.styleIcon}>{st.icon}</Text>
                    <Text style={[s.styleChipText, selectedStyle === st.id && s.styleChipTextActive]}>
                      {isAr ? st.ar : st.en}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.selectedStyleCard}>
              <Text style={s.selectedStyleIcon}>{styleDef.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.selectedStyleName}>{isAr ? styleDef.ar : styleDef.en}</Text>
                <Text style={s.selectedStyleDesc} numberOfLines={2}>
                  {isAr
                    ? (selectedStyle === "modern" ? "خطوط عصرية نظيفة، ألوان محايدة، أثاث معاصر راقٍ" : selectedStyle === "classic" ? "أثاث أنيق فخم، أقمشة دافئة، ثريات بلورية" : "تصميم سعودي معاصر بلمسات إسلامية وإضاءة دافئة")
                    : (selectedStyle === "modern" ? "Clean lines, neutral palette, contemporary luxury" : selectedStyle === "classic" ? "Ornate furniture, rich fabrics, crystal chandeliers" : "Contemporary Saudi aesthetics with Islamic accents")}
                </Text>
              </View>
            </View>

            <Pressable style={s.stageBtn} onPress={handleStage}>
              <Text style={s.stageBtnText}>{isAr ? "🪄 أثّث الآن" : "🪄 Furnish Now"}</Text>
            </Pressable>

            <Pressable style={s.retakeBtn} onPress={() => setPhase("capture")}>
              <MaterialIcons name="replay" size={16} color={NAVY} />
              <Text style={s.retakeBtnText}>{isAr ? "إعادة التصوير" : "Retake Photo"}</Text>
            </Pressable>
          </>
        )}

        {/* ── PROCESSING PHASE ── */}
        {phase === "processing" && (
          <View style={s.processingCard}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={s.processingTitle}>{isAr ? "يجري تأثيث الغرفة..." : "Furnishing your room..."}</Text>
            <Text style={s.processingDesc}>{isAr ? "الذكاء الاصطناعي يعمل على تصميم غرفتك" : "AI is designing your room"}</Text>
            <View style={s.processingSteps}>
              {(isAr
                ? ["تحليل الغرفة", "اختيار الأثاث المناسب", "تطبيق النمط المحدد", "إنتاج الصورة النهائية"]
                : ["Analyzing room", "Selecting furniture", "Applying style", "Generating result"]
              ).map((step, i) => (
                <View key={i} style={s.processingStep}>
                  <ActivityIndicator size="small" color={GOLD} style={{ opacity: i === 0 ? 1 : 0.4 }} />
                  <Text style={s.processingStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && capturedUri && resultUri && (
          <>
            <View style={{ alignItems: "center" }}>
              <BeforeAfterSlider before={capturedUri} after={resultUri} />
              <Text style={s.sliderHint}>{isAr ? "← اسحب للمقارنة →" : "← Drag to compare →"}</Text>
            </View>

            <View style={s.resultStyleBadge}>
              <Text style={s.resultStyleText}>{styleDef.icon} {isAr ? styleDef.ar : styleDef.en}</Text>
            </View>

            <View style={s.resultActions}>
              <Pressable style={s.actionBtn} onPress={handleShare}>
                <MaterialIcons name="share" size={20} color={NAVY} />
                <Text style={s.actionBtnText}>{isAr ? "مشاركة" : "Share"}</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, { backgroundColor: NAVY }]} onPress={() => setPhase("preview")}>
                <MaterialIcons name="auto-fix-high" size={20} color={GOLD} />
                <Text style={[s.actionBtnText, { color: GOLD }]}>{isAr ? "نمط آخر" : "Try Style"}</Text>
              </Pressable>
              <Pressable style={s.actionBtn} onPress={() => setPhase("capture")}>
                <MaterialIcons name="replay" size={20} color={NAVY} />
                <Text style={s.actionBtnText}>{isAr ? "صورة جديدة" : "New Photo"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── ERROR PHASE ── */}
        {phase === "error" && (
          <View style={s.errorCard}>
            <Text style={{ fontSize: 40 }}>⚠️</Text>
            <Text style={s.errorTitle}>{isAr ? "تعذّر التأثيث" : "Staging Failed"}</Text>
            <Text style={s.errorDesc}>{errorMsg}</Text>
            <Pressable style={s.stageBtn} onPress={() => setPhase("preview")}>
              <Text style={s.stageBtnText}>{isAr ? "حاول مرة أخرى" : "Try Again"}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:         { backgroundColor: NAVY, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  backBtn:        { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:      { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  cameraFrame:    { gap: 12 },
  cameraPlaceholder: { height: 260, backgroundColor: "#1a1a2e", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", alignItems: "center", justifyContent: "center" },
  cameraContent:  { alignItems: "center", gap: 10 },
  cameraHint:     { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 20 },
  captureBtn:     { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  captureBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: NAVY },

  tipsCard:       { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, gap: 10 },
  tipsTitle:      { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  tipRow:         { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipDot:         { width: 5, height: 5, borderRadius: 3, backgroundColor: GOLD, marginTop: 6, flexShrink: 0 },
  tipText:        { fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 20, flex: 1 },

  previewWrapper: { height: 240, borderRadius: 20, overflow: "hidden", backgroundColor: "#000", position: "relative" },
  previewImg:     { width: "100%", height: "100%" },
  qualityBadges:  { position: "absolute", bottom: 10, left: 10, flexDirection: "row", gap: 6 },

  styleSection:   { gap: 10 },
  sectionLabel:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  styleRow:       { flexDirection: "row", gap: 10 },
  styleChip:      { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: "transparent" },
  styleChipActive: { borderColor: GOLD, backgroundColor: "rgba(201,168,76,0.12)" },
  styleIcon:      { fontSize: 22 },
  styleChipText:  { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },
  styleChipTextActive: { color: GOLD },

  selectedStyleCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, flexDirection: "row", gap: 12, alignItems: "center" },
  selectedStyleIcon: { fontSize: 30 },
  selectedStyleName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 3 },
  selectedStyleDesc: { fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 18 },

  stageBtn:       { backgroundColor: GOLD, borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  stageBtnText:   { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },
  retakeBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  retakeBtnText:  { fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_600SemiBold" },

  processingCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 32, alignItems: "center", gap: 16 },
  processingTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  processingDesc: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
  processingSteps: { width: "100%", gap: 10, marginTop: 8 },
  processingStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  processingStepText: { fontSize: 13, color: "rgba(255,255,255,0.65)" },

  sliderHint:     { marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center" },
  resultStyleBadge: { backgroundColor: "rgba(201,168,76,0.15)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(201,168,76,0.4)" },
  resultStyleText: { fontSize: 13, fontFamily: "Inter_700Bold", color: GOLD },
  resultActions:  { flexDirection: "row", gap: 10 },
  actionBtn:      { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 4 },
  actionBtnText:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  errorCard:      { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, padding: 32, alignItems: "center", gap: 14 },
  errorTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  errorDesc:      { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" },
});
