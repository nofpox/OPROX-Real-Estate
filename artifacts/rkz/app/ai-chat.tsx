import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
const aiAvatar = require("../assets/ai-avatar.png");

const TRIGGER_RE_AR  = "تمام بدور لك الحين";
const TRIGGER_RE_EN  = "Great, searching for you now";
const TRIGGER_TUR_AR = "جهزت لك اقتراحات إقامتك";
const TRIGGER_TUR_EN = "here are your stay options";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ListingResult {
  id: number;
  title: string;
  propertyType: string;
  listingType: string;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  district: string | null;
  city: string | null;
  image: string | null;
}

type ChatMode = "real_estate" | "tourist" | "owner";

interface OwnerListingData {
  title: string;
  propertyType: string;
  listingType: string;
  city: string;
  district: string;
  price: number | null;
  areaSqm: number | null;
  bedrooms: number | null;
}

type ChatMessage =
  | { id: string; role: "user" | "assistant"; content: string; stagingCta?: boolean }
  | { id: string; role: "listings"; listings: ListingResult[]; mode: ChatMode }
  | { id: string; role: "owner_summary"; data: OwnerListingData; published?: boolean; publishedId?: number }
  | { id: string; role: "searching" };

type MicState = "idle" | "recording" | "processing";

// ── Helpers ────────────────────────────────────────────────────────────────────
const TRIGGER_OWN_AR = "جهزت ملخص عقارك";
const TRIGGER_OWN_EN = "your listing summary is ready";

function hasTrigger(text: string) {
  return text.includes(TRIGGER_RE_AR)  || text.includes(TRIGGER_RE_EN) ||
         text.includes(TRIGGER_TUR_AR) || text.includes(TRIGGER_TUR_EN);
}
function hasOwnerTrigger(text: string) {
  return text.includes(TRIGGER_OWN_AR) || text.includes(TRIGGER_OWN_EN);
}

function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

/** Returns true when the user's message is about décor / furnishing / interior design */
function hasDecorIntent(text: string): boolean {
  const t = text.toLowerCase();
  const ar = (kw: string) => text.includes(kw);
  const en = (kw: string) => t.includes(kw);
  return (
    ar("ديكور") || ar("تأثيث") || ar("تصميم داخلي") || ar("أثاث") ||
    ar("ترتيب الغرفة") || ar("تصميم الغرفة") || ar("تجهيز الغرفة") ||
    ar("مودرن") || ar("كلاسيك") || ar("مينيماليست") || ar("بوهيمي") ||
    ar("اسكندنافي") || ar("أرت ديكو") || ar("صناعي") || ar("سعودي حديث") ||
    ar("المصمم الذكي") || ar("تأثيث ذكي") || ar("تأثيث بالذكاء") ||
    en("decor") || en("furnish") || en("interior design") || en("staging") ||
    en("furniture") || en("room design") || en("modern style") ||
    en("bohemian") || en("minimalist") || en("scandinavian") ||
    en("art deco") || en("industrial style") || en("ai staging")
  );
}

function fmtPrice(price: number | null, currency = "SAR") {
  if (!price) return "—";
  return `${price.toLocaleString("en-SA")} ${currency}`;
}

const PT_LABELS: Record<string, string> = {
  villa: "فيلا", apartment: "شقة", commercial: "تجاري",
  land: "أرض", hotel: "فندق", compound: "مجمع سكني",
};

// ── API helpers ────────────────────────────────────────────────────────────────
function apiBase(domain: string) {
  return domain ? `https://${domain}` : "";
}

