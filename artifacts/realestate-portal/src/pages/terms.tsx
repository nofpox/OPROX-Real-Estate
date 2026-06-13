import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    ar: "الموافقة على الشروط",
    en: "Acceptance of Terms",
    body_ar: 'بمجرد قيام المستخدم بالتسجيل في منصة "رزوز" واستخدامها، فإن ذلك يعد موافقة صريحة على جميع بنود هذه الشروط والأحكام. وفي حال عدم الموافقة، يجب على المستخدم الامتناع عن استخدام المنصة.',
    body_en: 'By registering and using the ROZOZ platform, the user expressly agrees to all these Terms & Conditions. If you do not agree, you must refrain from using the platform.',
  },
  {
    ar: "طبيعة الخدمة",
    en: "Nature of Service",
    body_ar: "توفر رزوز منصة إلكترونية لإدارة العقارات وتوثيق العقود الإيجارية وإرسال التنبيهات المتعلقة بالدفع. تعمل الشركة كوسيط تقني فقط ولا تتحمل أي مسؤولية قانونية أو تعاقدية تنشأ بين المؤجر والمستأجر أو البائع والمشتري.",
    body_en: "ROZOZ provides an electronic platform for property management, lease documentation and payment notifications. The company acts as a technology intermediary only and bears no legal or contractual liability arising between landlord and tenant or seller and buyer.",
  },
  {
    ar: "إنشاء الحساب والالتزامات",
    en: "Account Creation & Obligations",
    body_ar: "يلتزم المستخدم بتقديم بيانات صحيحة وكاملة عند التسجيل. يتحمل المستخدم المسؤولية الكاملة عن سرية بيانات الدخول الخاصة به. يحظر إنشاء أكثر من حساب واحد لنفس المستخدم.",
    body_en: "The user undertakes to provide accurate and complete data upon registration. The user bears full responsibility for the confidentiality of their login credentials. Creating more than one account per user is prohibited.",
  },
  {
    ar: "الاستخدام المحظور",
    en: "Prohibited Use",
    body_ar: "يلتزم المستخدم بعدم استخدام المنصة لأي أغراض مخالفة للأنظمة واللوائح المعمول بها في المملكة العربية السعودية. يحظر القيام بأي محاولات للوصول غير المصرح به أو اختراق الأنظمة أو سرقة بيانات المستخدمين الآخرين. تحتفظ الشركة بحق إيقاف أو إنهاء الحساب فوراً في حال المخالفة.",
    body_en: "The user must not use the platform for any purpose contrary to the laws and regulations in force in the Kingdom of Saudi Arabia. Unauthorised access attempts, system intrusion, or theft of other users' data are strictly prohibited. The company reserves the right to immediately suspend or terminate the account in case of violation.",
  },
  {
    ar: "الرسوم والاشتراكات",
    en: "Fees & Subscriptions",
    body_ar: "في حال توفر خدمات مدفوعة، فإن الدفع يتم مقدماً وبطرق إلكترونية معتمدة. تحتفظ الشركة بحق تعديل الرسوم والأسعار في أي وقت، على أن لا يسري التعديل على الاشتراكات المدفوعة مسبقاً إلا بعد انتهاء مدتها.",
    body_en: "Where paid services are available, payment is made in advance through approved electronic methods. The company reserves the right to modify fees at any time, provided the modification does not apply to pre-paid subscriptions until their expiry.",
  },
  {
    ar: "حقوق الملكية الفكرية",
    en: "Intellectual Property",
    body_ar: 'جميع الحقوق المتعلقة بمنصة "رزوز" من تصميم وشفرة برمجية وشعار ومحتوى هي ملك حصري للشركة. يحظر نسخ أو إعادة توزيع أو تعديل أي جزء من المنصة دون الحصول على موافقة خطية مسبقة.',
    body_en: 'All rights relating to the ROZOZ platform — design, code, logo and content — are the exclusive property of the company. Copying, redistributing or modifying any part of the platform without prior written consent is strictly prohibited.',
  },
  {
    ar: "إنهاء وإيقاف الحساب",
    en: "Account Termination",
    body_ar: "يحق للمستخدم طلب إغلاق حسابه في أي وقت من خلال الإعدادات. كما يحق للشركة إيقاف أو إنهاء حساب المستخدم دون إشعار مسبق ودون أي تعويض في حال ثبوت مخالفته لهذه الشروط.",
    body_en: "The user may request account closure at any time through Settings. The company may also suspend or terminate a user account without prior notice and without any compensation if a violation of these Terms is established.",
  },
  {
    ar: "إخلاء المسؤولية",
    en: "Disclaimer",
    body_ar: "تبذل الشركة قصارى جهدها لضمان استمرارية عمل المنصة دون انقطاع، إلا أنها لا تقدم أي ضمانات صريحة أو ضمنية بخصوص توفرها أو خلوها من الأخطاء. لا تتحمل الشركة المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام المنصة.",
    body_en: "The company makes every effort to ensure the platform operates without interruption, but provides no express or implied warranties as to its availability or freedom from errors. The company is not liable for any direct or indirect damages resulting from use of the platform.",
  },
];

export const Terms: React.FC = () => {
  const { isRtl } = useLanguage();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const Arrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <>
      <Helmet>
        <title>{isRtl ? 'الشروط والأحكام — رزوز' : 'Terms & Conditions — ROZOZ'}</title>
      </Helmet>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            {isRtl ? 'رزوز · ROZOZ' : 'ROZOZ · رزوز'}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </h1>
          <p className="text-primary-foreground/60 text-base">
            {isRtl ? 'Terms & Conditions' : 'الشروط والأحكام'}
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
          <Link href="/privacy" className="text-primary hover:underline font-medium flex items-center gap-1">
            <Arrow className="h-3.5 w-3.5" />
            {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
