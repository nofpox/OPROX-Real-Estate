import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

// ── Constants ──────────────────────────────────────────────────────────────────
const ROZOZ_WHATSAPP = "https://wa.me/966500000000";
const SERVICE_REQUESTS_KEY = "rozoz_service_requests";
const DELEGATION_KEY       = "rozoz_delegation_status";

interface ServiceProvider {
  id: number;
  name: string;
  nameEn: string;
  specialty: string;
  specialtyEn: string;
  category: "maintenance" | "construction" | "cleaning" | "landscaping" | "electrical" | "plumbing";
  rating: number;
  phone: string;
}

interface ServiceRequest {
  id: string;
  providerId: number;
  providerName: string;
  type: "direct" | "rozoz";
  status: "pending" | "in_progress" | "done";
  ts: string;
  note?: string;
}

const PROVIDERS: ServiceProvider[] = [
  { id: 1, name: "شركة الفارس للإنشاءات",   nameEn: "Al-Faris Construction",    specialty: "إنشاء وتجديد وتشطيبات",  specialtyEn: "Construction & Renovation", category: "construction", rating: 4.8, phone: "+966500011001" },
  { id: 2, name: "شركة المدينة للسباكة",     nameEn: "Al-Madinah Plumbing",      specialty: "سباكة وصرف صحي",         specialtyEn: "Plumbing & Drainage",       category: "plumbing",     rating: 4.6, phone: "+966500022002" },
  { id: 3, name: "مؤسسة نور الكهرباء",      nameEn: "Nour Electrical",          specialty: "كهرباء وأنظمة ذكية",      specialtyEn: "Electrical & Smart Systems",category: "electrical",   rating: 4.7, phone: "+966500033003" },
  { id: 4, name: "جرين سكيب للتشجير",      nameEn: "Green Scape Landscaping",  specialty: "تشجير وتجميل المباني",    specialtyEn: "Landscaping",               category: "landscaping",  rating: 4.3, phone: "+966500044004" },
  { id: 5, name: "مؤسسة النظافة المتكاملة", nameEn: "Total Clean Services",     specialty: "تنظيف عام وصيانة دورية", specialtyEn: "Cleaning & Upkeep",         category: "cleaning",     rating: 4.5, phone: "+966500055005" },
  { id: 6, name: "شركة الديار للصيانة",     nameEn: "Al-Diyar Maintenance",     specialty: "صيانة عامة ومتكاملة",    specialtyEn: "General Maintenance",       category: "maintenance",  rating: 4.9, phone: "+966500066006" },
];

const CATEGORY_ICONS: Record<ServiceProvider["category"], string> = {
  maintenance:  "build",
  construction: "apartment",
  cleaning:     "cleaning-services",
  landscaping:  "park",
  electrical:   "bolt",
  plumbing:     "water-drop",
};

type TabKey = "services" | "requests";

// ── OTP Delegation Modal ───────────────────────────────────────────────────────
interface DelegationModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
  phone: string;
  onSuccess: () => void;
}

