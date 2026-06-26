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

const GOLD = "#C9A84C";
const NAVY = "#0F2040";
const GRAY = "#6B7280";
const LIGHT = "#F9FAFB";

const SECTIONS: { num: string; ar: string; en: string; body: string }[] = [
  {
    num: "١",
    ar: "الموافقة على الشروط",
    en: "Acceptance of Terms",
    body: 'بمجرد قيام المستخدم بالتسجيل في منصة "استيتي إن" واستخدامها، فإن ذلك يعد موافقة صريحة على جميع بنود هذه الشروط والأحكام. وفي حال عدم الموافقة، يجب على المستخدم الامتناع عن استخدام المنصة.\n\nBy registering and using the ESTETI IN platform, the user expressly agrees to all these Terms & Conditions. If you do not agree, you must refrain from using the platform.',
  },
  {
    num: "٢",
    ar: "طبيعة الخدمة",
    en: "Nature of Service",
    body: "توفر استيتي إن منصة إلكترونية لإدارة العقارات وتوثيق العقود الإيجارية وإرسال التنبيهات المتعلقة بالدفع. تعمل الشركة كوسيط تقني فقط ولا تتحمل أي مسؤولية قانونية أو تعاقدية تنشأ بين المؤجر والمستأجر أو البائع والمشتري.\n\nESTETI IN provides an electronic platform for property management, lease documentation and payment notifications. The company acts as a technology intermediary only and bears no legal or contractual liability arising between landlord and tenant or seller and buyer.",
  },
  {
    num: "٣",
    ar: "إنشاء الحساب والالتزامات",
    en: "Account Creation & Obligations",
    body: "يلتزم المستخدم بتقديم بيانات صحيحة وكاملة عند التسجيل. يتحمل المستخدم المسؤولية الكاملة عن سرية بيانات الدخول الخاصة به. يحظر إنشاء أكثر من حساب واحد لنفس المستخدم.\n\nThe user undertakes to provide accurate and complete data upon registration. The user bears full responsibility for the confidentiality of their login credentials. Creating more than one account per user is prohibited.",
  },
  {
    num: "٤",
    ar: "الاستخدام المحظور",
    en: "Prohibited Use",
    body: "يلتزم المستخدم بعدم استخدام المنصة لأي أغراض مخالفة للأنظمة واللوائح المعمول بها في المملكة العربية السعودية. يحظر القيام بأي محاولات للوصول غير المصرح به أو اختراق الأنظمة. تحتفظ الشركة بحق إيقاف أو إنهاء الحساب فوراً في حال المخالفة.\n\nThe user must not use the platform for any purpose contrary to the laws and regulations in force in the Kingdom of Saudi Arabia. Unauthorised access attempts or system intrusion are strictly prohibited. The company reserves the right to immediately suspend or terminate the account in case of violation.",
  },
  {
    num: "٥",
    ar: "الرسوم والاشتراكات",
    en: "Fees & Subscriptions",
    body: "في حال توفر خدمات مدفوعة، فإن الدفع يتم مقدماً وبطرق إلكترونية معتمدة. تحتفظ الشركة بحق تعديل الرسوم في أي وقت، على أن لا يسري التعديل على الاشتراكات المدفوعة مسبقاً إلا بعد انتهاء مدتها.\n\nWhere paid services are available, payment is made in advance through approved electronic methods. The company reserves the right to modify fees at any time, provided the modification does not apply to pre-paid subscriptions until their expiry.",
  },
  {
    num: "٦",
    ar: "حقوق الملكية الفكرية",
    en: "Intellectual Property",
    body: 'جميع الحقوق المتعلقة بمنصة "استيتي إن" من تصميم وشفرة برمجية وشعار ومحتوى هي ملك حصري للشركة. يحظر نسخ أو إعادة توزيع أو تعديل أي جزء من المنصة دون الحصول على موافقة خطية مسبقة.\n\nAll rights relating to the ESTETI IN platform — design, code, logo and content — are the exclusive property of the company. Copying, redistributing or modifying any part of the platform without prior written consent is strictly prohibited.',
  },
  {
    num: "٧",
    ar: "إنهاء وإيقاف الحساب",
    en: "Account Termination",
    body: "يحق للمستخدم طلب إغلاق حسابه في أي وقت من خلال الإعدادات. كما يحق للشركة إيقاف أو إنهاء حساب المستخدم دون إشعار مسبق ودون أي تعويض في حال ثبوت مخالفته لهذه الشروط.\n\nThe user may request account closure at any time through Settings. The company may also suspend or terminate a user account without prior notice and without any compensation if a violation of these Terms is established.",
  },
  {
    num: "٨",
    ar: "إخلاء المسؤولية",
    en: "Disclaimer",
    body: "تبذل الشركة قصارى جهدها لضمان استمرارية عمل المنصة دون انقطاع، إلا أنها لا تقدم أي ضمانات صريحة أو ضمنية بخصوص توفرها أو خلوها من الأخطاء. لا تتحمل الشركة المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة.\n\nThe company makes every effort to ensure the platform operates without interruption, but provides no express or implied warranties as to its availability or freedom from errors. The company is not liable for any direct or indirect damages resulting from use of the platform.",
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-forward" size={22} color={NAVY} />
          <Text style={s.backText}>رجوع</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitleAr}>الشروط والأحكام</Text>
          <Text style={s.headerTitleEn}>Terms &amp; Conditions</Text>
        </View>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.badge}>
          <Text style={s.badgeText}>استيتي إن · ESTETI IN</Text>
        </View>
        <Text style={s.lastUpdated}>آخر تحديث: يناير 2025 · Last updated: January 2025</Text>

        {SECTIONS.map((sec) => (
          <View key={sec.num} style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.numBadge}>
                <Text style={s.numText}>{sec.num}</Text>
              </View>
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
  safe: { flex: 1, backgroundColor: LIGHT },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15, color: NAVY, fontWeight: "500" },
  headerCenter: { alignItems: "center" },
  headerTitleAr: { fontSize: 16, fontWeight: "700", color: NAVY },
  headerTitleEn: { fontSize: 11, color: GRAY, marginTop: 1 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  badge: {
    alignSelf: "center",
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeText: { color: GOLD, fontSize: 13, fontWeight: "700", letterSpacing: 1 },

  lastUpdated: {
    color: GRAY,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 28,
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  numText: { color: GOLD, fontSize: 12, fontWeight: "700" },
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
