import { useState } from "react";

const EULA_KEY     = "gms_eula";
const EULA_VERSION = "v1.0";

const TERMS_SECTIONS = [
  {
    num: "١ · 1",
    ar: "الموافقة على الشروط",
    en: "Acceptance of Terms",
    body: "بمجرد قيام المستخدم بالتسجيل في منصة \"رزوز\" واستخدامها، فإن ذلك يعد موافقة صريحة على جميع بنود هذه الشروط. By registering and using ROZOZ, the user expressly agrees to all these Terms.",
  },
  {
    num: "٢ · 2",
    ar: "طبيعة الخدمة",
    en: "Nature of Service",
    body: "توفر رزوز منصة إلكترونية لإدارة العقارات وتوثيق العقود وإرسال التنبيهات. تعمل الشركة كوسيط تقني فقط. ROZOZ provides an electronic platform for property management and lease documentation. The company acts as a technology intermediary only.",
  },
  {
    num: "٣ · 3",
    ar: "إنشاء الحساب والالتزامات",
    en: "Account Creation & Obligations",
    body: "يلتزم المستخدم بتقديم بيانات صحيحة وكاملة. يتحمل المسؤولية الكاملة عن سرية بيانات الدخول. يحظر إنشاء أكثر من حساب واحد. The user must provide accurate data and is fully responsible for the confidentiality of their login credentials.",
  },
  {
    num: "٤ · 4",
    ar: "الاستخدام المحظور",
    en: "Prohibited Use",
    body: "يحظر استخدام المنصة لأي أغراض مخالفة للأنظمة السعودية، أو محاولات الاختراق أو الوصول غير المصرح به. Use of the platform for any purpose contrary to Saudi regulations, hacking attempts, or unauthorised access is strictly prohibited.",
  },
  {
    num: "٥ · 5",
    ar: "حقوق الملكية الفكرية",
    en: "Intellectual Property",
    body: "جميع حقوق المنصة من تصميم وشفرة وشعار ومحتوى ملك حصري للشركة. يحظر نسخها دون إذن خطي. All rights to the platform's design, code, logo and content are the exclusive property of the company.",
  },
  {
    num: "٦ · 6",
    ar: "إخلاء المسؤولية",
    en: "Disclaimer",
    body: "لا تقدم الشركة ضمانات صريحة أو ضمنية بخصوص توفر المنصة أو خلوها من الأخطاء. The company provides no express or implied warranties as to platform availability or freedom from errors.",
  },
];

const PRIVACY_SECTIONS = [
  {
    num: "١ · 1",
    ar: "البيانات التي نجمعها",
    en: "Data We Collect",
    body: "رقم الجوال، الاسم، البريد الإلكتروني (اختياري)، بيانات الإعلانات، سجلات النشاط لتحسين الخدمة. Mobile number, name, email (optional), listing data, and activity logs to improve the service.",
  },
  {
    num: "٢ · 2",
    ar: "كيف نستخدم بياناتك",
    en: "How We Use Your Data",
    body: "تشغيل الخدمات، إدارة الحساب، عرض الإعلانات للمستخدمين المناسبين، إرسال الإشعارات. Operating services, managing accounts, displaying listings to relevant users, sending notifications.",
  },
  {
    num: "٣ · 3",
    ar: "مشاركة البيانات",
    en: "Data Sharing",
    body: "لا نبيع بياناتك لأي طرف ثالث. قد نشارك بيانات مجهولة الهوية لأغراض تحسين الخدمة فقط. We do not sell your data. We may share anonymised data with technology partners for improvement purposes only.",
  },
  {
    num: "٤ · 4",
    ar: "أمان البيانات وحقوقك",
    en: "Data Security & Your Rights",
    body: "نستخدم تشفير SSL/TLS. يحق لك الاطلاع على بياناتك أو تصحيحها أو طلب حذفها في أي وقت. We use SSL/TLS encryption. You have the right to access, correct or delete your data at any time.",
  },
];

