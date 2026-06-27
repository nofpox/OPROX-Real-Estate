import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { Building2, Shield, TrendingUp, Users, MapPin, Award } from 'lucide-react';
import { Link } from 'wouter';

export function About() {
  const { t, isRtl } = useLanguage();
  return (
    <div className="font-sans">
      <div className="bg-[#0f2040] py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{isRtl ? 'عن روزوز' : 'About Rozoz'}</h1>
        <p className="text-white/70 max-w-xl mx-auto">{isRtl ? 'منصة عقارية رائدة في المملكة العربية السعودية والعالم العربي' : 'Leading real estate platform in Saudi Arabia and the Arab world'}</p>
      </div>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-2xl font-bold text-[#0f2040] mb-4">{isRtl ? 'قصتنا' : 'Our Story'}</h2>
            <p className="text-gray-600 leading-relaxed mb-4">{isRtl ? 'روزوز هي منصة عقارية متكاملة تأسست لتكون الأكبر والأكثر موثوقية في المملكة العربية السعودية والعالم العربي. نربط المشترين والمستأجرين والبائعين بأفضل الفرص العقارية.' : 'Rozoz is a comprehensive real estate platform founded to be the largest and most trusted in Saudi Arabia and the Arab world. We connect buyers, renters, and sellers with the best real estate opportunities.'}</p>
            <p className="text-gray-600 leading-relaxed">{isRtl ? 'نؤمن أن كل شخص يستحق أن يجد منزله المثالي بسهولة وشفافية وثقة. لذلك بنينا منصة تجمع أحدث التقنيات مع الخبرة العميقة في السوق العقاري السعودي.' : "We believe everyone deserves to find their perfect home easily, transparently, and with confidence. That's why we built a platform combining the latest technology with deep expertise in the Saudi real estate market."}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-8">
            <div className="grid grid-cols-2 gap-6">
              {[{ n: '20,000+', l: isRtl ? 'عقار' : 'Properties' }, { n: '30+', l: isRtl ? 'مدينة' : 'Cities' }, { n: '1,200+', l: isRtl ? 'وكيل' : 'Agents' }, { n: '8,000+', l: isRtl ? 'صفقة' : 'Deals' }].map(s => (
                <div key={s.l} className="text-center">
                  <div className="text-2xl font-bold text-[#c9a84c]">{s.n}</div>
                  <div className="text-sm text-gray-600">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[{ icon: Shield, title: isRtl ? 'الثقة والشفافية' : 'Trust & Transparency', desc: isRtl ? 'نلتزم بأعلى معايير الشفافية في كل صفقة.' : 'We commit to the highest standards of transparency in every deal.' },
            { icon: TrendingUp, title: isRtl ? 'تقنية متقدمة' : 'Advanced Technology', desc: isRtl ? 'نستخدم الذكاء الاصطناعي لتقديم تقييمات دقيقة.' : 'We use AI to deliver accurate property valuations.' },
            { icon: Users, title: isRtl ? 'مجتمع موثوق' : 'Trusted Community', desc: isRtl ? 'شبكة من الوكلاء المعتمدين في جميع أنحاء المملكة.' : 'A network of certified agents across the Kingdom.' }
          ].map(card => (
            <div key={card.title} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm text-center">
              <card.icon className="w-10 h-10 text-[#c9a84c] mx-auto mb-4" />
              <h3 className="font-bold text-[#0f2040] mb-2">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/search" className="inline-flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b8963f] text-[#0f2040] font-bold px-8 py-3.5 rounded-lg transition-colors">
            {isRtl ? 'ابدأ البحث الآن' : 'Start Searching Now'}
          </Link>
        </div>
      </div>
    </div>
  );
}