async function callAiChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  domain: string,
): Promise<string> {
  const res = await fetch(`${apiBase(domain)}/api/rkz/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("API error");
  const data = (await res.json()) as { reply: string };
  return data.reply ?? "";
}

async function searchListings(
  messages: Array<{ role: string; content: string }>,
  domain: string,
): Promise<{ listings: ListingResult[]; mode: ChatMode }> {
  const res = await fetch(`${apiBase(domain)}/api/rkz/search-listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as { listings: ListingResult[]; mode: ChatMode };
  return { listings: data.listings ?? [], mode: data.mode ?? "real_estate" };
}

async function extractOwnerData(messages: Array<{ role: string; content: string }>, domain: string): Promise<OwnerListingData> {
  const res = await fetch(`${apiBase(domain)}/api/rkz/extract-owner-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Extraction failed");
  return res.json() as Promise<OwnerListingData>;
}

async function submitOwnerListing(data: OwnerListingData, domain: string): Promise<{ success: boolean; id: number }> {
  const res = await fetch(`${apiBase(domain)}/api/rkz/owner-submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Submit failed");
  return res.json() as Promise<{ success: boolean; id: number }>;
}

async function transcribeAudio(blob: Blob, domain: string): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "voice.webm");
  const res = await fetch(`${apiBase(domain)}/api/rkz/transcribe`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Transcription failed");
  const data = (await res.json()) as { text: string };
  return data.text ?? "";
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function TypingDots() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 420);
    return () => clearInterval(t);
  }, []);
  return <View style={s.bubble}><Text style={s.botText}>{"●".repeat(dot + 1)}</Text></View>;
}

function SearchingCard({ isAr }: { isAr: boolean }) {
  return (
    <View style={s.searchingCard}>
      <ActivityIndicator color={GOLD} size="small" />
      <Text style={s.searchingText}>
        {isAr ? "جارٍ البحث في قاعدة العقارات..." : "Searching property database..."}
      </Text>
    </View>
  );
}

