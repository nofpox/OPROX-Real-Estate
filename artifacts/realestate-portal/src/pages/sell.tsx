import React, { useState } from 'react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { TrendingUp, Home, CheckCircle, Phone, Send } from 'lucide-react';

export function Sell() {
  const { t, isRtl } = useLanguage();
  const [form, setForm] = useState({ name: '', phone: '', city: '', type: '', price: '', notes: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSending(true);
    await new Promise(r => setTimeout(r, 1200)); setSent(true); setSending(false);
  }

  const STEPS = isRtl
    ? [{ n: '1', t: 'تقييم العقار', d: 'نقدم لك تقييماً مجانياً فورياً لعقارك بناءً على بيانات السوق الحالية.' },
       { n: '2', t: 'اختيار الوكيل', d: 'نربطك بأفضل الوكلاء المعتمدين في منطقتك لضمان أفضل سعر بأسرع وقت.' },
       { n: '3', t: 'نشر الإعلان', d: 'ينتشر إعلانك على منصة روزوز ويصل لآلاف المشترين المحتملين.' },
       { n: '4', t: 'إتمام الصفقة', d: 'نساعدك في إتمام جميع الإجراءات القانونية وتوثيق الصفقة بأمان.' }]
    : [{ n: '1', t: 'Property Valuation', d: 'Get a free instant AI-powered valuation for your property.' },
       { n: '2', t: 'Agent Matching', d: 'We match you with the best certified agents in your area.' },
       { n: '3', t: 'Listing Publication', d: 'Your listing goes live on Rozoz reaching thousands of buyers.' },
       { n: '4', t: 'Close the Deal', d: 'We assist with all legal procedures to close safely and securely.' }];

  return (
    <div className="font-sans">
      <div className="bg-[#0f2040] py-14 text-center">
        <Home className="w-10 h-10 text-[#c9a84c] mx-auto mb-3" />
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{isRtl ? 'بيع عقارك مع روزوز' : 'Sell Your Property with Rozoz'}</h1>
        <p className="text-white/70 text-sm max-w-md mx-auto">{isRtl ? 'أسرع وأفضل طريقة لبيع عقارك بأعلى سعر في السوق' : 'The fastest and best way to sell your property at the best market price'}</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {STEPS.map(step => (
            <div key={step.n} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#0f2040] text-white font-bold text-lg flex items-center justify-center mx-auto mb-3">{step.n}</div>
              <h3 className="font-bold text-[#0f2040] text-sm mb-2">{step.t}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Why sell with us */}
          <div>
            <h2 className="text-xl font-bold text-[#0f2040] mb-5">{isRtl ? 'لماذا روزوز؟' : 'Why Rozoz?'}</h2>
            <ul className="space-y-3">
              {(isRtl ? ['أكبر قاعدة مشترين في المملكة', 'تقييم مجاني بالذكاء الاصطناعي', 'وكلاء معتمدون من هيئة العقار', 'إجراءات قانونية مبسطة وآمنة', 'متابعة يومية حتى إتمام البيع'] : ['Largest buyer base in Saudi Arabia', 'Free AI-powered valuation', 'Agents certified by Real Estate Authority', 'Simplified and secure legal procedures', 'Daily follow-up until sale is complete']).map(item => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#c9a84c] shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl p-5">
              <TrendingUp className="w-8 h-8 text-[#c9a84c] mb-2" />
              <div className="font-bold text-[#0f2040] mb-1">{isRtl ? 'تقدير فوري لعقارك' : 'Instant Property Estimate'}</div>
              <p className="text-sm text-gray-600 mb-3">{isRtl ? 'اعرف قيمة عقارك السوقية الآن' : 'Know your property\'s market value now'}</p>
              <Link href="/search" className="inline-flex items-center gap-2 bg-[#c9a84c] text-[#0f2040] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#b8963f] transition-colors">
                {isRtl ? 'احصل على تقييم' : 'Get Estimate'}
              </Link>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h2 className="text-xl font-bold text-[#0f2040] mb-5">{isRtl ? 'أخبرنا عن عقارك' : 'Tell Us About Your Property'}</h2>
            {sent ? (
              <div className="text-center py-12">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#0f2040] mb-2">{isRtl ? 'تم استلام طلبك!' : 'Request Received!'}</h3>
                <p className="text-gray-600 text-sm">{isRtl ? 'سيتواصل معك أحد وكلائنا خلال 24 ساعة' : 'One of our agents will contact you within 24 hours'}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {[{ key: 'name', label: isRtl ? 'الاسم' : 'Name', type: 'text' }, { key: 'phone', label: isRtl ? 'رقم الجوال' : 'Phone', type: 'tel' }].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} required value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isRtl ? 'المدينة' : 'City'}</label>
                    <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] bg-white">
                      <option value="">--</option>
                      {['الرياض', 'جدة', 'الدمام', 'أبها', 'مكة المكرمة', 'المدينة المنورة'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isRtl ? 'نوع العقار' : 'Property Type'}</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] bg-white">
                      <option value="">--</option>
                      {[['villa', isRtl ? 'فيلا' : 'Villa'], ['apartment', isRtl ? 'شقة' : 'Apartment'], ['floor', isRtl ? 'دور' : 'Floor'], ['land', isRtl ? 'أرض' : 'Land'], ['commercial', isRtl ? 'تجاري' : 'Commercial']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isRtl ? 'السعر المتوقع (اختياري)' : 'Expected Price (optional)'}</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isRtl ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] resize-none" />
                </div>
                <button type="submit" disabled={sending} className="w-full bg-[#c9a84c] hover:bg-[#b8963f] disabled:opacity-60 text-[#0f2040] font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />{sending ? (isRtl ? 'جارٍ الإرسال...' : 'Sending...') : (isRtl ? 'إرسال الطلب' : 'Submit Request')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
