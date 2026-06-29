import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    ar: "مقدمة",
    en: "Introduction",
    body_ar: "تلتزم منصة Housin بحماية خصوصية مستخدميها. توضّح هذه السياسة كيفية جمع بياناتك واستخدامها والحفاظ عليها عند استخدام منصتنا وتطبيقاتنا.",
    body_en: "Housin is committed to protecting the privacy of its users. This policy explains how we collect, use and safeguard your data when you use our platform and applications.",
  },
  {
    ar: "البيانات التي نجمعها",
    en: "Data We Collect",
    body_ar: "• رقم الجوال والاسم والبريد الإلكتروني (اختياري)\n• بيانات الإعلانات العقارية التي تنشرها\n• بيانات الموقع الجغرافي لأغراض الخريطة (بإذنك فقط)\n• سجلات النشاط داخل المنصة لتحسين الخدمة",
    body_en: "• Mobile number, name and email (optional)\n• Property listing data you publish\n• Location data for map features (with your permission only)\n• Activity logs to improve the service",
  },
  {
    ar: "كيف نستخدم بياناتك",
    en: "How We Use Your Data",
    body_ar: "• تشغيل خدمات المنصة وإدارة حسابك\n• عرض إعلاناتك العقارية للمستخدمين المناسبين\n• إرسال إشعارات تتعلق بطلباتك وعقاراتك\n• تحليل الاستخدام لتحسين تجربة المنصة",
    body_en: "• Operating platform services and managing your account\n• Displaying your listings to relevant users\n• Sending notifications related to your requests and properties\n• Analysing usage to improve the platform experience",
  },
  {
    ar: "مشاركة البيانات",
    en: "Data Sharing",
    body_ar: "لا نبيع بياناتك الشخصية لأي طرف ثالث. قد نشارك بيانات مجهولة الهوية مع شركاء تقنيين لأغراض تحسين الخدمة فقط.",
    body_en: "We do not sell your personal data to any third party. We may share anonymised data with technology partners for service improvement purposes only.",
  },
  {
    ar: "أمان البيانات",
    en: "Data Security",
    body_ar: "نستخدم تشفير SSL/TLS لحماية بياناتك أثناء النقل. يتم تخزين البيانات على خوادم آمنة مع ضوابط وصول صارمة.",
    body_en: "We use SSL/TLS encryption to protect your data in transit. Data is stored on secure servers with strict access controls.",
  },
  {
    ar: "حقوقك",
    en: "Your Rights",
    body_ar: "يحق لك في أي وقت:\n• طلب الاطلاع على بياناتك الشخصية\n• طلب تصحيح بياناتك\n• طلب حذف حسابك وبياناتك\n• سحب موافقتك على الاستخدام",
    body_en: "You have the right at any time to:\n• Request access to your personal data\n• Request correction of your data\n• Request deletion of your account and data\n• Withdraw your consent to use",
  },
  {
    ar: "التواصل معنا",
    en: "Contact Us",
    body_ar: "لأي استفسار بخصوص سياسة الخصوصية، تواصل معنا عبر صفحة التواصل أو عبر البريد الإلكتروني الرسمي لمنصة Housin.",
    body_en: "For any privacy-related enquiries, contact us through our contact page or via Housin's official email address.",
  },
];

export const Privacy: React.FC = () => {
  const { isRtl } = useLanguage();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const Arrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <>
      <Helmet>
        <title>{isRtl ? 'سياسة الخصوصية — Housin' : 'Privacy Policy — Housin'}</title>
      </Helmet>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            {'Housin · هاوسن'}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <p className="text-primary-foreground/60 text-base">
            {isRtl ? 'Privacy Policy' : 'سياسة الخصوصية'}
          </p>
          <p className="text-primary-foreground/40 text-xs mt-4">
            {isRtl ? 'آخر تحديث: يناير 2025' : 'Last updated: January 2025'}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 px-4">
        <div className="container mx-auto max-w-3xl space-y-3">
          {SECTIONS.map((sec, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="border border-border rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-muted/30 transition-colors"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-secondary font-bold text-xs flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <p className="font-bold text-foreground">{isRtl ? sec.ar : sec.en}</p>
                      <p className="text-muted-foreground text-xs">{isRtl ? sec.en : sec.ar}</p>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 border-t border-border" dir={isRtl ? 'rtl' : 'ltr'}>
                    <p className="text-foreground text-sm leading-7 whitespace-pre-line mt-4">
                      {isRtl ? sec.body_ar : sec.body_en}
                    </p>
                    <p className="text-muted-foreground text-xs leading-6 whitespace-pre-line mt-3 border-t border-border pt-3">
                      {isRtl ? sec.body_en : sec.body_ar}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Links */}
        <div className="container mx-auto max-w-3xl mt-10 flex flex-wrap items-center gap-6 justify-center text-sm text-muted-foreground">
          <Link href="/terms" className="text-primary hover:underline font-medium flex items-center gap-1">
            <Arrow className="h-3.5 w-3.5" />
            {isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </Link>
          <span>·</span>
          <Link href="/contact" className="text-primary hover:underline font-medium flex items-center gap-1">
            <Arrow className="h-3.5 w-3.5" />
            {isRtl ? 'تواصل معنا' : 'Contact Us'}
          </Link>
        </div>
      </section>
    </>
  );
};
