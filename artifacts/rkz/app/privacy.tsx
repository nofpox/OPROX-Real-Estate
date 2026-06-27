import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const GOLD  = "#C9A84C";
const NAVY  = "#0F2040";
const GRAY  = "#6B7280";
const LIGHT = "#F9FAFB";

const SECTIONS = [
  {
    ar: "مقدمة",
    en: "Introduction",
    body: "تلتزم منصة HousIn بحماية خصوصية مستخدميها. توضّح هذه السياسة كيفية جمع بياناتك واستخدامها والحفاظ عليها عند استخدام تطبيقنا.\n\nHousIn is committed to protecting your privacy. This policy explains how we collect, use and safeguard your data when you use our application.",
  },
  {
    ar: "البيانات التي نجمعها",
    en: "Data We Collect",
    body: "• رقم الجوال والاسم وبريدك الإلكتروني (اختياري)\n• بيانات الإعلانات العقارية التي تنشرها\n• بيانات الموقع الجغرافي لأغراض الخريطة (بإذنك فقط)\n• سجلات النشاط داخل التطبيق لتحسين الخدمة\n\n• Mobile number, name and email (optional)\n• Property listing data you publish\n• Location data for map features (with your permission only)\n• Activity logs to improve the service",
  },
  {
    ar: "كيف نستخدم بياناتك",
    en: "How We Use Your Data",
    body: "• تشغيل خدمات التطبيق وإدارة حسابك\n• عرض إعلاناتك العقارية للمستخدمين المناسبين\n• إرسال إشعارات تتعلق بطلباتك وعقاراتك\n• تحليل الاستخدام لتحسين تجربة المنصة\n\n• Operating app services and managing your account\n• Displaying your listings to relevant users\n• Sending notifications related to your requests and properties\n• Analysing usage to improve the platform experience",
  },
  {
    ar: "مشاركة البيانات",
    en: "Data Sharing",
    body: "لا نبيع بياناتك الشخصية لأي طرف ثالث. قد نشارك بيانات مجهولة الهوية مع شركاء تقنيين لأغراض تحسين الخدمة فقط.\n\nWe do not sell your personal data to any third party. We may share anonymised data with technology partners for service improvement purposes only.",
  },
  {
    ar: "أمان البيانات",
    en: "Data Security",
    body: "نستخدم تشفير SSL/TLS لحماية بياناتك أثناء النقل. يتم تخزين البيانات على خوادم آمنة مع ضوابط وصول صارمة.\n\nWe use SSL/TLS encryption to protect your data in transit. Data is stored on secure servers with strict access controls.",
  },
  {
    ar: "حقوقك",
    en: "Your Rights",
    body: "يحق لك في أي وقت:\n• طلب الاطلاع على بياناتك الشخصية\n• طلب تصحيح بياناتك\n• طلب حذف حسابك وبياناتك\n• سحب موافقتك على الاستخدام\n\nYou have the right at any time to:\n• Request access to your personal data\n• Request correction of your data\n• Request deletion of your account and data\n• Withdraw your consent to use",
  },
  {
    ar: "التواصل معنا",
    en: "Contact Us",
    body: "لأي استفسار بخصوص سياسة الخصوصية تواصل معنا عبر التطبيق أو عبر البريد الإلكتروني الرسمي لمنصة HousIn.\n\nFor any privacy-related enquiries contact us through the app or via HousIn's official email address.",
  },
];

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-forward" size={22} color={NAVY} />
          <Text style={s.backText}>رجوع</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitleAr}>سياسة الخصوصية</Text>
          <Text style={s.headerTitleEn}>Privacy Policy</Text>
        </View>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.badge}>
          <Text style={s.badgeText}>HousIn · هاوسن</Text>
        </View>
        <Text style={s.lastUpdated}>آخر تحديث: يناير 2025 · Last updated: January 2025</Text>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.dot} />
              <View style={s.sectionTitles}>
                <Text style={s.sectionTitleAr}>{sec.ar}</Text>
                <Text style={s.sectionTitleEn}>{sec.en}</Text>
              </View>
            </View>
            <Text style={s.body}>{sec.body}</Text>
          </View>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: LIGHT },

  header: {
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingHorizontal: 16,
    paddingVertical:   13,
    backgroundColor:  "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15, color: NAVY, fontWeight: "500" },
  headerCenter: { alignItems: "center" },
  headerTitleAr: { fontSize: 16, fontWeight: "700", color: NAVY },
  headerTitleEn: { fontSize: 11, color: GRAY, marginTop: 1 },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  badge: {
    alignSelf:       "center",
    backgroundColor: NAVY,
    borderRadius:    20,
    paddingHorizontal: 16,
    paddingVertical:   6,
    marginBottom:    10,
  },
  badgeText: { color: GOLD, fontSize: 13, fontWeight: "700", letterSpacing: 1 },

  lastUpdated: {
    color:       GRAY,
    fontSize:    11,
    textAlign:   "center",
    marginBottom: 28,
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius:    14,
    padding:         16,
    marginBottom:    14,
    shadowColor:     "#000",
    shadowOpacity:   0.04,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 2 },
    elevation:       2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
    marginBottom:  10,
  },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: GOLD,
    marginTop: 7, flexShrink: 0,
  },
  sectionTitles: { flex: 1 },
  sectionTitleAr: {
    fontSize: 15, fontWeight: "700", color: NAVY,
    textAlign: "right", writingDirection: "rtl",
  },
  sectionTitleEn: {
    fontSize: 12, color: GRAY, marginTop: 1,
    textAlign: "right",
  },
  body: {
    fontSize: 13, color: "#374151",
    lineHeight: 22,
    textAlign: "right", writingDirection: "rtl",
  },
});
