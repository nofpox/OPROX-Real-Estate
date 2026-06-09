import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import {
  Shield, CheckCircle2, MessageCircle,
  ArrowRight, ArrowLeft, Building2, Users, BarChart3,
  FileText, Wrench, Banknote, Megaphone, LayoutDashboard,
  UserCheck, CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── What we manage ────────────────────────────────────────────────────────────
const MANAGES = {
  ar: [
    { emoji: '🏨', title: 'الفنادق والشقق الفندقية', desc: 'إدارة تشغيلية كاملة من الاستقبال إلى الإيرادات وتجربة الضيف' },
    { emoji: '🏘️', title: 'المجمعات السكنية',       desc: 'إدارة شاملة للوحدات والمستأجرين والصيانة والخدمات المجتمعية' },
    { emoji: '🏢', title: 'المرافق المؤسسية',        desc: 'إدارة بيئات العمل والمكاتب باحترافية كاملة وامتثال تام للمعايير' },
  ],
  en: [
    { emoji: '🏨', title: 'Hotels & Serviced Apartments', desc: 'Full operational management from front desk to revenue and guest experience' },
    { emoji: '🏘️', title: 'Residential Compounds',        desc: 'Complete management of units, tenants, maintenance and community services' },
    { emoji: '🏢', title: 'Corporate Facilities',          desc: 'Professional management of workplaces & offices with full compliance' },
  ],
};

// ── What you get ──────────────────────────────────────────────────────────────
const BENEFITS = {
  ar: [
    { icon: FileText,       label: 'تقارير مالية شهرية مفصّلة'         },
    { icon: Wrench,         label: 'فريق صيانة على مدار الساعة'         },
    { icon: Users,          label: 'إدارة المستأجرين والعقود'           },
    { icon: Banknote,       label: 'متابعة الإيرادات والمصروفات'         },
    { icon: Megaphone,      label: 'تسويق ونشر عقاراتك إلكترونياً'       },
    { icon: LayoutDashboard,label: 'نظام إدارة عقارات متكامل (PMS)'     },
    { icon: UserCheck,      label: 'مدير حساب مخصص لك'                 },
    { icon: CalendarCheck,  label: 'تقارير أداء ربعية وسنوية'           },
  ],
  en: [
    { icon: FileText,       label: 'Detailed monthly financial reports'   },
    { icon: Wrench,         label: 'Around-the-clock maintenance team'    },
    { icon: Users,          label: 'Tenant and contract management'       },
    { icon: Banknote,       label: 'Revenue and expense tracking'         },
    { icon: Megaphone,      label: 'Digital property marketing & listing' },
    { icon: LayoutDashboard,label: 'Full Property Management System (PMS)'},
    { icon: UserCheck,      label: 'Dedicated account manager'            },
    { icon: CalendarCheck,  label: 'Quarterly & annual performance reports'},
  ],
};

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = {
  ar: [
    { num: '01', title: 'تواصل معنا',   desc: 'أخبرنا عن عقارك وتوقعاتك — خبراؤنا يستمعون بعناية.' },
    { num: '02', title: 'نُقيّم ونقترح', desc: 'نزور العقار ونُعدّ خطة إدارية متكاملة مع عرض سعر شفاف.' },
    { num: '03', title: 'نتولى الإدارة', desc: 'بعد توقيع العقد، يتولى فريقنا كل شيء مع تقارير منتظمة لك.' },
  ],
  en: [
    { num: '01', title: 'Contact Us',       desc: 'Tell us about your property — our experts will listen carefully.' },
    { num: '02', title: 'We Assess & Plan', desc: 'We visit the property and create a full management plan with a transparent proposal.' },
    { num: '03', title: 'We Manage It All', desc: 'After signing, our team takes over and keeps you updated with regular reports.' },
  ],
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export const GetStarted: React.FC = () => {
  const { isRtl } = useLanguage();
  const [form,   setForm]   = useState({ name: '', phone: '', propertyType: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');

  const manages  = isRtl ? MANAGES.ar  : MANAGES.en;
  const benefits = isRtl ? BENEFITS.ar : BENEFITS.en;
  const steps    = isRtl ? STEPS.ar    : STEPS.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setStatus('submitting');
    try {
      const res = await fetch('/realestate-api/guest/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name,
          phone:   form.phone,
          subject: isRtl
            ? `طلب بدء شراكة — ${form.propertyType || 'عقار'}`
            : `Partnership Request — ${form.propertyType || 'property'}`,
          message: form.message ||
            (isRtl ? 'طلب بدء شراكة جديد عبر صفحة ابدأ معنا.' : 'New partnership request via Get Started page.'),
        }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      setForm({ name: '', phone: '', propertyType: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <div className="flex flex-col w-full" dir={dir}>
      <Helmet>
        <title>{isRtl ? 'ابدأ معنا — روزوز' : 'Get Started — Rozoz'}</title>
        <meta name="description" content={isRtl
          ? 'فوّض إدارة عقارك لفريق روزوز المحترف — فنادق، مجمعات، مرافق مؤسسية'
          : 'Delegate your property management to the Rozoz professional team — hotels, compounds, corporate facilities'} />
      </Helmet>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-primary text-white py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-4 py-1.5 rounded-full mb-6 tracking-wide">
            <Shield className="h-3.5 w-3.5 text-secondary" />
            {isRtl ? 'شريكك الموثوق في إدارة العقارات' : 'Your trusted property management partner'}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            {isRtl ? 'ابدأ الشراكة مع روزوز' : 'Start Your Partnership with Rozoz'}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            {isRtl
              ? 'فوّض إدارة عقارك لفريق محترف وتركّز على ما يهمّك — نحن نتولى الباقي بالكامل.'
              : "Delegate your property management to a professional team and focus on what matters — we handle everything else."}
          </p>
        </div>
      </section>

      {/* ── 3 Steps ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'الطريقة' : 'The Process'}
            </p>
            <h2 className="text-3xl font-bold text-primary mb-3">
              {isRtl ? 'كيف تبدأ؟' : 'How Do You Start?'}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {isRtl ? 'ثلاث خطوات بسيطة تفصلك عن إدارة احترافية لعقارك' : 'Three simple steps to professional property management'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div key={i} className={`flex flex-col ${isRtl ? 'items-end text-right' : 'items-start'} gap-4`}>
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0">
                  <span className="text-secondary font-bold text-xl tabular-nums">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-primary text-lg mb-1.5">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Manage ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
              {isRtl ? 'تخصصنا' : 'Our Specialty'}
            </p>
            <h2 className="text-3xl font-bold text-primary">
              {isRtl ? 'ماذا نُدير؟' : 'What Do We Manage?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {manages.map((m, i) => (
              <div key={i} className={`bg-card rounded-2xl border border-border p-8 hover:border-secondary hover:shadow-xl transition-all duration-300 ${isRtl ? 'text-right' : ''}`}>
                <div className="text-4xl mb-4">{m.emoji}</div>
                <h3 className="text-lg font-bold text-primary mb-2">{m.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Get + Form ───────────────────────────────────────────────── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Benefits list */}
            <div className={isRtl ? 'text-right' : ''}>
              <p className="text-secondary text-xs font-semibold uppercase tracking-widest mb-3">
                {isRtl ? 'ما تحصل عليه' : 'What You Get'}
              </p>
              <h2 className="text-3xl font-bold text-primary mb-3">
                {isRtl ? 'إدارة كاملة، وضوح تام' : 'Full Management, Full Clarity'}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                {isRtl
                  ? 'بمجرد توقيع عقد الإدارة، يتولى فريق روزوز كل شيء ويزودك بتقارير دورية شفافة.'
                  : "Once the management agreement is signed, the Rozoz team handles everything and provides transparent periodic reports."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {benefits.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={i} className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <Icon className="h-4 w-4 text-secondary shrink-0" />
                      <span className="text-sm text-foreground/80">{b.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Trust note */}
              <div className={`mt-10 flex items-start gap-3 bg-secondary/5 rounded-xl p-4 border border-secondary/15 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                <BarChart3 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isRtl
                    ? 'روزوز تُدير فنادق ومجمعات ومرافق في المملكة العربية السعودية — عملاؤنا يرونون نتائج حقيقية في أول 90 يوماً.'
                    : 'Rozoz manages hotels, compounds, and facilities in Saudi Arabia — our clients see real results in the first 90 days.'}
                </p>
              </div>
            </div>

            {/* Request form */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-primary">
                    {isRtl ? 'تم استلام طلبك!' : 'Request received!'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {isRtl ? 'سيتواصل معك فريقنا خلال 24 ساعة.' : 'Our team will contact you within 24 hours.'}
                  </p>
                  <button onClick={() => setStatus('idle')} className="mt-2 text-xs text-secondary hover:underline">
                    {isRtl ? 'إرسال طلب آخر' : 'Submit another request'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className={`text-sm font-semibold text-primary mb-1 ${isRtl ? 'text-right' : ''}`}>
                    {isRtl ? 'أخبرنا عن عقارك' : 'Tell us about your property'}
                  </p>
                  <p className={`text-xs text-muted-foreground mb-4 ${isRtl ? 'text-right' : ''}`}>
                    {isRtl ? 'وسنتواصل معك خلال 24 ساعة' : "We'll be in touch within 24 hours"}
                  </p>

                  {([
                    { key: 'name',         label: isRtl ? 'اسمك الكامل'                           : 'Full Name',              required: true,  type: 'text', dir: undefined },
                    { key: 'phone',        label: isRtl ? 'رقم الجوال'                              : 'Phone Number',           required: true,  type: 'tel',  dir: 'ltr' as const },
                    { key: 'propertyType', label: isRtl ? 'نوع العقار (فندق / مجمع / مكاتب...)'   : 'Property Type',          required: false, type: 'text', dir: undefined },
                  ] as const).map(({ key, label, required, type, dir: fDir }) => (
                    <div key={key}>
                      <label className={`block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wide ${isRtl ? 'text-right' : ''}`}>
                        {label} {required && <span className="text-destructive">*</span>}
                      </label>
                      <input
                        type={type}
                        required={required}
                        value={form[key]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        dir={fDir}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/60 transition-colors"
                      />
                    </div>
                  ))}

                  <div>
                    <label className={`block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wide ${isRtl ? 'text-right' : ''}`}>
                      {isRtl ? 'رسالتك (اختياري)' : 'Message (optional)'}
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      rows={3}
                      placeholder={isRtl ? 'أي تفاصيل إضافية تودّ مشاركتها...' : "Any additional details you'd like to share..."}
                      className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none ${isRtl ? 'text-right' : ''}`}
                    />
                  </div>

                  {status === 'error' && (
                    <p className={`text-xs text-destructive ${isRtl ? 'text-right' : ''}`}>
                      {isRtl ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold text-sm"
                  >
                    {status === 'submitting'
                      ? (isRtl ? 'جاري الإرسال...' : 'Sending...')
                      : (isRtl ? 'أرسل طلبك — سنتواصل معك' : "Send Request — We'll Contact You")}
                    {status !== 'submitting' && (
                      isRtl
                        ? <ArrowLeft  className="ms-2 h-4 w-4" />
                        : <ArrowRight className="ms-2 h-4 w-4" />
                    )}
                  </Button>

                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{isRtl ? 'أو' : 'or'}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <a
                    href={ROZOZ_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border-2 border-[#25D366] text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/5 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {isRtl ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
                  </a>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Back to site ─────────────────────────────────────────────────────── */}
      <section className="py-10 bg-muted border-t border-border">
        <div className={`container mx-auto px-4 flex items-center justify-center gap-2 text-sm text-muted-foreground ${isRtl ? 'flex-row-reverse' : ''}`}>
          {isRtl
            ? <ArrowRight className="h-4 w-4" />
            : <ArrowLeft  className="h-4 w-4" />}
          <Link href="/" className="hover:text-secondary transition-colors">
            {isRtl ? 'العودة للصفحة الرئيسية' : 'Back to home'}
          </Link>
        </div>
      </section>
    </div>
  );
};
