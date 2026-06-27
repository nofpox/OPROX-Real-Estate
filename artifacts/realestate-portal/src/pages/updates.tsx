import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Bell, Search, Trash2, PlusCircle, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

interface SavedSearch {
  name: string; type: string; city: string; q: string;
  minPrice: string; maxPrice: string; bedrooms: string;
  savedAt: number;
}

const PRICE_DROPS = [
  { id: 1, title: 'فيلا حي النرجس', oldPrice: 3800000, newPrice: 3500000, city: 'الرياض', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=80' },
  { id: 2, title: 'شقة الكورنيش جدة', oldPrice: 7000, newPrice: 5500, city: 'جدة', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&q=80' },
  { id: 3, title: 'دور الياسمين', oldPrice: 4600000, newPrice: 4200000, city: 'الرياض', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&q=80' },
];

export function Updates() {
  const { t, isRtl } = useLanguage();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newSearch, setNewSearch] = useState({ name: '', type: 'sale', city: '', q: '', email: '' });

  useEffect(() => {
    try { setSearches(JSON.parse(localStorage.getItem('rozoz_saved_searches') || '[]')); } catch { /* ignore */ }
  }, []);

  function deleteSearch(i: number) {
    const next = searches.filter((_, idx) => idx !== i);
    setSearches(next); localStorage.setItem('rozoz_saved_searches', JSON.stringify(next));
  }

  function saveSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = [...searches, { ...newSearch, minPrice: '', maxPrice: '', bedrooms: '', savedAt: Date.now() }];
    setSearches(next); localStorage.setItem('rozoz_saved_searches', JSON.stringify(next));
    setShowForm(false); setNewSearch({ name: '', type: 'sale', city: '', q: '', email: '' });
  }

  function formatAgo(ts: number) {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 60) return isRtl ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isRtl ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return isRtl ? `منذ ${days} يوم` : `${days}d ago`;
  }

  return (
    <div className="font-sans">
      <div className="bg-[#0f2040] py-12 text-center">
        <Bell className="w-10 h-10 text-[#c9a84c] mx-auto mb-3" />
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('updates.title')}</h1>
        <p className="text-white/70 text-sm">{t('updates.subtitle')}</p>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-4xl">

        {/* Price drops section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-[#0f2040] mb-2">{t('updates.priceDrops')}</h2>
          <p className="text-sm text-gray-500 mb-5">{t('updates.priceDropsDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRICE_DROPS.map(p => {
              const drop = Math.round(((p.oldPrice - p.newPrice) / p.oldPrice) * 100);
              return (
                <Link key={p.id} href={`/property/${p.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 group">
                  <div className="relative h-36 overflow-hidden">
                    <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-2 start-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />↓{drop}%
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-[#0f2040] truncate">{p.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.city}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs line-through text-gray-400">{p.oldPrice.toLocaleString()}</span>
                      <span className="text-sm font-bold text-green-600">{p.newPrice.toLocaleString()} {isRtl ? 'ر.س' : 'SAR'}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Saved searches */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-[#0f2040]">{t('updates.savedSearches')}</h2>
            <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-[#c9a84c] hover:text-[#b8963f] transition-colors">
              <PlusCircle className="w-4 h-4" />{t('updates.saveSearch')}
            </button>
          </div>

          {/* New search form */}
          {showForm && (
            <form onSubmit={saveSearch} className="bg-[#0f2040]/5 border border-[#c9a84c]/20 rounded-xl p-5 mb-5">
              <h3 className="font-semibold text-[#0f2040] mb-4">{t('updates.saveSearch')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('updates.searchName')}</label>
                  <input required value={newSearch.name} onChange={e => setNewSearch(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" placeholder={isRtl ? 'مثال: فيلا في الرياض' : 'e.g. Villa in Riyadh'} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('updates.email')}</label>
                  <input type="email" required value={newSearch.email} onChange={e => setNewSearch(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c]" placeholder="email@example.com" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('filter.city')}</label>
                  <select value={newSearch.city} onChange={e => setNewSearch(p => ({ ...p, city: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] bg-white">
                    <option value="">{t('filter.anyCity')}</option>
                    {['الرياض', 'جدة', 'الدمام', 'أبها', 'مكة المكرمة', 'المدينة المنورة'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isRtl ? 'نوع الإعلان' : 'Listing Type'}</label>
                  <select value={newSearch.type} onChange={e => setNewSearch(p => ({ ...p, type: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c9a84c] bg-white">
                    <option value="sale">{t('filter.forSale')}</option>
                    <option value="rent">{t('filter.forRent')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="bg-[#c9a84c] hover:bg-[#b8963f] text-[#0f2040] font-bold px-5 py-2 rounded-lg text-sm transition-colors">{t('updates.saveBtn')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">{t('common.cancel')}</button>
              </div>
            </form>
          )}

          {searches.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-600 mb-1">{t('updates.noSaved')}</p>
              <p className="text-sm text-gray-400">{t('updates.noSavedHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searches.map((s, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#0f2040] mb-1">{s.name}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full ${s.type === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.type === 'sale' ? t('filter.forSale') : t('filter.forRent')}
                      </span>
                      {s.city && <span>{s.city}</span>}
                      {s.q && <span>"{s.q}"</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{t('updates.lastAlert')}: {formatAgo(s.savedAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/search?type=${s.type}${s.city ? `&city=${s.city}` : ''}${s.q ? `&q=${s.q}` : ''}`} className="text-xs text-[#c9a84c] font-semibold hover:underline">{isRtl ? 'عرض النتائج' : 'View Results'}</Link>
                    <button onClick={() => deleteSearch(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
