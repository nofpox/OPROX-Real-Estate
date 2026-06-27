import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Search, Phone, MessageCircle, Star, Award, MapPin, Home } from 'lucide-react';

interface Agent {
  id: number; nameAr: string; nameEn: string; city: string; phone: string;
  whatsapp: string; experience: number; listings: number; rating: number;
  reviews: number; specialties: string[]; verified: boolean; photo: string;
  bio: { ar: string; en: string };
}

const AGENTS: Agent[] = [
  { id: 1, nameAr: 'أحمد الشمري', nameEn: 'Ahmed Al-Shammari', city: 'الرياض', phone: '+966501234567', whatsapp: '966501234567', experience: 12, listings: 48, rating: 4.9, reviews: 127, specialties: ['villa', 'compound'], verified: true, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80', bio: { ar: 'خبرة 12 عاماً في سوق العقارات السعودي، متخصص في الفلل والمجمعات السكنية الفاخرة في شمال الرياض.', en: '12 years of experience in Saudi real estate, specializing in luxury villas and compounds in North Riyadh.' } },
  { id: 2, nameAr: 'فاطمة الزهراني', nameEn: 'Fatima Al-Zahrani', city: 'جدة', phone: '+966502345678', whatsapp: '966502345678', experience: 8, listings: 35, rating: 4.8, reviews: 89, specialties: ['apartment', 'commercial'], verified: true, photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80', bio: { ar: 'وكيلة عقارية متخصصة في شقق جدة والمنطقة التجارية، حائزة على شهادة الوساطة العقارية من هيئة العقار.', en: 'Real estate agent specializing in Jeddah apartments and commercial properties, certified by the Real Estate Authority.' } },
  { id: 3, nameAr: 'محمد القحطاني', nameEn: 'Mohammed Al-Qahtani', city: 'الدمام', phone: '+966503456789', whatsapp: '966503456789', experience: 15, listings: 62, rating: 5.0, reviews: 203, specialties: ['villa', 'land'], verified: true, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80', bio: { ar: 'خبرة 15 عاماً في المنطقة الشرقية، رائد في مجال الأراضي والفلل بالدمام والخبر والقطيف.', en: '15 years of experience in the Eastern Province, leading in land and villa deals in Dammam, Khobar, and Qatif.' } },
  { id: 4, nameAr: 'نورة العتيبي', nameEn: 'Noura Al-Otaibi', city: 'الرياض', phone: '+966504567890', whatsapp: '966504567890', experience: 6, listings: 27, rating: 4.7, reviews: 54, specialties: ['apartment', 'studio'], verified: true, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80', bio: { ar: 'متخصصة في الشقق السكنية ووحدات الاستثمار في وسط الرياض وحي العليا.', en: 'Specialized in residential apartments and investment units in central Riyadh and Al-Olaya district.' } },
  { id: 5, nameAr: 'عبدالله الغامدي', nameEn: 'Abdullah Al-Ghamdi', city: 'أبها', phone: '+966505678901', whatsapp: '966505678901', experience: 9, listings: 19, rating: 4.6, reviews: 38, specialties: ['chalet', 'farm', 'villa'], verified: false, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80', bio: { ar: 'متخصص في عقارات منطقة عسير والاستراحات والمزارع في أبها وخميس مشيط.', en: 'Specializing in Asir region properties, chalets and farms in Abha and Khamis Mushait.' } },
  { id: 6, nameAr: 'سارة البقمي', nameEn: 'Sara Al-Baqmi', city: 'جدة', phone: '+966506789012', whatsapp: '966506789012', experience: 10, listings: 41, rating: 4.9, reviews: 112, specialties: ['villa', 'compound', 'apartment'], verified: true, photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80', bio: { ar: 'وكيلة عقارية من أبرز المتخصصات في منطقة شمال جدة والمجمعات السكنية الفاخرة.', en: 'One of the leading real estate agents specializing in North Jeddah and luxury residential compounds.' } },
];

const CITIES = ['', 'الرياض', 'جدة', 'الدمام', 'أبها', 'مكة المكرمة', 'المدينة المنورة'];

const SPEC_ICONS: Record<string, string> = {
  villa: '🏡', apartment: '🏢', land: '🌍', compound: '🏘️',
  chalet: '⛺', farm: '🌾', commercial: '🏬', studio: '🛏️', office: '🏪',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(rating) ? 'text-[#c9a84c] fill-[#c9a84c]' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

export function Agents() {
  const { t, isRtl, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const filtered = AGENTS.filter(a => {
    const name = language === 'ar' ? a.nameAr : a.nameEn;
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !a.city.includes(search)) return false;
    if (cityFilter && a.city !== cityFilter) return false;
    return true;
  });

  return (
    <div className="font-sans">
      {/* Header */}
      <div className="bg-[#0f2040] py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[#c9a84c]/20 flex items-center justify-center mx-auto mb-3">
          <Award className="w-7 h-7 text-[#c9a84c]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('agents.title')}</h1>
        <p className="text-white/70 text-sm">{t('agents.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('agents.searchPlaceholder')} className={`w-full border border-gray-200 rounded-lg py-2 text-sm outline-none focus:border-[#c9a84c] ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} />
          </div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] bg-white">
            {CITIES.map(c => <option key={c} value={c}>{c || t('agents.filterCity')}</option>)}
          </select>
          <div className="text-sm text-gray-500 ms-auto">{filtered.length} {isRtl ? 'وكيل' : 'agents'}</div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">{t('agents.noResults')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(agent => (
              <div key={agent.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Top */}
                <div className="bg-gradient-to-br from-[#0f2040] to-[#1a3060] p-5 text-center">
                  <div className="relative inline-block mb-3">
                    <img src={agent.photo} alt={agent.nameAr} className="w-20 h-20 rounded-full object-cover border-3 border-[#c9a84c] ring-2 ring-white/20" onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'; }} />
                    {agent.verified && (
                      <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#c9a84c] rounded-full flex items-center justify-center" title={isRtl ? 'وكيل معتمد' : 'Certified'}>
                        <Award className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-lg">{language === 'ar' ? agent.nameAr : agent.nameEn}</h3>
                  <div className="flex items-center justify-center gap-1 text-white/70 text-xs mt-1">
                    <MapPin className="w-3 h-3" />{agent.city}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <StarRating rating={agent.rating} />
                    <span className="text-xs text-white/60">({agent.reviews})</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 border-b border-gray-100">
                  <div className="p-3 text-center border-e border-gray-100">
                    <div className="font-bold text-[#0f2040]">{agent.listings}</div>
                    <div className="text-xs text-gray-500">{isRtl ? 'إعلان' : 'Listings'}</div>
                  </div>
                  <div className="p-3 text-center">
                    <div className="font-bold text-[#0f2040]">{agent.experience}</div>
                    <div className="text-xs text-gray-500">{isRtl ? 'سنة خبرة' : 'Yrs Exp.'}</div>
                  </div>
                </div>

                {/* Specialties */}
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.specialties.map(s => (
                      <span key={s} className="text-xs bg-[#c9a84c]/10 text-[#0f2040] px-2 py-0.5 rounded-full border border-[#c9a84c]/20 flex items-center gap-1">
                        {SPEC_ICONS[s]}{isRtl ? t(`type.${s}`) : s}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a href={`tel:${agent.phone}`} className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2 text-sm font-medium text-[#0f2040] hover:border-[#c9a84c] transition-colors">
                      <Phone className="w-4 h-4 text-[#c9a84c]" />{isRtl ? 'اتصال' : 'Call'}
                    </a>
                    <a href={`https://wa.me/${agent.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                      <MessageCircle className="w-4 h-4" />{t('agents.whatsapp')}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