export function ConsentScreen({
  userId,
  onAccept,
}: {
  userId: number | string;
  onAccept: () => void;
}) {
  const [checked, setChecked]       = useState(false);
  const [error, setError]           = useState("");
  const [termsOpen, setTermsOpen]   = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  function handleAccept() {
    if (!checked) {
      setError("يجب الموافقة على الشروط والأحكام أولاً · You must agree to the Terms first");
      return;
    }
    const record = {
      user_id:          String(userId),
      eula_accepted_at: new Date().toISOString(),
      eula_version:     EULA_VERSION,
    };
    localStorage.setItem(EULA_KEY, JSON.stringify(record));
    onAccept();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628] p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0A1628] px-8 py-8 text-center">
          <div className="w-16 h-16 bg-[#C9A84C]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-white font-bold text-xl">أهلاً في رزوز الرقمية</h1>
          <p className="text-[#C9A84C] text-sm mt-0.5 tracking-wide">Welcome to ROZOZ</p>
          <p className="text-white/50 text-xs mt-2">يرجى مراجعة الشروط قبل المتابعة · Please review the terms before continuing</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">

          {/* Terms accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setTermsOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs text-gray-500">Terms &amp; Conditions</span>
              <span className="font-semibold text-sm text-gray-700">الشروط والأحكام</span>
              <span className="text-gray-400 text-xs">{termsOpen ? "▲" : "▼"}</span>
            </button>
            {termsOpen && (
              <div className="px-4 py-4 space-y-4 max-h-64 overflow-y-auto bg-gray-50/50" dir="rtl">
                {TERMS_SECTIONS.map(s => (
                  <div key={s.num} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-[#0A1628] text-[#C9A84C] rounded px-1.5 py-0.5">{s.num}</span>
                      <span className="font-semibold text-gray-800 text-sm">{s.ar}</span>
                      <span className="text-gray-400 text-xs">· {s.en}</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-5">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setPrivacyOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs text-gray-500">Privacy Policy</span>
              <span className="font-semibold text-sm text-gray-700">سياسة الخصوصية</span>
              <span className="text-gray-400 text-xs">{privacyOpen ? "▲" : "▼"}</span>
            </button>
            {privacyOpen && (
              <div className="px-4 py-4 space-y-4 max-h-64 overflow-y-auto bg-gray-50/50" dir="rtl">
                {PRIVACY_SECTIONS.map(s => (
                  <div key={s.num} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-[#0A1628] text-[#C9A84C] rounded px-1.5 py-0.5">{s.num}</span>
                      <span className="font-semibold text-gray-800 text-sm">{s.ar}</span>
                      <span className="text-gray-400 text-xs">· {s.en}</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-5">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none pt-1" dir="rtl">
            <div
              onClick={() => { setChecked(v => !v); setError(""); }}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                checked
                  ? "bg-green-600 border-green-600"
                  : "border-gray-300 bg-white"
              }`}
            >
              {checked && (
                <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white">
                  <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-gray-700 text-sm leading-6">
              أوافق على الشروط والأحكام وسياسة الخصوصية لمنصة رزوز الرقمية
              <span className="block text-gray-400 text-xs mt-0.5">I agree to the Terms &amp; Conditions and Privacy Policy of ROZOZ</span>
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-xs text-center">{error}</p>
          )}

          {/* Accept button */}
          <button
            onClick={handleAccept}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              checked
                ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30"
                : "bg-gray-100 text-gray-400 cursor-default"
            }`}
          >
            <span className="block">موافق ومتابعة</span>
            <span className="block text-xs opacity-70 font-normal mt-0.5">Agree &amp; Continue</span>
          </button>

        </div>
      </div>
    </div>
  );
}

/** Read stored EULA record and check it's valid for current version */
export function isEulaAccepted(): boolean {
  try {
    const raw = localStorage.getItem(EULA_KEY);
    if (!raw) return false;
    const rec = JSON.parse(raw) as Record<string, unknown>;
    return rec.eula_version === EULA_VERSION && !!rec.eula_accepted_at;
  } catch {
    return false;
  }
}
