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

// ── Style catalogue ────────────────────────────────────────────────────────────
type StyleId =
  | "modern" | "classic" | "saudi" | "bohemian"
  | "industrial" | "minimalist" | "scandinavian" | "artdeco";

interface StyleDef {
  id: StyleId;
  icon: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  accent: string;
}

const STYLES: StyleDef[] = [
  {
    id: "modern",
    icon: "🪟",
    ar: "مودرن",          en: "Modern",
    descAr: "خطوط عصرية، ألوان محايدة، أثاث راقٍ",
    descEn: "Clean lines, neutral palette, luxury furniture",
    accent: "#6366f1",
  },
  {
    id: "classic",
    icon: "🏛️",
    ar: "كلاسيك",          en: "Classic",
    descAr: "أثاث منحوت فاخر، شاندليه بلوري، سجاد فارسي",
    descEn: "Ornate furniture, crystal chandelier, Persian rug",
    accent: "#b45309",
  },
  {
    id: "saudi",
    icon: "✨",
    ar: "سعودي حديث",    en: "Modern Saudi",
    descAr: "مشربية هندسية، مجلس منخفض، إضاءة فانوسية",
    descEn: "Mashrabiya screens, majlis seating, lantern lights",
    accent: "#c9a84c",
  },
  {
    id: "bohemian",
    icon: "🪴",
    ar: "بوهيمي",         en: "Bohemian",
    descAr: "نسيج عشوائي، نباتات معلقة، إضاءة خيوط دافئة",
    descEn: "Eclectic textiles, trailing plants, Edison lights",
    accent: "#d97706",
  },
  {
    id: "industrial",
    icon: "🏭",
    ar: "صناعي",          en: "Industrial",
    descAr: "خرسانة وطوب مكشوف، خشب معاد تدوير، بلب معدني",
    descEn: "Exposed concrete & brick, reclaimed wood, metal",
    accent: "#6b7280",
  },
  {
    id: "minimalist",
    icon: "⬜",
    ar: "مينيماليست",    en: "Minimalist",
    descAr: "أقل أثاث، مساحة بيضاء، تصميم نظيف تماماً",
    descEn: "Minimal furniture, white space, pure clean design",
    accent: "#9ca3af",
  },
  {
    id: "scandinavian",
    icon: "🌿",
    ar: "اسكندنافي",     en: "Scandinavian",
    descAr: "خشب بتش فاتح، فروة خروف، جو دافئ هادئ",
    descEn: "Birch wood, sheepskin, cosy Hygge atmosphere",
    accent: "#0891b2",
  },
  {
    id: "artdeco",
    icon: "💎",
    ar: "أرت ديكو فخم",  en: "Luxury Art Deco",
    descAr: "ذهب ومرمر، ألوان عميقة، بهرجة عشرينيات القرن الماضي",
    descEn: "Gold & marble, deep jewel tones, 1920s glamour",
    accent: "#a855f7",
  },
];

// ── Quality badge ──────────────────────────────────────────────────────────────
function QualityBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[qb.pill, ok ? qb.ok : qb.fail]}>
      <MaterialIcons name={ok ? "check-circle" : "cancel"} size={12} color={ok ? "#16a34a" : "#dc2626"} />
      <Text style={[qb.text, ok ? qb.okT : qb.failT]}>{label}</Text>
    </View>
  );
}
const qb = StyleSheet.create({
  pill:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  ok:    { backgroundColor: "rgba(22,163,74,0.18)" },
  fail:  { backgroundColor: "rgba(220,38,38,0.18)" },
  text:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  okT:   { color: "#86efac" },
  failT: { color: "#fca5a5" },
});

