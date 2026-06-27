import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export function Contact() {
  const { t, isRtl } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSent(true); setSending(false);
  }

  return (
    <div className="font-sans">
      <div className="bg-[#0f2040] py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{isRtl ? 'تواصل معنا' : 'Contact Us'}</h1>
        <p className="text-white/70">{isRtl ? 'فريقنا جاهز لمساعدتك' : 'Our team is ready to help you'}</p>
      </div>
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-xl font-bold text-[#0f2040] mb-6">{isRtl ? 'معلومات التواصل' : 'Contact Information'}</h2>
            <div className="space-y-5">
              {[{ icon: MapPin, label: isRtl ? 'العنوان' : 'Address', value: isRtl ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia' },
                { icon: Phone, label: isRtl ? 'الهاتف' : 'Phone', value: '+966 11 000 0000' },
                { icon: Mail, label: isRtl ? 'البريد الإلكتروني' : 'Email', value: 'info@housin.info' }
              ].map(item => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-[#c9a84c]" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{item.label}</div>
                    <div className="font-medium text-[#0f2040]">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-[#0f2040] mb-2">{isRtl ? 'تم الإرسال!' : 'Message Sent!'}</h3>
                <p className="text-gray-600">{isRtl ? 'سيتواصل معك فريقنا قريباً' : 'Our team will contact you soon'}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-bold text-[#0f2040] mb-4">{isRtl ? 'أرسل رسالة' : 'Send a Message'}</h3>
                {[{ key: 'name', label: isRtl ? 'الاسم' : 'Name', type: 'text' }, { key: 'email', label: isRtl ? 'البريد الإلكتروني' : 'Email', type: 'email' }, { key: 'phone', label: isRtl ? 'رقم الجوال' : 'Phone', type: 'tel' }].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] transition-colors" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isRtl ? 'الرسالة' : 'Message'}</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] transition-colors resize-none" />
                </div>
                <button type="submit" disabled={sending} className="w-full bg-[#c9a84c] hover:bg-[#b8963f] disabled:opacity-60 text-[#0f2040] font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />{sending ? (isRtl ? 'جارٍ الإرسال...' : 'Sending...') : (isRtl ? 'إرسال' : 'Send')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
