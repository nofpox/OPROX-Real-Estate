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
    title: "١. قبول الشروط",
    body: `باستخدامك لتطبيق رزوز الرقمية، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.`,
  },
  {
    title: "٢. وصف الخدمة",
    body: `رزوز الرقمية منصة عقارية تتيح لمستخدميها الاطلاع على العقارات وإدراجها والتواصل بشأنها. تعمل المنصة كوسيط إلكتروني ولا تُعدّ طرفاً في أي عملية بيع أو إيجار.`,
  },
  {
    title: "٣. التسجيل وحماية الحساب",
    body: `أنت مسؤول عن الحفاظ على سرية بيانات حسابك. يُمنع مشاركة الحساب مع الغير. يحق للمنصة تعليق أي حساب يُشتبه في إساءة استخدامه.`,
  },
  {
    title: "٤. قواعد الاستخدام المقبول",
    body: `يُحظر نشر معلومات مضللة أو وهمية.\nيُحظر استخدام المنصة لأغراض احتيالية.\nيُحظر مشاركة بيانات تواصل شخصية خارج القنوات المعتمدة في التطبيق.\nيُحظر انتهاك حقوق الملكية الفكرية لأي طرف.`,
  },
  {
    title: "٥. المحتوى والإعلانات",
    body: `المستخدم هو المسؤول الكامل عن دقة المحتوى الذي ينشره. تحتفظ رزوز الرقمية بحق مراجعة أي إعلان أو إزالته دون إشعار مسبق إذا خالف سياسات المنصة.`,
  },
  {
    title: "٦. الخصوصية وحماية البيانات",
    body: `تلتزم رزوز الرقمية بحماية بيانات مستخدميها وفق سياسة الخصوصية المعتمدة. لن تُباع البيانات الشخصية لأطراف ثالثة دون موافقة صريحة.`,
  },
  {
    title: "٧. إخلاء المسؤولية",
    body: `لا تضمن رزوز الرقمية دقة جميع المعلومات المدرجة من قِبل المستخدمين. المستخدم هو المسؤول عن التحقق من صحة أي صفقة قبل إتمامها.`,
  },
  {
    title: "٨. التعديلات على الشروط",
    body: `تحتفظ رزوز الرقمية بحق تعديل هذه الشروط في أي وقت. سيُشعَر المستخدمون بأي تعديل جوهري عبر التطبيق. الاستمرار في الاستخدام بعد التعديل يعني قبوله.`,
  },
  {
    title: "٩. القانون الحاكم",
    body: `تخضع هذه الشروط لأحكام نظام التجارة الإلكترونية في المملكة العربية السعودية وما يصدر من لوائح تنفيذية بشأنه.`,
  },
  {
    title: "١٠. التواصل",
    body: `لأي استفسار بشأن هذه الشروط، يمكنك التواصل معنا عبر قسم الدعم داخل التطبيق.`,
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
        <Text style={s.lastUpdated}>آخر تحديث: يونيو ٢٠٢٥</Text>

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
