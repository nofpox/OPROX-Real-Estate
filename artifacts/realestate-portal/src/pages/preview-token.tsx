import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import {
  Shield, Clock, AlertTriangle, Loader2, XCircle,
  Scale, Camera, RefreshCw, CheckCircle2, LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const BASE = '/realestate-api';

const PORTAL_META: Record<string, { label: string; labelAr: string; path: string }> = {
  'rkz':       { label: 'HousIn Real Estate Portal', labelAr: 'بوابة HousIn العقارية',  path: '/realestate/' },
  'grand-pms': { label: 'HousIn Dashboard',          labelAr: 'لوحة تحكم HousIn',        path: '/grand-pms/' },
  'rkz-app':   { label: 'HousIn Mobile App',         labelAr: 'تطبيق HousIn للجوال',    path: '/rozoz-msrep/' },
};

type Status = 'loading' | 'disclaimer' | 'entering' | 'expired' | 'revoked' | 'invalid';

interface LinkData {
  portal: string;
  label: string;
  expiresAt: string;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'منتهي';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h} ساعة و${m} دقيقة`;
  return `${m} دقيقة`;
}

const LEGAL_CLAUSES = [
  {
    icon: RefreshCw,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    title: 'دخول لمرة واحدة فقط',
    body: 'هذا الرابط صالح للاستخدام مرة واحدة فقط. بمجرد دخولك سيُلغى الرابط نهائياً ولن تتمكن من العودة إليه مجدداً.',
  },
  {
    icon: Camera,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    title: 'تصوير الشاشة محظور',
    body: 'يُحظر تصوير الشاشة أو تسجيل المحتوى أو نسخه بأي وسيلة كانت. المحتوى المعروض محمي تقنياً وقانونياً.',
  },
  {
    icon: Scale,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    title: 'حماية الحقوق الفكرية والابتكارية',
    body: 'جميع المعلومات والتصاميم والبيانات المعروضة هي ملكية فكرية وابتكارية حصرية لشركة HousIn للحلول الذكية. يُحظر إعادة نشرها أو استخدامها لأي غرض.',
  },
  {
    icon: AlertTriangle,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-300',
    title: 'المسؤولية القانونية',
    body: 'أي انتهاك لهذه الشروط يُعرّض صاحبه للمسؤولية القانونية الكاملة وفق أنظمة الملكية الفكرية والجرائم المعلوماتية المعمول بها في المملكة العربية السعودية.',
  },
];

export function PreviewToken() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<LinkData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`${BASE}/preview/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (r.status === 410) {
          const msg = String(body.error ?? '');
          setErrorMsg(msg);
          setStatus(msg.toLowerCase().includes('revok') ? 'revoked' : 'expired');
          return;
        }
        if (!r.ok) { setErrorMsg(body.error ?? 'Unknown error'); setStatus('invalid'); return; }
        setData({ portal: body.portal, label: body.label, expiresAt: body.expiresAt });
        setStatus('disclaimer');
      })
      .catch(() => { setErrorMsg('Network error'); setStatus('invalid'); });
  }, [token]);

  async function handleEnter() {
    if (!accepted || !token) return;
    setStatus('entering');
    const path = data ? (PORTAL_META[data.portal]?.path ?? '/realestate/') : '/realestate/';
    // Esteti In PMS handles its own token consumption and creates a guest session.
    // Pass the raw token in the URL; do NOT pre-consume here.
    if (data?.portal === 'grand-pms') {
      window.location.href = `${path}?preview_token=${encodeURIComponent(token)}`;
      return;
    }
    // All other portals: consume (revoke) the token here — one-time use
    try {
      await fetch(`${BASE}/preview/${token}/consume`, { method: 'POST' });
    } catch { /* ignore — we still redirect */ }
    window.location.href = path;
  }

  const portalInfo = data ? PORTAL_META[data.portal] : null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
          <p className="text-sm text-slate-400">جارٍ التحقق من الرابط…</p>
        </div>
      </div>
    );
  }

  // ── Entering (redirect in progress) ─────────────────────────────────────────
  if (status === 'entering') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <p className="text-sm text-slate-300">تم قبول الشروط. جارٍ التوجيه…</p>
        </div>
      </div>
    );
  }

  // ── Error states ─────────────────────────────────────────────────────────────
  if (status !== 'disclaimer') {
    const isExpired = status === 'expired';
    const isRevoked = status === 'revoked';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4" dir="rtl">
        <Helmet><title>رابط غير صالح | HousIn</title></Helmet>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-900/40 flex items-center justify-center mx-auto">
            {isRevoked
              ? <XCircle className="h-7 w-7 text-red-400" />
              : <AlertTriangle className="h-7 w-7 text-red-400" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white mb-2">
              {isExpired
                ? 'الرابط منتهي الصلاحية'
                : isRevoked
                ? 'تم استخدام هذا الرابط مسبقاً'
                : 'رابط غير صالح'}
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              {isExpired
                ? 'انتهت صلاحية هذا الرابط المؤقت. تواصل مع المُرسِل للحصول على رابط جديد.'
                : isRevoked
                ? 'هذا الرابط صالح للاستخدام مرة واحدة فقط وقد سبق استخدامه. تواصل مع المُرسِل.'
                : errorMsg || 'هذا الرابط غير صالح أو تالف.'}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => navigate('/realestate/')}
          >
            الذهاب إلى الموقع
          </Button>
        </div>
      </div>
    );
  }

  // ── Main disclaimer screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 flex flex-col items-center justify-center" dir="rtl">
      <Helmet><title>شروط الوصول المؤقت | HousIn</title></Helmet>

      <div className="w-full max-w-md space-y-4">

        {/* Header card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">وصول آمن مؤقت</p>
          <h1 className="text-xl font-bold text-white mb-1">
            {portalInfo?.labelAr ?? data?.portal}
          </h1>
          {data?.label && (
            <p className="text-sm text-slate-400 italic">"{data.label}"</p>
          )}

          {/* Expiry */}
          <div className="mt-4 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm font-semibold text-amber-300">
            <Clock className="h-4 w-4 shrink-0" />
            <span>تنتهي الصلاحية خلال: {formatExpiry(data!.expiresAt)}</span>
          </div>
        </div>

        {/* Notice header */}
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
            اقرأ الشروط القانونية قبل الدخول
          </p>
        </div>

        {/* Legal clauses */}
        <div className="space-y-3">
          {LEGAL_CLAUSES.map(({ icon: Icon, color, bg, title, body }) => (
            <div key={title} className={`rounded-xl border p-4 space-y-1.5 ${bg}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className={`text-sm font-bold ${color}`}>{title}</p>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pr-9">{body}</p>
            </div>
          ))}
        </div>

        {/* Watermark notice */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            بدخولك إلى هذه الصفحة، تقر بأنك اطلعت على هذه الشروط وتوافق عليها بالكامل، وأن هوية جهازك ووقت دخولك قد سُجّلا.
          </p>
        </div>

        {/* Accept checkbox */}
        <label className="flex items-start gap-3 cursor-pointer bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 hover:border-amber-500/50 transition-colors">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              accepted ? 'bg-amber-500 border-amber-500' : 'border-slate-500 bg-slate-700'
            }`}>
              {accepted && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            أقر بأنني قرأت جميع الشروط والتحذيرات القانونية أعلاه وأوافق عليها، وأتحمل المسؤولية الكاملة عن أي مخالفة.
          </p>
        </label>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!accepted}
          className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            accepted
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg shadow-amber-500/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <LogIn className="h-4 w-4" />
          {accepted ? 'دخول — الرابط يُستخدم مرة واحدة فقط' : 'يجب الموافقة على الشروط أولاً'}
        </button>

        <p className="text-center text-[10px] text-slate-600">
          HousIn للحلول الذكية — جميع الحقوق محفوظة © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