function ListingCard({ listing, isAr, domain, isTourist }: {
  listing: ListingResult; isAr: boolean; domain: string; isTourist: boolean;
}) {
  const ptLabel = isAr ? (PT_LABELS[listing.propertyType] ?? listing.propertyType) : listing.propertyType;
  const portalBase = domain ? `https://${domain}` : "";
  const url = `${portalBase}/listings/${listing.id}`;
  const priceLabel = isTourist
    ? `${fmtPrice(listing.price, listing.currency)}${isAr ? "/ليلة" : "/night"}`
    : fmtPrice(listing.price, listing.currency);

  return (
    <View style={s.listingCard}>
      {listing.image ? (
        <Image source={{ uri: listing.image }} style={s.listingImg} resizeMode="cover" />
      ) : (
        <View style={[s.listingImg, s.listingImgFallback]}>
          <Text style={{ fontSize: 28 }}>{isTourist ? "🏨" : "🏠"}</Text>
        </View>
      )}

      <View style={s.listingBadge}>
        <Text style={s.listingBadgeText}>{ptLabel}</Text>
      </View>
      {isTourist && (
        <View style={[s.listingBadge, { right: 8, left: undefined, backgroundColor: "#0891b2" }]}>
          <Text style={s.listingBadgeText}>{isAr ? "🏨 إقامة" : "🏨 Stay"}</Text>
        </View>
      )}
      {!isTourist && listing.listingType === "rent" && (
        <View style={[s.listingBadge, { right: 8, left: undefined, backgroundColor: "#059669" }]}>
          <Text style={s.listingBadgeText}>{isAr ? "إيجار" : "Rent"}</Text>
        </View>
      )}

      <View style={s.listingBody}>
        <Text style={s.listingTitle} numberOfLines={1}>{listing.title}</Text>

        <View style={s.listingRow}>
          <MaterialIcons name="location-on" size={12} color="rgba(15,32,64,0.45)" />
          <Text style={s.listingMeta} numberOfLines={1}>
            {[listing.district, listing.city].filter(Boolean).join("، ")}
          </Text>
        </View>

        <View style={[s.listingRow, { justifyContent: "space-between" }]}>
          <Text style={s.listingPrice}>{priceLabel}</Text>
          {listing.bedrooms != null && (
            <View style={s.listingRow}>
              <MaterialIcons name="bed" size={13} color="rgba(15,32,64,0.45)" />
              <Text style={s.listingMeta}>{listing.bedrooms} {isAr ? "غرف" : "bd"}</Text>
            </View>
          )}
        </View>

        <Pressable style={s.detailsBtn} onPress={() => Linking.openURL(url)}>
          <MaterialIcons name="open-in-new" size={13} color="#fff" />
          <Text style={s.detailsBtnText}>{isAr ? "تفاصيل أكثر" : "More Details"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const PT_LABELS_EN: Record<string, string> = {
  villa: "Villa", apartment: "Apartment", commercial: "Commercial",
  land: "Land", hotel: "Hotel", compound: "Compound",
};
const LT_LABELS: Record<string, { ar: string; en: string }> = {
  sale: { ar: "بيع", en: "For Sale" },
  rent: { ar: "إيجار", en: "For Rent" },
};

// ── Staging CTA Card ────────────────────────────────────────────────────────
function StagingCtaCard({ isAr }: { isAr: boolean }) {
  return (
    <Pressable
      style={stg.card}
      onPress={() => router.push("/ai-staging" as never)}
    >
      <View style={stg.top}>
        <Text style={stg.emoji}>🪄</Text>
        <View style={{ flex: 1 }}>
          <Text style={stg.title}>{isAr ? "المُصمّم الذكي" : "AI Staging"}</Text>
          <Text style={stg.sub}>{isAr ? "أثّث غرفتك بالذكاء الاصطناعي" : "Furnish your room with AI"}</Text>
        </View>
        <MaterialIcons name={isAr ? "arrow-back" : "arrow-forward"} size={20} color="#c9a84c" />
      </View>
      <View style={stg.styles}>
        {["مودرن", "كلاسيك", "سعودي", "بوهيمي", "مينيمال", "اسكندنافي", "صناعي", "أرت ديكو"].map((n) => (
          <View key={n} style={stg.chip}>
            <Text style={stg.chipText}>{n}</Text>
          </View>
        ))}
      </View>
      <View style={stg.btn}>
        <Text style={stg.btnText}>{isAr ? "🪄 افتح المُصمّم الذكي" : "🪄 Open AI Staging"}</Text>
      </View>
    </Pressable>
  );
}
const GOLD_C = "#c9a84c";
const NAVY_C = "#0f2040";
const stg = StyleSheet.create({
  card: { backgroundColor: `${NAVY_C}`, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1.5, borderColor: `${GOLD_C}55`, overflow: "hidden" },
  top:  { flexDirection: "row", alignItems: "center", gap: 10 },
  emoji:{ fontSize: 28 },
  title:{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  sub:  { fontSize: 11, color: `${GOLD_C}bb`, marginTop: 1 },
  styles:{ flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: `${GOLD_C}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${GOLD_C}44` },
  chipText:{ fontSize: 10, color: GOLD_C, fontFamily: "Inter_600SemiBold" },
  btn:  { backgroundColor: GOLD_C, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText:{ fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY_C },
});

function OwnerSummaryCard({
  msg, isAr, domain,
  onPublish,
}: {
  msg: Extract<ChatMessage, { role: "owner_summary" }>;
  isAr: boolean;
  domain: string;
  onPublish: (msgId: string) => Promise<void>;
}) {
  const [publishing, setPublishing] = useState(false);
  const d = msg.data;
  const ptLabel = isAr ? (PT_LABELS[d.propertyType] ?? d.propertyType) : (PT_LABELS_EN[d.propertyType] ?? d.propertyType);
  const ltLabel = isAr ? (LT_LABELS[d.listingType]?.ar ?? d.listingType) : (LT_LABELS[d.listingType]?.en ?? d.listingType);
  const location = [d.district, d.city].filter(Boolean).join("، ");
  const portalBase = domain ? `https://${domain}` : "";

  async function handlePress() {
    setPublishing(true);
    try { await onPublish(msg.id); } finally { setPublishing(false); }
  }

  if (msg.published) {
    return (
      <View style={[s.ownerCard, { backgroundColor: "#f0fdf4", borderColor: "#22c55e" }]}>
        <Text style={{ fontSize: 28, textAlign: "center" }}>✅</Text>
        <Text style={[s.ownerSuccess, { color: "#15803d" }]}>
          {isAr ? "تم نشر عقارك بنجاح!" : "Listing published successfully!"}
        </Text>
        <Pressable onPress={() => msg.publishedId && Linking.openURL(`${portalBase}/listings/${msg.publishedId}`)}>
          <Text style={[s.ownerLink, { color: NAVY }]}>
            {isAr ? "مشاهدة الإعلان ↗" : "View Listing ↗"}
          </Text>
        </Pressable>
      </View>
    );
  }

  const rows = [
    { label: isAr ? "النوع" : "Type", value: `${ptLabel} — ${ltLabel}` },
    { label: isAr ? "الموقع" : "Location", value: location || "—" },
    { label: isAr ? "السعر" : "Price", value: d.price ? `${d.price.toLocaleString("en-SA")} SAR` : "—" },
    { label: isAr ? "المساحة" : "Area", value: d.areaSqm ? `${d.areaSqm} م²` : "—" },
    { label: isAr ? "الغرف" : "Rooms", value: d.bedrooms ? String(d.bedrooms) : "—" },
  ];

  return (
    <View style={s.ownerCard}>
      <View style={[s.ownerHeader, { backgroundColor: NAVY }]}>
        <Text style={[s.ownerHeaderText, { color: GOLD }]}>
          📋 {isAr ? "ملخص عقارك" : "Your Listing Summary"}
        </Text>
      </View>
      <View style={s.ownerBody}>
        {rows.map(({ label, value }) => (
          <View key={label} style={s.ownerRow}>
            <Text style={s.ownerRowLabel}>{label}</Text>
            <Text style={s.ownerRowValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [s.publishBtn, { opacity: pressed || publishing ? 0.7 : 1 }]}
        onPress={handlePress}
        disabled={publishing}>
        {publishing
          ? <ActivityIndicator size="small" color={NAVY} />
          : <Text style={s.publishBtnText}>{isAr ? "🚀 انشر العقار" : "🚀 Publish Listing"}</Text>}
      </Pressable>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AiChatScreen() {
  const { isAr } = useLocale();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";

  const greeting: ChatMessage = {
    id: "0", role: "assistant",
    content: isAr
      ? "يا هلا والله 👋\nتبغى تسكن، تسافر، ولا عندك عقار تبي تنشره؟"
      : "Welcome! 👋\nLooking to find a home, plan a stay, or list your property?",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const userScrolledUp = useRef(false);

  function scrollBottom(force = false) {
    if (!force && userScrolledUp.current) return;
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
  }

  // After trigger phrase → search DB → inject listings card
  const fetchAndShowListings = useCallback(
    async (history: Array<{ role: string; content: string }>) => {
      const searchId = `search_${Date.now()}`;
      setMessages((prev) => [...prev, { id: searchId, role: "searching" }]);
      scrollBottom();
      try {
        const { listings, mode } = await searchListings(history, domain);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== searchId),
          { id: `listings_${Date.now()}`, role: "listings", listings, mode },
        ]);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== searchId));
      }
      scrollBottom();
    },
    [domain],
  );

  // After owner trigger → extract data → inject owner summary card
  const fetchAndShowOwnerSummary = useCallback(
    async (history: Array<{ role: string; content: string }>) => {
      const searchId = `search_${Date.now()}`;
      setMessages((prev) => [...prev, { id: searchId, role: "searching" }]);
      scrollBottom();
      try {
        const data = await extractOwnerData(history, domain);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== searchId),
          { id: `owner_${Date.now()}`, role: "owner_summary", data, published: false },
        ]);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== searchId));
      }
      scrollBottom();
    },
    [domain],
  );

  const handlePublish = useCallback(
    async (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg || msg.role !== "owner_summary") return;
      const result = await submitOwnerListing(msg.data, domain);
      setMessages((prev) =>
        prev.map((m) => m.id === msgId ? { ...m, published: true, publishedId: result.id } : m)
      );
      scrollBottom();
    },
    [messages, domain],
  );

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const trimmed = text.trim();
      setInput("");
      userScrolledUp.current = false;

      // ── Staging deep-link shortcut ────────────────────────────────────────
      if (trimmed === "__open_staging__") {
        router.push("/ai-staging" as never);
        return;
      }

      const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: trimmed };
      setMessages((prev) => {
        const updated = [...prev, userMsg];

        // ── Local décor/staging intent — no API call needed ───────────────
        if (hasDecorIntent(trimmed)) {
          const arReply = isAr;
          const ctaReply: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            stagingCta: true,
            content: arReply
              ? `🪄 **المُصمّم الذكي — أثّث غرفتك بالذكاء الاصطناعي!**\n\nاختر من **8 أنماط**: مودرن، كلاسيك، سعودي حديث، بوهيمي، صناعي، مينيماليست، اسكندنافي، أرت ديكو.\n\nصوّر الغرفة الفارغة واحصل على نتيجة احترافية خلال ثوانٍ مع مقارنة قبل/بعد تفاعلية. 👇`
              : `🪄 **AI Staging — Furnish any room with AI!**\n\nChoose from **8 styles**: Modern, Classic, Modern Saudi, Bohemian, Industrial, Minimalist, Scandinavian, Luxury Art Deco.\n\nPhoto the empty room and get a professional result in seconds with an interactive before/after slider. 👇`,
          };
          return [...updated, ctaReply];
        }

        (async () => {
          setLoading(true);
          scrollBottom(true);
          try {
            const history = updated
              .filter((m): m is { id: string; role: "user" | "assistant"; content: string } =>
                m.role === "user" || m.role === "assistant")
              .filter((m) => m.id !== "0")
              .map((m) => ({ role: m.role, content: m.content }));

            const reply = await callAiChat(history, domain);
            const replyMsg: ChatMessage = { id: Date.now().toString() + "r", role: "assistant", content: reply };
            setMessages((p) => [...p, replyMsg]);

            if (hasTrigger(reply)) {
              await fetchAndShowListings([...history, { role: "assistant", content: reply }]);
            } else if (hasOwnerTrigger(reply)) {
              await fetchAndShowOwnerSummary([...history, { role: "assistant", content: reply }]);
            }
          } catch {
            setMessages((p) => [...p, {
              id: Date.now().toString() + "e", role: "assistant",
              content: isAr
                ? "عذراً يا غالي، ما قدرت أتواصل مع الخادم. حاول مرة ثانية 🙏"
                : "Sorry, could not reach the server. Please try again.",
            }]);
          } finally {
            setLoading(false);
            scrollBottom();
          }
        })();
        return updated;
      });
    },
    [loading, domain, isAr, fetchAndShowListings, fetchAndShowOwnerSummary],
  );

  // ── Mic (web via MediaRecorder) ────────────────────────────────────────────
  async function toggleMic() {
    if (Platform.OS !== "web") {
      alert(isAr ? "التسجيل الصوتي متاح على الويب فقط حالياً" : "Voice recording is available on web only for now.");
      return;
    }
    if (micState === "recording") { mediaRecorderRef.current?.stop(); return; }
    if (micState === "processing" || loading) return;

    try {
      // @ts-ignore
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
        } catch { /* silent */ } finally { setMicState("idle"); }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setMicState("recording");
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 60_000);
    } catch {
      alert(isAr ? "تعذّر الوصول للميكروفون. تأكد من منح الإذن." : "Cannot access microphone. Please allow permission.");
    }
  }

  const userAr = isArabic(
    messages.filter((m): m is { id: string; role: "user"; content: string } => m.role === "user")
      .map((m) => m.content).join("") || (isAr ? "أ" : ""),
  );

  const micIcon = micState === "recording" ? "mic-off" : "mic";
  const micColor = micState === "recording" ? "#ef4444" : micState === "processing" ? "#f59e0b" : NAVY;

  // Build FlatList items (include typing indicator if loading)
  const listData: ChatMessage[] = loading
    ? [...messages, { id: "__typing__", role: "assistant", content: "" }]
    : messages;

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <MaterialIcons name={isAr ? "arrow-forward" : "arrow-back"} size={22} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <Image source={aiAvatar} style={{ width: 36, height: 36, resizeMode: 'contain' }} />
          <View>
            <Text style={s.headerTitle}>Housin AI</Text>
            <Text style={s.headerSub}>
              {isAr ? "سكرتيرك العقاري الذكي · متاح دائماً" : "Your Smart Real Estate Secretary · Always on"}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 12 }}
        onScrollBeginDrag={() => { userScrolledUp.current = true; }}
        onScrollEndDrag={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
          if (atBottom) userScrolledUp.current = false;
        }}
        onMomentumScrollEnd={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
          if (atBottom) userScrolledUp.current = false;
        }}
        renderItem={({ item }) => {
          // Typing indicator
          if (item.id === "__typing__") {
            return (
              <View style={s.row}>
                <Image source={aiAvatar} style={s.avatarImg} />
                <TypingDots />
              </View>
            );
          }

          // Searching indicator
          if (item.role === "searching") {
            return (
              <View style={s.row}>
                <Image source={aiAvatar} style={s.avatarImg} />
                <SearchingCard isAr={isAr} />
              </View>
            );
          }

          // Owner summary card
          if (item.role === "owner_summary") {
            return (
              <View key={item.id} style={{ gap: 8 }}>
                <View style={[s.row, { alignItems: "center" }]}>
                  <Text style={s.avatar}>🏠</Text>
                  <Text style={s.resultsMeta}>{isAr ? "ملخص العقار" : "Listing Summary"}</Text>
                </View>
                <OwnerSummaryCard msg={item} isAr={isAr} domain={domain} onPublish={handlePublish} />
              </View>
            );
          }

          // Listings cards
          if (item.role === "listings") {
            const isTourist = item.mode === "tourist";
            const label = isTourist
              ? (isAr ? `وجدت ${item.listings.length} خيار إقامة يناسبك 🏨` : `Found ${item.listings.length} stay options 🏨`)
              : (isAr ? `وجدت ${item.listings.length} عقار يناسبك 🏡` : `Found ${item.listings.length} matching properties 🏡`);
            return (
              <View style={{ gap: 8 }}>
                <View style={[s.row, { alignItems: "center" }]}>
                  {isTourist ? <Text style={s.avatar}>🏨</Text> : <Image source={aiAvatar} style={s.avatarImg} />}
                  <Text style={s.resultsMeta}>{label}</Text>
                </View>
                {item.listings.map((l: ListingResult) => (
                  <ListingCard key={l.id} listing={l} isAr={isAr} domain={domain} isTourist={isTourist} />
                ))}
              </View>
            );
          }

          // Normal text message (+ optional staging CTA card)
          const isUser = item.role === "user";
          const msgAr = isArabic(item.content);
          const hasStagingCta = !isUser && (item as any).stagingCta === true;
          return (
            <View style={{ gap: 8 }}>
              <View style={[s.row, isUser && s.rowReverse]}>
                {!isUser && <Image source={aiAvatar} style={s.avatarImg} />}
                <View style={[s.bubble, isUser ? s.userBubble : s.botBubble]}>
                  <Text style={[isUser ? s.userText : s.botText, { textAlign: msgAr ? "right" : "left" }]}>
                    {item.content}
                  </Text>
                </View>
                {isUser && <Text style={s.avatar}>👤</Text>}
              </View>
              {hasStagingCta && <StagingCtaCard isAr={isAr} />}
            </View>
          );
        }}
      />

      {/* Recording indicator */}
      {micState === "recording" && (
        <View style={s.recordingBar}>
          <View style={s.recDot} />
          <Text style={s.recText}>{isAr ? "جارٍ التسجيل... اضغط 🎤 للإيقاف" : "Recording... tap 🎤 to stop"}</Text>
        </View>
      )}
      {micState === "processing" && (
        <View style={[s.recordingBar, { backgroundColor: "#f59e0b" }]}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={s.recText}>{isAr ? "جارٍ التحويل للنص..." : "Transcribing..."}</Text>
        </View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable style={s.iconBtn} disabled>
            <Text style={{ fontSize: 22, opacity: 0.3 }}>📹</Text>
          </Pressable>

          <Pressable
            style={[
              s.iconBtn,
              micState === "recording" && { backgroundColor: "#fee2e2" },
              micState === "processing" && { backgroundColor: "#fef3c7" },
            ]}
            onPress={toggleMic}
            disabled={loading}>
            {micState === "processing" ? (
              <ActivityIndicator color={micColor} size="small" />
            ) : (
              <MaterialIcons name={micIcon as any} size={22} color={micColor} />
            )}
          </Pressable>

          <TextInput
            style={[s.textInput, { textAlign: userAr ? "right" : "left" }]}
            placeholder={
              micState === "recording" ? (isAr ? "🔴 جارٍ التسجيل..." : "🔴 Recording...")
              : micState === "processing" ? (isAr ? "⏳ جارٍ التحويل..." : "⏳ Transcribing...")
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
            style={[s.sendBtn, (!input.trim() || loading || micState !== "idle") && s.sendBtnDisabled]}
            onPress={() => sendText(input)}
            disabled={!input.trim() || loading || micState !== "idle"}>
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    backgroundColor: NAVY, paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerTitle:  { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub:    { fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" },

  row:        { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowReverse: { flexDirection: "row-reverse" },
  avatar:     { fontSize: 22, marginBottom: 2 },
  avatarImg:  { width: 30, height: 30, resizeMode: 'contain', marginBottom: 2 },
  resultsMeta: { fontSize: 12, color: "rgba(15,32,64,0.5)", fontFamily: "Inter_500Medium" },

  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  botBubble: {
    backgroundColor: "#fff", borderBottomLeftRadius: 4,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  userBubble: { backgroundColor: NAVY, borderBottomRightRadius: 4 },
  botText:  { fontSize: 14, fontFamily: "Inter_400Regular", color: NAVY, lineHeight: 21 },
  userText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff",  lineHeight: 21 },

  // Searching card
  searchingCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: `${GOLD}40`,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: NAVY },

  // Listing card
  listingCard: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: "rgba(15,32,64,0.08)",
  },
  listingImg: { width: "100%", height: 130 },
  listingImgFallback: { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  listingBadge: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: NAVY, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  listingBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: GOLD },
  listingBody:  { padding: 12, gap: 6 },
  listingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: NAVY },
  listingRow:   { flexDirection: "row", alignItems: "center", gap: 4 },
  listingMeta:  { fontSize: 12, color: "rgba(15,32,64,0.55)", fontFamily: "Inter_400Regular", flex: 1 },
  listingPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: GOLD },
  detailsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: NAVY, borderRadius: 10,
    paddingVertical: 8, marginTop: 4,
  },
  detailsBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Recording
  recordingBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#ef4444", paddingHorizontal: 16, paddingVertical: 8,
  },
  recDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  recText: { fontSize: 13, color: "#fff", fontFamily: "Inter_500Medium" },

  // Input
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

  // Owner summary card
  ownerCard: {
    borderRadius: 14, overflow: "hidden",
    borderWidth: 1.5, borderColor: `${GOLD}99`,
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ownerHeader: { paddingHorizontal: 14, paddingVertical: 10 },
  ownerHeaderText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  ownerBody: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  ownerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  ownerRowLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(15,32,64,0.5)", flex: 1 },
  ownerRowValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: NAVY, flex: 2, textAlign: "right" },
  ownerSuccess: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 4 },
  ownerLink: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 6, textDecorationLine: "underline" },
  publishBtn: {
    marginHorizontal: 14, marginBottom: 12, paddingVertical: 11, borderRadius: 12,
    backgroundColor: GOLD, alignItems: "center", justifyContent: "center",
  },
  publishBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: NAVY },
});