function DelegationModal({ visible, onClose, colors, isAr, phone, onSuccess }: DelegationModalProps) {
  const [step, setStep]     = useState<"terms" | "otp" | "success">("terms");
  const [otp, setOtp]       = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep("terms");
      setOtp("");
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleAgree = useCallback(() => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setSentOtp(code);
    setStep("otp");
    if (Platform.OS !== "web") {
      Alert.alert(
        isAr ? "تم إرسال الرمز" : "Code Sent",
        isAr ? `رمز التفويض: ${code}\n(في التطبيق الحقيقي يُرسَل لجوالك)` : `Authorization code: ${code}\n(In production, sent via SMS)`,
      );
    }
  }, [isAr]);

  const handleVerify = useCallback(async () => {
    if (otp.trim() !== sentOtp) {
      if (Platform.OS !== "web") Alert.alert(isAr ? "رمز خاطئ" : "Wrong code", isAr ? "يرجى إعادة المحاولة" : "Please try again.");
      return;
    }
    setLoading(true);
    await AsyncStorage.setItem(DELEGATION_KEY, JSON.stringify({ active: true, ts: new Date().toISOString(), phone }));
    setLoading(false);
    setStep("success");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => { onSuccess(); onClose(); }, 1800);
  }, [otp, sentOtp, phone, isAr, onSuccess, onClose]);

  const s = dlgStyles(colors, isAr);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.sheet}>
          {step === "terms" && (
            <>
              <View style={s.handle} />
              <View style={s.iconRow}>
                <View style={[s.iconBox, { backgroundColor: colors.gold + "22" }]}>
                  <MaterialIcons name="verified-user" size={32} color={colors.gold} />
                </View>
              </View>
              <Text style={s.title}>{isAr ? "طلب تفويض Rozoz" : "Authorize Rozoz"}</Text>
              <Text style={s.body}>
                {isAr
                  ? "بالموافقة، تُفوّض Rozoz للتواصل مع شركات الخدمات نيابةً عنك، وتنسيق الصيانة والإصلاحات. يمكنك إلغاء التفويض في أي وقت من الإعدادات."
                  : "By agreeing, you authorize Rozoz to contact service companies on your behalf and coordinate maintenance. You can revoke this authorization anytime from Settings."}
              </Text>
              <Pressable style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }]} onPress={handleAgree}>
                <MaterialIcons name="check" size={18} color="#0A1628" />
                <Text style={s.primaryBtnText}>{isAr ? "أوافق — أرسل رمز التأكيد" : "Agree — Send Confirmation Code"}</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]} onPress={onClose}>
                <Text style={s.cancelText}>{isAr ? "إلغاء" : "Cancel"}</Text>
              </Pressable>
            </>
          )}
          {step === "otp" && (
            <>
              <View style={s.handle} />
              <View style={s.iconRow}>
                <View style={[s.iconBox, { backgroundColor: "#DBEAFE" }]}>
                  <MaterialIcons name="sms" size={32} color="#2563EB" />
                </View>
              </View>
              <Text style={s.title}>{isAr ? "أدخل رمز التأكيد" : "Enter Confirmation Code"}</Text>
              <Text style={s.body}>
                {isAr ? `أُرسل رمز مكوّن من 4 أرقام إلى ${phone}` : `A 4-digit code was sent to ${phone}`}
              </Text>
              <TextInput
                style={[s.otpInput, { color: colors.foreground, borderColor: colors.gold }]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={4}
                textAlign="center"
                placeholder="○ ○ ○ ○"
                placeholderTextColor="#94A3B8"
              />
              <Pressable
                style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, (!otp || otp.length < 4) && { opacity: 0.5 }]}
                onPress={handleVerify}
                disabled={loading || otp.length < 4}
              >
                <Text style={s.primaryBtnText}>{isAr ? loading ? "جارٍ التحقق…" : "تأكيد التفويض" : loading ? "Verifying…" : "Confirm Authorization"}</Text>
              </Pressable>
            </>
          )}
          {step === "success" && (
            <View style={s.successBox}>
              <View style={[s.iconBox, { backgroundColor: "#DCFCE7" }]}>
                <MaterialIcons name="check-circle" size={40} color="#16A34A" />
              </View>
              <Text style={[s.title, { color: "#16A34A" }]}>{isAr ? "تم التفويض بنجاح!" : "Authorization Confirmed!"}</Text>
              <Text style={s.body}>{isAr ? "ستتواصل معك Rozoz قريباً." : "Rozoz will contact you shortly."}</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ServicesScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { isAr } = useLocale();
  const { user }  = useApp();

  const [activeTab,     setActiveTab]     = useState<TabKey>("services");
  const [requests,      setRequests]      = useState<ServiceRequest[]>([]);
  const [delegated,     setDelegated]     = useState(false);
  const [showDlgModal,  setShowDlgModal]  = useState(false);
  const [selectedProv,  setSelectedProv]  = useState<ServiceProvider | null>(null);

  const topPad    = insets.top    + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  useEffect(() => {
    AsyncStorage.getItem(SERVICE_REQUESTS_KEY).then(raw => {
      if (raw) setRequests(JSON.parse(raw) as ServiceRequest[]);
    }).catch(() => {});
    AsyncStorage.getItem(DELEGATION_KEY).then(raw => {
      if (raw) setDelegated((JSON.parse(raw) as { active: boolean }).active === true);
    }).catch(() => {});
  }, []);

  const saveRequest = useCallback(async (req: ServiceRequest) => {
    const updated = [req, ...requests];
    setRequests(updated);
    await AsyncStorage.setItem(SERVICE_REQUESTS_KEY, JSON.stringify(updated)).catch(() => {});
  }, [requests]);

  const handleDirectContact = useCallback(async (provider: ServiceProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const waUrl = `https://wa.me/${provider.phone.replace(/\D/g, "")}`;
    const canOpen = await Linking.canOpenURL(waUrl);
    if (canOpen) {
      await Linking.openURL(waUrl);
    } else {
      await Linking.openURL(`tel:${provider.phone}`);
    }
    const req: ServiceRequest = {
      id: Date.now().toString(),
      providerId: provider.id,
      providerName: provider.name,
      type: "direct",
      status: "pending",
      ts: new Date().toISOString(),
    };
    void saveRequest(req);
  }, [saveRequest]);

  const handleDelegateRozoz = useCallback((provider: ServiceProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProv(provider);
    setShowDlgModal(true);
  }, []);

  const handleDelegationSuccess = useCallback(async () => {
    setDelegated(true);
    if (selectedProv) {
      const req: ServiceRequest = {
        id: Date.now().toString(),
        providerId: selectedProv.id,
        providerName: selectedProv.name,
        type: "rozoz",
        status: "pending",
        ts: new Date().toISOString(),
      };
      await saveRequest(req);
    }
  }, [selectedProv, saveRequest]);

  const openWhatsApp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(ROZOZ_WHATSAPP);
  }, []);

  const s = styles(colors, isAr, topPad, bottomPad);

  return (
    <View style={s.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>{isAr ? "الخدمات" : "Services"}</Text>
          <Text style={s.headerSub}>{isAr ? "دليل شركاء الخدمة وطلباتك" : "Service partners & your requests"}</Text>
        </View>
        <Pressable
          onPress={openWhatsApp}
          style={({ pressed }) => [s.waBtn, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons name="chat" size={18} color="#FFFFFF" />
          <Text style={s.waBtnText}>{isAr ? "تواصل معنا" : "Contact Us"}</Text>
        </Pressable>
      </View>

      {/* ── Delegation Banner ───────────────────────────────────────────────── */}
      {delegated && (
        <View style={s.delegatedBanner}>
          <MaterialIcons name="verified" size={18} color="#16A34A" />
          <Text style={[s.delegatedText, isAr && { textAlign: "right" }]}>
            {isAr ? "Rozoz مفوّضة للتواصل مع شركات الخدمة نيابةً عنك" : "Rozoz is authorized to coordinate services on your behalf"}
          </Text>
        </View>
      )}

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {(["services", "requests"] as TabKey[]).map(key => (
          <Pressable key={key} onPress={() => setActiveTab(key)} style={[s.tabItem, activeTab === key && s.tabActive]}>
            <MaterialIcons
              name={key === "services" ? "build-circle" : "assignment"}
              size={16}
              color={activeTab === key ? colors.gold : "#94A3B8"}
            />
            <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]}>
              {key === "services" ? (isAr ? "دليل الخدمات" : "Service Directory") : (isAr ? "طلباتي" : "My Requests")}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Services Tab ───────────────────────────────────────────────────── */}
      {activeTab === "services" ? (
        <FlatList
          data={PROVIDERS}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.sectionNote}>
              <MaterialIcons name="info-outline" size={14} color="#64748B" />
              <Text style={[s.sectionNoteText, isAr && { textAlign: "right" }]}>
                {isAr
                  ? "يمكنك التواصل مباشرة مع الشركة، أو تفويض Rozoz للتنسيق نيابةً عنك."
                  : "Contact the company directly, or delegate Rozoz to coordinate on your behalf."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.provCard, isAr && { flexDirection: "row-reverse" }]}>
              <View style={[s.provIcon, { backgroundColor: colors.gold + "1A" }]}>
                <MaterialIcons name={CATEGORY_ICONS[item.category] as any} size={22} color={colors.gold} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[s.provName, isAr && { textAlign: "right" }]}>{isAr ? item.name : item.nameEn}</Text>
                <Text style={[s.provSpec, isAr && { textAlign: "right" }]}>{isAr ? item.specialty : item.specialtyEn}</Text>
                <View style={[s.ratingRow, isAr && { flexDirection: "row-reverse" }]}>
                  <MaterialIcons name="star" size={13} color="#F59E0B" />
                  <Text style={s.ratingText}>{item.rating}</Text>
                </View>
              </View>
              <View style={s.actionCol}>
                <Pressable
                  onPress={() => handleDirectContact(item)}
                  style={({ pressed }) => [s.directBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialIcons name="call" size={14} color="#FFFFFF" />
                  <Text style={s.directBtnText}>{isAr ? "مباشر" : "Direct"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelegateRozoz(item)}
                  style={({ pressed }) => [s.delegateBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialIcons name="handshake" size={14} color={colors.gold} />
                  <Text style={[s.delegateBtnText, { color: colors.gold }]}>{isAr ? "فوّض" : "Delegate"}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      ) : (
        /* ── Requests Tab ──────────────────────────────────────────────────── */
        <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {requests.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: colors.gold + "18" }]}>
                <MaterialIcons name="assignment" size={36} color={colors.gold} />
              </View>
              <Text style={s.emptyTitle}>{isAr ? "لا توجد طلبات بعد" : "No requests yet"}</Text>
              <Text style={s.emptySub}>
                {isAr ? "تواصل مع شركة أو فوّض Rozoz من دليل الخدمات" : "Contact a company or delegate Rozoz from the directory"}
              </Text>
            </View>
          ) : (
            requests.map(req => (
              <View key={req.id} style={[s.reqCard, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[s.reqIconBox, { backgroundColor: req.type === "rozoz" ? colors.gold + "22" : "#DBEAFE" }]}>
                  <MaterialIcons
                    name={req.type === "rozoz" ? "handshake" : "call"}
                    size={18}
                    color={req.type === "rozoz" ? colors.gold : "#2563EB"}
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[s.reqName, isAr && { textAlign: "right" }]}>{req.providerName}</Text>
                  <Text style={[s.reqType, isAr && { textAlign: "right" }]}>
                    {req.type === "rozoz" ? (isAr ? "عبر Rozoz" : "via Rozoz") : (isAr ? "تواصل مباشر" : "Direct contact")}
                  </Text>
                  <Text style={[s.reqDate, isAr && { textAlign: "right" }]}>
                    {new Date(req.ts).toLocaleDateString(isAr ? "ar-SA" : "en-GB")}
                  </Text>
                </View>
                <View style={s.statusChip}>
                  <Text style={s.statusText}>{isAr ? "قيد المراجعة" : "Pending"}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Delegation Modal ────────────────────────────────────────────────── */}
      <DelegationModal
        visible={showDlgModal}
        onClose={() => setShowDlgModal(false)}
        colors={colors}
        isAr={isAr}
        phone={user?.phone ?? "+966XXXXXXXXX"}
        onSuccess={handleDelegationSuccess}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function styles(
  colors: ReturnType<typeof useColors>,
  isAr: boolean,
  topPad: number,
  bottomPad: number,
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    header: {
      backgroundColor:   colors.navy,
      paddingTop:        topPad + 16,
      paddingBottom:     20,
      paddingHorizontal: 20,
      flexDirection:     isAr ? "row-reverse" : "row",
      alignItems:        "center",
      justifyContent:    "space-between",
    },
    headerTitle: { color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold" },
    headerSub:   { color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },

    waBtn: {
      flexDirection:   isAr ? "row-reverse" : "row",
      alignItems:      "center",
      gap:             6,
      backgroundColor: "#25D366",
      paddingHorizontal: 14,
      paddingVertical:   9,
      borderRadius:    12,
    },
    waBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_700Bold" },

    delegatedBanner: {
      flexDirection:   isAr ? "row-reverse" : "row",
      alignItems:      "center",
      gap:             8,
      backgroundColor: "#F0FDF4",
      paddingHorizontal: 16,
      paddingVertical:   10,
      borderBottomWidth: 1,
      borderBottomColor: "#BBF7D0",
    },
    delegatedText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#166534" },

    tabBar: {
      flexDirection: isAr ? "row-reverse" : "row",
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabItem: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 14,
      borderBottomWidth: 2, borderBottomColor: "transparent",
    },
    tabActive:      { borderBottomColor: colors.gold },
    tabLabel:       { fontSize: 13, fontFamily: "Inter_500Medium", color: "#94A3B8" },
    tabLabelActive: { color: colors.gold, fontFamily: "Inter_700Bold" },

    listContent: { padding: 16, paddingBottom: bottomPad },

    sectionNote: {
      flexDirection:   isAr ? "row-reverse" : "row",
      alignItems:      "flex-start",
      gap:             8,
      backgroundColor: colors.card,
      borderRadius:    12,
      padding:         12,
      marginBottom:    12,
    },
    sectionNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", lineHeight: 18 },

    provCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10,
      shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    provIcon:   { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    provName:   { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    provSpec:   { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 },
    ratingRow:  { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
    ratingText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },

    actionCol:   { gap: 6, alignItems: "flex-end" },
    directBtn:   {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: "#2563EB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    directBtnText:   { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    delegateBtn:     {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderWidth: 1.5, borderColor: colors.gold,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    delegateBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },

    empty:     { alignItems: "center", paddingTop: 70, gap: 12 },
    emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    emptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },

    reqCard:   {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
    },
    reqIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    reqName:    { fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground },
    reqType:    { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 },
    reqDate:    { fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 2 },
    statusChip: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#92400E" },
  });
}

// ── Delegation Modal Styles ────────────────────────────────────────────────────
function dlgStyles(colors: ReturnType<typeof useColors>, isAr: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
      alignItems: "center",
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", marginBottom: 20 },
    iconRow: { marginBottom: 16 },
    iconBox: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    title:   { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 10, textAlign: "center" },
    body:    { fontSize: 14, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: isAr ? "right" : "left", lineHeight: 22, marginBottom: 24 },
    otpInput: {
      width: 160, height: 60, borderWidth: 2, borderRadius: 16,
      fontSize: 32, fontFamily: "Inter_700Bold",
      backgroundColor: colors.card, marginBottom: 24,
    },
    primaryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.gold, borderRadius: 14,
      paddingVertical: 16, paddingHorizontal: 24, width: "100%", marginBottom: 10,
    },
    primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A1628" },
    cancelBtn:  { paddingVertical: 12 },
    cancelText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#64748B" },
    successBox: { alignItems: "center", paddingVertical: 20, gap: 12 },
  });
}
