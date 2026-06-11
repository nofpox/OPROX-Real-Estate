import { useState } from "react";
import { ExternalLink } from "lucide-react";

const EULA_KEY     = "gms_eula";
const EULA_VERSION = "v1.0";

const SECTIONS = [
  {
    title: "١. الموافقة على الشروط",
    body: 'بمجرد قيام المستخدم بالتسجيل في تطبيق "رزوز الرقمية" واستخدامه، فإن ذلك يعد موافقة صريحة منه على جميع بنود هذه الشروط والأحكام. وفي حال عدم الموافقة، يجب على المستخدم الامتناع عن استخدام التطبيق.',
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
    body: 'جميع الحقوق المتعلقة بتطبيق "رزوز الرقمية" من تصميم وشفرة برمجية وشعار ومحتوى هي ملك حصري للشركة. يحظر نسخ أو إعادة توزيع أو تعديل أي جزء من التطبيق دون الحصول على موافقة خطية مسبقة.',
  },
  {
    title: "٧. إنهاء وإيقاف الحساب",
    body: "يحق للمستخدم طلب إغلاق حسابه في أي وقت من خلال الإعدادات. كما يحق للشركة إيقاف أو إنهاء حساب المستخدم دون إشعار مسبق ودون أي تعويض في حال ثبوت مخالفته لهذه الشروط.",
  },
  {
    title: "٨. إخلاء المسؤولية",
    body: "تبذل الشركة قصارى جهدها لضمان استمرارية عمل التطبيق دون انقطاع، إلا أنها لا تقدم أي ضمانات صريحة أو ضمنية بخصوص توفره أو خلوه من الأخطاء. لا تتحمل الشركة المسؤولية عن أي أضرار مباشرة أو غير مباشرة تنتج عن استخدام التطبيق أو عدم إمكانية الوصول إليه.",
  },
];

export function ConsentScreen({
  userId,
  onAccept,
}: {
  userId: number | string;
  onAccept: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [error, setError]     = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  function handleAccept() {
    if (!checked) {
      setError("يجب الموافقة على الشروط والأحكام أولاً");
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
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628] p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0A1628] px-8 py-8 text-center">
          <div className="w-16 h-16 bg-[#C9A84C]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-white font-bold text-xl">أهلاً في رزوز الرقمية</h1>
          <p className="text-white/50 text-sm mt-1">يرجى مراجعة الشروط قبل المتابعة</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">

          {/* Terms accordion */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setTermsOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
            >
              <span>الشروط والأحكام كاملة</span>
              <span className="text-gray-400 text-xs">{termsOpen ? "▲" : "▼"}</span>
            </button>
            {termsOpen && (
              <div className="px-4 py-4 space-y-4 max-h-64 overflow-y-auto">
                {SECTIONS.map(s => (
                  <div key={s.title}>
                    <p className="font-semibold text-gray-800 text-sm mb-1">{s.title}</p>
                    <p className="text-gray-600 text-sm leading-6">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy link */}
          <a
            href="https://rozoz.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[#2563EB] text-sm hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            سياسة الخصوصية
          </a>

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
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
            </span>
          </label>

          {/* Inline error */}
          {error && (
            <p className="text-red-600 text-xs">{error}</p>
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
            موافق ومتابعة
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