// ── Camera overlay ─────────────────────────────────────────────────────────────
function CameraOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[ov.hLine, { top: "33%" }]} />
      <View style={[ov.hLine, { top: "66%" }]} />
      <View style={[ov.vLine, { left: "33%" }]} />
      <View style={[ov.vLine, { left: "66%" }]} />
      <View style={[ov.corner, ov.tl]} /><View style={[ov.corner, ov.tr]} />
      <View style={[ov.corner, ov.bl]} /><View style={[ov.corner, ov.br]} />
      <View style={ov.center}><View style={ov.cH} /><View style={ov.cV} /></View>
    </View>
  );
}
const ov = StyleSheet.create({
  hLine:  { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  vLine:  { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  corner: { position: "absolute", width: 24, height: 24, borderColor: GOLD, borderWidth: 2.5 },
  tl: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  center: { position: "absolute", top: "50%", left: "50%", width: 20, height: 20, marginLeft: -10, marginTop: -10, alignItems: "center", justifyContent: "center" },
  cH: { position: "absolute", width: 18, height: 2, backgroundColor: GOLD, opacity: 0.7 },
  cV: { position: "absolute", width: 2, height: 18, backgroundColor: GOLD, opacity: 0.7 },
});

// ── Before/After slider ────────────────────────────────────────────────────────
const FRAME_W = SW - 32;
const FRAME_H = FRAME_W * 0.68;

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(FRAME_W / 2);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        setPos((p) => Math.max(20, Math.min(FRAME_W - 20, p + gs.dx)));
        (gs as any).dx = 0;
      },
    }),
  ).current;

  return (
    <View style={{ width: FRAME_W, height: FRAME_H, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" }}>
      <Image source={{ uri: after }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[{ position: "absolute", top: 0, left: 0, bottom: 0, width: pos, overflow: "hidden" }]}>
        <Image source={{ uri: before }} style={{ width: FRAME_W, height: FRAME_H }} resizeMode="cover" />
      </View>
      {/* Handle */}
      <View style={[sl.handle, { left: pos - 20 }]} {...pan.panHandlers}>
        <View style={sl.line} />
        <View style={sl.knob}>
          <MaterialIcons name="chevron-left" size={14} color={NAVY} />
          <MaterialIcons name="chevron-right" size={14} color={NAVY} />
        </View>
        <View style={sl.line} />
      </View>
      <View style={[sl.lbl, { left: 8 }]}><Text style={sl.lblT}>قبل</Text></View>
      <View style={[sl.lbl, { right: 8 }]}><Text style={sl.lblT}>بعد</Text></View>
    </View>
  );
}
const sl = StyleSheet.create({
  handle: { position: "absolute", top: 0, bottom: 0, width: 40, alignItems: "center", flexDirection: "column" },
  line:   { flex: 1, width: 2, backgroundColor: "rgba(255,255,255,0.9)" },
  knob:   { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", flexDirection: "row", elevation: 8, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6 },
  lbl:    { position: "absolute", bottom: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  lblT:   { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
});

// ── Main screen ────────────────────────────────────────────────────────────────
type Phase = "capture" | "quality_fail" | "preview" | "processing" | "result" | "error";

export default function AiStagingScreen() {
  const { isAr } = useLocale();
  const insets   = useSafeAreaInsets();
  const domain   = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const [phase,         setPhase]         = useState<Phase>("capture");
  const [selectedStyle, setSelectedStyle] = useState<StyleId>("modern");
  const [capturedUri,   setCapturedUri]   = useState<string | null>(null);
  const [resultUri,     setResultUri]     = useState<string | null>(null);
  const [errorMsg,      setErrorMsg]      = useState("");
  const [blurOk,        setBlurOk]        = useState(true);
  const [lightOk,       setLightOk]       = useState(true);
  const [qualityScore,  setQualityScore]  = useState(0);
  const [checkingQuality, setCheckingQuality] = useState(false);

  const styleDef = STYLES.find((s) => s.id === selectedStyle)!;

  // ── Open camera / gallery ──────────────────────────────────────────────────
  async function openCapture(source: "camera" | "gallery") {
    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { source = "gallery"; }
    }

    if (source === "camera") {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images", quality: 0.92,
      });
    } else {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", quality: 0.92,
      });
    }

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setCapturedUri(asset.uri);
    await checkQuality(asset);
  }

  // ── Server-side quality check ──────────────────────────────────────────────
  async function checkQuality(asset: ImagePicker.ImagePickerAsset) {
    setCheckingQuality(true);
    try {
      const formData = new FormData();
      const filename = asset.uri.split("/").pop() ?? "room.jpg";
      formData.append("image", { uri: asset.uri, name: filename, type: "image/jpeg" } as any);

      const res = await fetch(`https://${domain}/api/rkz/check-image-quality`, {
        method: "POST", body: formData,
      });

      if (res.ok) {
        const data = (await res.json()) as { blurOk: boolean; lightOk: boolean; score: number };
        setBlurOk(data.blurOk);
        setLightOk(data.lightOk);
        setQualityScore(data.score);
        if (!data.blurOk || !data.lightOk) {
          setPhase("quality_fail");
        } else {
          setPhase("preview");
        }
      } else {
        // Fallback: use file-size heuristic on client
        const fileSize = asset.fileSize ?? 50000;
        const pixels   = (asset.width ?? 800) * (asset.height ?? 600);
        const bpp      = fileSize / pixels;
        const blur     = bpp > 0.04;
        const light    = bpp > 0.025;
        setBlurOk(blur);
        setLightOk(light);
        setQualityScore(Math.min(100, Math.round(bpp * 800)));
        setPhase(!blur || !light ? "quality_fail" : "preview");
      }
    } catch {
      setBlurOk(true); setLightOk(true); setQualityScore(75);
      setPhase("preview");
    } finally {
      setCheckingQuality(false);
    }
  }

  // ── Send to staging API ────────────────────────────────────────────────────
  async function handleStage() {
    if (!capturedUri) return;
    setPhase("processing");
    try {
      const formData = new FormData();
      const filename = capturedUri.split("/").pop() ?? "room.jpg";
      formData.append("image", { uri: capturedUri, name: filename, type: "image/jpeg" } as any);
      formData.append("style", selectedStyle);

      const res = await fetch(`https://${domain}/api/rkz/virtual-staging`, {
        method: "POST", body: formData,
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
      await Share.share({
        url: resultUri.startsWith("data:") ? undefined : resultUri,
        message: isAr ? "شاهد تصميمي الذكي من Housin 🏠✨" : "My AI-staged room from Housin 🏠✨",
      });
    } catch {}
  }

  // ── Header sub-label ───────────────────────────────────────────────────────
  const subLabels: Record<Phase, string> = {
    capture:      isAr ? "صوّر الغرفة الفارغة" : "Capture the empty room",
    quality_fail: isAr ? "جودة الصورة غير كافية" : "Image quality too low",
    preview:      isAr ? "اختر النمط وأثّث" : "Choose style & furnish",
    processing:   isAr ? "جارٍ التأثيث..." : "Furnishing in progress...",
    result:       isAr ? "نتيجة التأثيث الذكي" : "AI Staging Result",
    error:        isAr ? "حدث خطأ" : "Error",
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#080e1d" }}>
      <StatusBar barStyle="light-content" backgroundColor="#080e1d" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => {
            if (phase === "result" || phase === "preview" || phase === "quality_fail") setPhase("capture");
            else router.back();
          }}
          hitSlop={14} style={s.backBtn}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.headerTitle}>{isAr ? "🏠 المُصمّم الذكي" : "🏠 AI Staging"}</Text>
          <Text style={s.headerSub}>{subLabels[phase]}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }}>

        {/* ══ CAPTURE ══════════════════════════════════════════════════════════ */}
        {phase === "capture" && (
          <>
            <View style={s.captureFrame}>
              <CameraOverlay />
              <View style={s.captureCenter}>
                <MaterialIcons name="photo-camera" size={52} color="rgba(255,255,255,0.3)" />
                <Text style={s.captureHint}>
                  {isAr
                    ? "التقط صورة للغرفة الفارغة\nأو اختر من المعرض"
                    : "Capture the empty room\nor pick from gallery"}
                </Text>
              </View>
            </View>

            <View style={s.captureActions}>
              <Pressable style={s.capturePrimary} onPress={() => openCapture("camera")}>
                <MaterialIcons name="photo-camera" size={22} color={NAVY} />
                <Text style={s.capturePrimaryText}>{isAr ? "افتح الكاميرا" : "Camera"}</Text>
              </Pressable>
              <Pressable style={s.captureSecondary} onPress={() => openCapture("gallery")}>
                <MaterialIcons name="photo-library" size={22} color={GOLD} />
                <Text style={s.captureSecondaryText}>{isAr ? "من المعرض" : "Gallery"}</Text>
              </Pressable>
            </View>

            {checkingQuality && (
              <View style={s.checkingCard}>
                <ActivityIndicator color={GOLD} />
                <Text style={s.checkingText}>{isAr ? "جارٍ فحص جودة الصورة..." : "Checking image quality..."}</Text>
              </View>
            )}

            {/* Tips */}
            <View style={s.tipsCard}>
              <Text style={s.tipsTitle}>{isAr ? "📷 نصائح للحصول على أفضل نتيجة" : "📷 Tips for best results"}</Text>
              {[
                [isAr ? "زاوية واسعة تُظهر كامل الغرفة" : "Wide angle showing the full room", "check-circle"],
                [isAr ? "إضاءة كافية — تجنب الظلام أو الإفراط" : "Good lighting — avoid dark or overlit", "check-circle"],
                [isAr ? "الغرفة فارغة تماماً من الأثاث" : "Room completely empty of furniture", "check-circle"],
                [isAr ? "صور بثبات دون ضبابية" : "Shoot steadily, no motion blur", "check-circle"],
              ].map(([tip, icon]) => (
                <View key={tip as string} style={s.tipRow}>
                  <MaterialIcons name={icon as any} size={14} color={GOLD} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══ QUALITY FAIL ═════════════════════════════════════════════════════ */}
        {phase === "quality_fail" && capturedUri && (
          <>
            <View style={s.qfPreview}>
              <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={s.qfOverlay} />
              <View style={s.qfBadges}>
                <QualityBadge ok={blurOk}  label={isAr ? (blurOk  ? "واضح" : "ضبابي")  : (blurOk  ? "Sharp"       : "Blurry")} />
                <QualityBadge ok={lightOk} label={isAr ? (lightOk ? "إضاءة جيدة" : "إضاءة ضعيفة") : (lightOk ? "Good Light"  : "Low Light")} />
              </View>
            </View>

            <View style={s.qfCard}>
              <Text style={{ fontSize: 36, textAlign: "center" }}>⚠️</Text>
              <Text style={s.qfTitle}>{isAr ? "جودة الصورة غير كافية" : "Image quality too low"}</Text>
              <Text style={s.qfDesc}>
                {isAr
                  ? (!blurOk ? "الصورة ضبابية — يرجى إعادة التصوير بثبات أكبر." : "الإضاءة ضعيفة جداً — يرجى تصوير الغرفة في ضوء أفضل.")
                  : (!blurOk ? "The image is blurry — please retake with a steadier hand." : "The lighting is too dark — please shoot in better light.")}
              </Text>
              <Text style={s.qfScore}>{isAr ? `نقاط الجودة: ${qualityScore}/100` : `Quality score: ${qualityScore}/100`}</Text>
            </View>

            <View style={s.captureActions}>
              <Pressable style={s.capturePrimary} onPress={() => openCapture("camera")}>
                <MaterialIcons name="replay" size={20} color={NAVY} />
                <Text style={s.capturePrimaryText}>{isAr ? "إعادة التصوير" : "Retake"}</Text>
              </Pressable>
              <Pressable style={s.captureSecondary} onPress={() => setPhase("preview")}>
                <MaterialIcons name="arrow-forward" size={20} color={GOLD} />
                <Text style={s.captureSecondaryText}>{isAr ? "المتابعة رغم ذلك" : "Continue anyway"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ══ PREVIEW ══════════════════════════════════════════════════════════ */}
        {phase === "preview" && capturedUri && (
          <>
            {/* Captured preview */}
            <View style={s.previewFrame}>
              <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <CameraOverlay />
              <View style={s.previewBadges}>
                <QualityBadge ok={blurOk}  label={isAr ? (blurOk  ? "واضح" : "ضبابي")  : (blurOk  ? "Sharp"      : "Blurry")} />
                <QualityBadge ok={lightOk} label={isAr ? (lightOk ? "إضاءة جيدة" : "ضعيفة") : (lightOk ? "Good Light" : "Low Light")} />
              </View>
            </View>

            {/* Style selector — horizontal scroll */}
            <View>
              <Text style={s.sectionLabel}>{isAr ? "🎨 اختر النمط" : "🎨 Choose Style"}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              >
                {STYLES.map((st) => {
                  const active = selectedStyle === st.id;
                  return (
                    <Pressable
                      key={st.id}
                      style={[s.styleChip, active && { borderColor: st.accent, backgroundColor: `${st.accent}22` }]}
                      onPress={() => setSelectedStyle(st.id)}
                    >
                      <Text style={s.styleChipIcon}>{st.icon}</Text>
                      <Text style={[s.styleChipLabel, active && { color: st.accent }]}>
                        {isAr ? st.ar : st.en}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selected style card */}
            <View style={[s.styleCard, { borderLeftColor: styleDef.accent }]}>
              <Text style={s.styleCardIcon}>{styleDef.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.styleCardName}>{isAr ? styleDef.ar : styleDef.en}</Text>
                <Text style={s.styleCardDesc}>{isAr ? styleDef.descAr : styleDef.descEn}</Text>
              </View>
              <View style={[s.styleCardDot, { backgroundColor: styleDef.accent }]} />
            </View>

            <Pressable style={[s.stageBtn, { shadowColor: styleDef.accent }]} onPress={handleStage}>
              <Text style={s.stageBtnText}>{isAr ? "🪄 أثّث الآن" : "🪄 Furnish Now"}</Text>
            </Pressable>

            <Pressable style={s.retakeRow} onPress={() => setPhase("capture")}>
              <MaterialIcons name="replay" size={15} color="rgba(255,255,255,0.45)" />
              <Text style={s.retakeText}>{isAr ? "إعادة التصوير" : "Retake photo"}</Text>
            </Pressable>
          </>
        )}

        {/* ══ PROCESSING ═══════════════════════════════════════════════════════ */}
        {phase === "processing" && (
          <View style={s.processingCard}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={s.processingTitle}>{isAr ? "جارٍ التأثيث..." : "Furnishing your room..."}</Text>
            <Text style={s.processingStyle}>{styleDef.icon} {isAr ? styleDef.ar : styleDef.en}</Text>
            <View style={s.processingSteps}>
              {(isAr
                ? ["تحليل بنية الغرفة", "اختيار الأثاث المناسب للنمط", "تطبيق الإضاءة والألوان", "إنتاج الصورة النهائية"]
                : ["Analysing room structure", "Selecting style furniture", "Applying lighting & colours", "Generating final image"]
              ).map((step, i) => (
                <View key={i} style={s.processingStep}>
                  <View style={[s.stepDot, i === 0 && s.stepDotActive]} />
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ RESULT ═══════════════════════════════════════════════════════════ */}
        {phase === "result" && capturedUri && resultUri && (
          <>
            <View style={{ alignItems: "center" }}>
              <BeforeAfterSlider before={capturedUri} after={resultUri} />
              <Text style={s.sliderHint}>{isAr ? "← اسحب للمقارنة →" : "← Drag to compare →"}</Text>
            </View>

            <View style={[s.resultBadge, { backgroundColor: `${styleDef.accent}22`, borderColor: `${styleDef.accent}66` }]}>
              <Text style={[s.resultBadgeText, { color: styleDef.accent }]}>
                {styleDef.icon}  {isAr ? styleDef.ar : styleDef.en}
              </Text>
            </View>

            <View style={s.resultActions}>
              <Pressable style={s.actionBtn} onPress={handleShare}>
                <MaterialIcons name="share" size={20} color="#fff" />
                <Text style={s.actionBtnText}>{isAr ? "مشاركة" : "Share"}</Text>
              </Pressable>
              <Pressable style={[s.actionBtn, { backgroundColor: `${styleDef.accent}22`, borderWidth: 1, borderColor: `${styleDef.accent}55` }]} onPress={() => setPhase("preview")}>
                <MaterialIcons name="auto-fix-high" size={20} color={styleDef.accent} />
                <Text style={[s.actionBtnText, { color: styleDef.accent }]}>{isAr ? "نمط آخر" : "Try Style"}</Text>
              </Pressable>
              <Pressable style={s.actionBtn} onPress={() => setPhase("capture")}>
                <MaterialIcons name="replay" size={20} color="#fff" />
                <Text style={s.actionBtnText}>{isAr ? "صورة جديدة" : "New Photo"}</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ══ ERROR ════════════════════════════════════════════════════════════ */}
        {phase === "error" && (
          <View style={s.errorCard}>
            <Text style={{ fontSize: 42, textAlign: "center" }}>⚠️</Text>
            <Text style={s.errorTitle}>{isAr ? "تعذّر التأثيث" : "Staging Failed"}</Text>
            <Text style={s.errorDesc} numberOfLines={4}>{errorMsg}</Text>
            <Pressable style={s.stageBtn} onPress={() => setPhase("preview")}>
              <Text style={s.stageBtnText}>{isAr ? "حاول مرة أخرى" : "Try Again"}</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:     { backgroundColor: NAVY, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  backBtn:    { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle:{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:  { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },

  captureFrame:  { height: 250, backgroundColor: "#111827", borderRadius: 20, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(201,168,76,0.35)", alignItems: "center", justifyContent: "center" },
  captureCenter: { alignItems: "center", gap: 10 },
  captureHint:   { fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 20 },

  captureActions:      { flexDirection: "row", gap: 10 },
  capturePrimary:      { flex: 1, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  capturePrimaryText:  { fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY },
  captureSecondary:    { flex: 1, backgroundColor: "rgba(201,168,76,0.12)", borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.4)" },
  captureSecondaryText:{ fontSize: 14, fontFamily: "Inter_700Bold", color: GOLD },

  checkingCard: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 12, padding: 14 },
  checkingText: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_600SemiBold" },

  tipsCard:  { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, gap: 10 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  tipRow:    { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipText:   { fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 18, flex: 1 },

  qfPreview: { height: 200, borderRadius: 16, overflow: "hidden", position: "relative" },
  qfOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  qfBadges:  { position: "absolute", bottom: 10, left: 10, flexDirection: "row", gap: 6 },
  qfCard:    { backgroundColor: "rgba(220,38,38,0.1)", borderRadius: 16, padding: 20, gap: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(220,38,38,0.3)" },
  qfTitle:   { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fca5a5", textAlign: "center" },
  qfDesc:    { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 20 },
  qfScore:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)" },

  previewFrame:  { height: 220, borderRadius: 16, overflow: "hidden", position: "relative" },
  previewBadges: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", gap: 6 },

  sectionLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8 },
  styleChip:    { alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", minWidth: 80 },
  styleChipIcon:{ fontSize: 22 },
  styleChipLabel:{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)", textAlign: "center" },

  styleCard:     { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderLeftWidth: 3 },
  styleCardIcon: { fontSize: 28 },
  styleCardName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 3 },
  styleCardDesc: { fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 17 },
  styleCardDot:  { width: 8, height: 8, borderRadius: 4 },

  stageBtn:     { backgroundColor: GOLD, borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  stageBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: NAVY },
  retakeRow:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 6 },
  retakeText:   { fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "Inter_600SemiBold" },

  processingCard:  { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 32, alignItems: "center", gap: 16 },
  processingTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  processingStyle: { fontSize: 14, color: GOLD, fontFamily: "Inter_600SemiBold" },
  processingSteps: { width: "100%", gap: 12, marginTop: 4 },
  processingStep:  { flexDirection: "row", alignItems: "center", gap: 10 },
  stepDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  stepDotActive:   { backgroundColor: GOLD },
  stepText:        { fontSize: 13, color: "rgba(255,255,255,0.6)" },

  sliderHint:    { marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  resultBadge:   { alignSelf: "flex-start", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1 },
  resultBadgeText:{ fontSize: 13, fontFamily: "Inter_700Bold" },
  resultActions: { flexDirection: "row", gap: 10 },
  actionBtn:     { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 5 },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  errorCard:  { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 32, alignItems: "center", gap: 14 },
  errorTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fca5a5" },
  errorDesc:  { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 18 },
});
