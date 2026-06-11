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

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "١. الموافقة على الشروط",
    body: "بمجرد قيام المستخدم بالتسجيل في تطبيق \"رزوز الرقمية\" واستخدامه، فإن ذلك يعد موافقة صريحة منه على جميع بنود هذه الشروط والأحكام. وفي حال عدم الموافقة، يجب على المستخدم الامتناع عن استخدام التطبيق.",
  },
  {
    title: "٢. طبيعة الخدمة",
    body: "يوفر التطبيق منصة إلكترونية لإدارة وتوثيق العقود الإيجارية وإرسال التنبيهات المتعلقة بالدفع. تؤكد الشركة بأنها تعمل كوسيط تقني فقط، ولا تتحمل أي مسؤولية قانونية أو تعاقدية تنشأ بين المؤجر والمستأجر أو البائع والمشتري.",
  },
  {
    title: "٣. إنشاء الحساب والالتزامات",
    body: "يلتزم المستخدم بتقديم بيانات صحيحة وكاملة عند التسجيل عبر نفاذ أو رقم الجوال. يتحمل المستخدم المسؤولية الكاملة عن سرية بيانات الدخول الخاصة به. يحظر إنشاء أكثر من حساب واحد لنفس المستخدم.",
  },
  {
    title: "٤. استخدام التطبيق المحظور",
    body: "يلتزم المستخدم بعدم استخدام التطبيق لأي أغراض مخالفة للأنظمة واللوائح المعمول بها في المملكة العربية السعودية. كما يحظر القيام بأي محاولات للوصول غير المصرح به أو اختراق الأنظمة أو سرقة بيانات المستخدمين الآخرين. تحتفظ الشركة بحق إيقاف أو إنهاء الحساب فوراً في حال المخالفة.",
  },
  {
    title: "٥. الرسوم والاشتراكات",
    body: "في حال توفر خدمات مدفوعة، فإن الدفع يتم مقدماً وبطرق إلكترونية معتمدة. تحتفظ الشركة بحق تعديل الرسوم والأسعار في أي وقت، على أن لا يسري التعديل على الاشتراكات المدفوعة مسبقاً إلا بعد انتهاء مدتها.",
  },
  {
    title: "٦. حقوق الملكية الفكرية",
    body: "جميع الحقوق المتعلقة بتطبيق \"رزوز الرقمية\" من تصميم وشفرة برمجية وشعار ومحتوى هي ملك حصري للشركة. يحظر نسخ أو إعادة توزيع أو تعديل أي جزء من التطبيق دون الحصول على موافقة خطية مسبقة.",
  },
  {
    title: "٧. إنهاء وإيقاف الحساب",
    body: "يحق للمستخدم طلب إغلاق حسابه في أي وقت من خلال الإعدادات. كما يحق للشركة إيقاف أو إنهاء حساب المستخدم دون إشعار مسبق ودون أي تعويض في حال ثبوت مخالفته لهذه الشروط.",
  },
  {
    title: "٨. إخلاء المسؤولية",
    body: "تبذل الشركة قصارى جهدها لضمان استمرارية عمل التطبيق دون انقطاع، إلا أنها لا تقدم أي ضمانات صريحة أو ضمنية بخصوص توفره أو خلوه من الأخطاء. لا تتحمل الشركة المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق.",
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-forward" size={24} color="#111827" />
          <Text style={s.backText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>الشروط والأحكام</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lastUpdated}>آخر تحديث: ١١/٠٦/٢٠٢٦</Text>

        {SECTIONS.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        <View style={s.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  headerSpacer: {
    width: 64,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  lastUpdated: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "right",
    marginBottom: 24,
    writingDirection: "rtl",
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: "#374151",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 24,
  },
  bottomPad: {
    height: 40,
  },
});
