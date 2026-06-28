import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Mic, Video, MicOff, BedDouble, MapPin, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const NAVY = '#0f2040';
const GOLD = '#c9a84c';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ListingResult {
  id: number;
  title: string;
  propertyType: string;
  listingType: string;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  district: string | null;
  city: string | null;
  image: string | null;
  areaSqm: number | null;
}

type ChatMode = 'real_estate' | 'tourist' | 'owner';

interface OwnerListingData {
  title: string;
  propertyType: string;
  listingType: string;
  city: string;
  district: string;
  price: number | null;
  areaSqm: number | null;
  bedrooms: number | null;
}

type ChatMessage =
  | { id: string; role: 'user' | 'assistant'; content: string }
  | { id: string; role: 'listings'; listings: ListingResult[]; mode: ChatMode }
  | { id: string; role: 'owner_summary'; data: OwnerListingData; published?: boolean; publishedId?: number }
  | { id: string; role: 'searching' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const TRIGGER_RE_AR  = 'تمام بدور لك الحين';
const TRIGGER_RE_EN  = 'Great, searching for you now';
const TRIGGER_TUR_AR = 'جهزت لك اقتراحات إقامتك';
const TRIGGER_TUR_EN = 'here are your stay options';
const TRIGGER_OWN_AR = 'جهزت ملخص عقارك';
const TRIGGER_OWN_EN = 'your listing summary is ready';

function hasTrigger(text: string) {
  return text.includes(TRIGGER_RE_AR)  || text.includes(TRIGGER_RE_EN) ||
         text.includes(TRIGGER_TUR_AR) || text.includes(TRIGGER_TUR_EN);
}
function hasOwnerTrigger(text: string) {
  return text.includes(TRIGGER_OWN_AR) || text.includes(TRIGGER_OWN_EN);
}

function isArabicText(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function fmtPrice(price: number | null, currency = 'SAR') {
  if (!price) return '—';
  return `${price.toLocaleString('en-SA')} ${currency}`;
}

const PT_LABELS: Record<string, string> = {
  villa: 'فيلا', apartment: 'شقة', commercial: 'تجاري',
  land: 'أرض', hotel: 'فندق', compound: 'مجمع سكني',
};

async function callAiChat(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const res = await fetch('/api/rkz/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('API error');
  const data = await res.json() as { reply: string };
  return data.reply ?? '';
}

async function searchListings(messages: Array<{ role: string; content: string }>): Promise<{ listings: ListingResult[]; mode: ChatMode }> {
  const res = await fetch('/api/rkz/search-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json() as { listings: ListingResult[]; mode: ChatMode };
  return { listings: data.listings ?? [], mode: data.mode ?? 'real_estate' };
}

async function extractOwnerData(messages: Array<{ role: string; content: string }>): Promise<OwnerListingData> {
  const res = await fetch('/api/rkz/extract-owner-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('Extraction failed');
  return res.json() as Promise<OwnerListingData>;
}

async function submitOwnerListing(data: OwnerListingData): Promise<{ success: boolean; id: number }> {
  const res = await fetch('/api/rkz/owner-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Submit failed');
  return res.json() as Promise<{ success: boolean; id: number }>;
}

async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'voice.webm');
  const res = await fetch('/api/rkz/transcribe', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Transcription failed');
  const data = await res.json() as { text: string };
  return data.text ?? '';
}

const PT_LABELS_EN: Record<string, string> = {
  villa: 'Villa', apartment: 'Apartment', commercial: 'Commercial',
  land: 'Land', hotel: 'Hotel', compound: 'Compound',
};
const LT_LABELS: Record<string, { ar: string; en: string }> = {
  sale: { ar: 'بيع', en: 'For Sale' },
  rent: { ar: 'إيجار', en: 'For Rent' },
};

function OwnerSummaryCard({
  msg, isRtl, onPublish,
}: {
  msg: Extract<ChatMessage, { role: 'owner_summary' }>;
  isRtl: boolean;
  onPublish: (msgId: string) => Promise<void>;
}) {
  const [publishing, setPublishing] = useState(false);
  const d = msg.data;
  const ptLabel = isRtl ? (PT_LABELS[d.propertyType] ?? d.propertyType) : (PT_LABELS_EN[d.propertyType] ?? d.propertyType);
  const ltLabel = isRtl ? (LT_LABELS[d.listingType]?.ar ?? d.listingType) : (LT_LABELS[d.listingType]?.en ?? d.listingType);
  const location = [d.district, d.city].filter(Boolean).join('، ');

  async function handlePublish() {
    setPublishing(true);
    try { await onPublish(msg.id); } finally { setPublishing(false); }
  }

  if (msg.published) {
    return (
      <div className="rounded-xl px-4 py-4 text-center space-y-1"
        style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #22c55e' }}>
        <p className="text-2xl">✅</p>
        <p className="text-sm font-bold" style={{ color: '#15803d' }}>
          {isRtl ? 'تم نشر عقارك بنجاح!' : 'Listing published successfully!'}
        </p>
        <a href={`/listings/${msg.publishedId}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs underline"
          style={{ color: NAVY }}>
          <ExternalLink size={11} />
          {isRtl ? 'مشاهدة الإعلان' : 'View Listing'}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: `1.5px solid ${GOLD}60` }}>
      <div className="px-4 py-3" style={{ backgroundColor: NAVY }}>
        <p className="text-sm font-bold" style={{ color: GOLD }}>
          📋 {isRtl ? 'ملخص عقارك' : 'Your Listing Summary'}
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {[
          { label: isRtl ? 'النوع' : 'Type', value: `${ptLabel} — ${ltLabel}` },
          { label: isRtl ? 'الموقع' : 'Location', value: location || '—' },
          { label: isRtl ? 'السعر' : 'Price', value: d.price ? `${d.price.toLocaleString('en-SA')} SAR` : '—' },
          { label: isRtl ? 'المساحة' : 'Area', value: d.areaSqm ? `${d.areaSqm} م²` : '—' },
          { label: isRtl ? 'الغرف' : 'Rooms', value: d.bedrooms ? String(d.bedrooms) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs gap-3">
            <span style={{ color: 'rgba(15,32,64,0.5)' }}>{label}</span>
            <span className="font-medium text-right" style={{ color: NAVY }}>{value}</span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: GOLD, color: NAVY }}>
          {publishing
            ? <><Loader2 size={15} className="animate-spin" />{isRtl ? 'جارٍ النشر...' : 'Publishing...'}</>
            : <>{isRtl ? '🚀 انشر العقار' : '🚀 Publish Listing'}</>}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full animate-bounce"
          style={{ backgroundColor: NAVY, opacity: 0.5, animationDelay: `${i * 160}ms` }} />
      ))}
    </div>
  );
}

function SearchingCard({ isRtl }: { isRtl: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm"
      style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: `1px solid ${GOLD}40` }}>
      <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: GOLD }} />
      <span style={{ color: NAVY }}>{isRtl ? 'جارٍ البحث في قاعدة العقارات...' : 'Searching property database...'}</span>
    </div>
  );
}

function ListingCard({ listing, isRtl, isTourist }: { listing: ListingResult; isRtl: boolean; isTourist: boolean }) {
  const ptLabel = isRtl
    ? (PT_LABELS[listing.propertyType] ?? listing.propertyType)
    : listing.propertyType;

  const priceLabel = isTourist
    ? `${fmtPrice(listing.price, listing.currency)}${isRtl ? '/ليلة' : '/night'}`
    : fmtPrice(listing.price, listing.currency);

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid rgba(15,32,64,0.08)' }}>
      {/* Image */}
      <div className="relative h-32 bg-slate-100 overflow-hidden">
        {listing.image ? (
          <img src={listing.image} alt={listing.title}
            className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            {isTourist ? '🏨' : '🏠'}
          </div>
        )}
        <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: NAVY, color: GOLD }}>
          {ptLabel}
        </span>
        {isTourist && (
          <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#0891b2', color: '#fff' }}>
            {isRtl ? '🏨 إقامة' : '🏨 Stay'}
          </span>
        )}
        {!isTourist && listing.listingType === 'rent' && (
          <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
            {isRtl ? 'إيجار' : 'Rent'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pt-2 pb-3 space-y-1.5">
        <p className="text-sm font-semibold leading-snug line-clamp-1" style={{ color: NAVY }}>
          {listing.title}
        </p>

        <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(15,32,64,0.55)' }}>
          <MapPin size={11} />
          <span className="line-clamp-1">
            {[listing.district, listing.city].filter(Boolean).join('، ')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: GOLD }}>
            {priceLabel}
          </p>
          {listing.bedrooms != null && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(15,32,64,0.55)' }}>
              <BedDouble size={12} />
              <span>{listing.bedrooms} {isRtl ? 'غرف' : 'bd'}</span>
            </div>
          )}
        </div>

        <a href={`/listings/${listing.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: NAVY, color: '#fff' }}>
          <ExternalLink size={12} />
          {isRtl ? 'تفاصيل أكثر' : 'More Details'}
        </a>
      </div>
    </div>
  );
}

function ListingsGroup({ listings, isRtl, mode }: { listings: ListingResult[]; isRtl: boolean; mode: ChatMode }) {
  const isTourist = mode === 'tourist';
  const label = isTourist
    ? (isRtl ? `وجدت ${listings.length} خيار إقامة يناسبك 🏨` : `Found ${listings.length} stay options for you 🏨`)
    : (isRtl ? `وجدت ${listings.length} عقار يناسبك 🏡` : `Found ${listings.length} matching properties 🏡`);
  return (
    <div className="w-full space-y-2">
      <p className="text-xs font-semibold" style={{ color: 'rgba(15,32,64,0.45)' }}>{label}</p>
      {listings.map(l => <ListingCard key={l.id} listing={l} isRtl={isRtl} isTourist={isTourist} />)}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function FloatingAIBubble() {
  const { isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [micState, setMicState] = useState<'idle' | 'recording' | 'processing'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greeting: ChatMessage = {
    id: '0', role: 'assistant',
    content: isRtl
      ? 'يا هلا والله 👋\nتبغى تسكن، تسافر، ولا عندك عقار تبي تنشره؟'
      : 'Welcome! 👋\nLooking to find a home, plan a stay, or list your property?',
  };

  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);

  useEffect(() => {
    const seen = localStorage.getItem('housin_ai_bubble_seen');
    if (!seen) {
      let t2: ReturnType<typeof setTimeout> | undefined;
      const t1 = setTimeout(() => {
        setShowTooltip(true);
        requestAnimationFrame(() => setTooltipVisible(true));
        t2 = setTimeout(() => {
          setTooltipVisible(false);
          setTimeout(() => { setShowTooltip(false); localStorage.setItem('housin_ai_bubble_seen', '1'); }, 300);
        }, 4500);
      }, 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); inputRef.current?.focus(); }, 80);
    }
  }, [open, messages, loading]);

  // After AI says the trigger, fetch listings and inject them as a card
  const fetchAndShowListings = useCallback(async (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    const searchId = `search_${Date.now()}`;
    setMessages(prev => [...prev, { id: searchId, role: 'searching' }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

    try {
      const { listings, mode } = await searchListings(history);
      setMessages(prev => [
        ...prev.filter(m => m.id !== searchId),
        { id: `listings_${Date.now()}`, role: 'listings', listings, mode },
      ]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== searchId));
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
  }, []);

  const fetchAndShowOwnerSummary = useCallback(async (history: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    const searchId = `search_${Date.now()}`;
    setMessages(prev => [...prev, { id: searchId, role: 'searching' }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    try {
      const data = await extractOwnerData(history);
      const summaryId = `owner_${Date.now()}`;
      setMessages(prev => [
        ...prev.filter(m => m.id !== searchId),
        { id: summaryId, role: 'owner_summary', data, published: false },
      ]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== searchId));
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
  }, []);

  const handlePublish = useCallback(async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.role !== 'owner_summary') return;
    const result = await submitOwnerListing(msg.data);
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, published: true, publishedId: result.id } : m
    ));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text.trim() };

    setMessages(prev => {
      const updated = [...prev, userMsg];
      (async () => {
        setLoading(true);
        try {
          const history = updated
            .filter((m): m is { id: string; role: 'user' | 'assistant'; content: string } =>
              m.role === 'user' || m.role === 'assistant')
            .filter(m => m.id !== '0')
            .map(m => ({ role: m.role, content: m.content }));

          const reply = await callAiChat(history);
          const replyMsg: ChatMessage = { id: Date.now().toString() + 'r', role: 'assistant', content: reply };
          setMessages(p => [...p, replyMsg]);

          // Trigger listing search or owner summary when bot signals readiness
          if (hasTrigger(reply)) {
            await fetchAndShowListings([...history, { role: 'assistant', content: reply }]);
          } else if (hasOwnerTrigger(reply)) {
            await fetchAndShowOwnerSummary([...history, { role: 'assistant', content: reply }]);
          }
        } catch {
          setMessages(p => [...p, {
            id: Date.now().toString() + 'e', role: 'assistant',
            content: isRtl
              ? '⚠️ عذراً يا غالي، ما قدرت أتواصل. حاول مرة ثانية 🙏'
              : '⚠️ Sorry, could not reach the server. Please try again.',
          }]);
        } finally {
          setLoading(false);
        }
      })();
      return updated;
    });
  }, [loading, isRtl, fetchAndShowListings, fetchAndShowOwnerSummary]);

  async function handleSend() { await sendText(input); }
  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function toggleMic() {
    if (micState === 'recording') { mediaRecorderRef.current?.stop(); return; }
    if (micState === 'processing') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setMicState('processing');
        try {
          const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
          const text = await transcribeAudio(blob);
          if (text.trim()) await sendText(text.trim());
        } catch { /* silent */ } finally { setMicState('idle'); }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setMicState('recording');
      setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 60_000);
    } catch {
      alert(isRtl ? 'تعذّر الوصول للميكروفون. تأكد من منح الإذن.' : 'Cannot access microphone. Please allow permission.');
    }
  }

  function openChat() { setOpen(true); setShowTooltip(false); localStorage.setItem('housin_ai_bubble_seen', '1'); }

  const userMessages = messages.filter((m): m is { id: string; role: 'user'; content: string } => m.role === 'user');
  const inputIsAr = isArabicText(userMessages.map(m => m.content).join('') || (isRtl ? 'أ' : ''));
  const bubblePos = isRtl ? 'left-5' : 'right-5';
  const panelPos  = isRtl ? 'left-5' : 'right-5';

  return (
    <>
      {!open && (
        <div className={`fixed bottom-6 ${bubblePos} z-50 flex flex-col items-end gap-2`}>
          {showTooltip && (
            <div className="relative mb-1"
              style={{ opacity: tooltipVisible ? 1 : 0, transform: tooltipVisible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.28s, transform 0.28s' }}>
              <div className="px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold whitespace-nowrap"
                style={{ backgroundColor: NAVY, color: GOLD }}>
                الذكاء الاصطناعي: امر تدلل 😎
              </div>
              <div className="absolute -bottom-1.5 right-5 w-3 h-3 rotate-45 rounded-sm" style={{ backgroundColor: NAVY }} />
            </div>
          )}
          <button onClick={openChat}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: NAVY, border: `2.5px solid ${GOLD}`, boxShadow: '0 6px 24px rgba(15,32,64,0.45)' }}
            aria-label="AI Chat">
            <span className="text-2xl">🤖</span>
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40 md:hidden bg-black/20" onClick={() => setOpen(false)} />
          <div className={`fixed bottom-5 ${panelPos} z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden`}
            style={{
              width: 'min(390px, calc(100vw - 2rem))',
              height: 'min(600px, calc(100dvh - 5rem))',
              border: '1.5px solid rgba(15,32,64,0.1)',
              backgroundColor: '#f5f7fa',
            }}
            dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: NAVY }}>
              <span className="text-2xl">🤖</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">HousIn AI</p>
                <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {isRtl ? 'سكرتيرك العقاري الذكي · متاح دائماً' : 'Your Smart Real Estate Secretary · Always on'}
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
                <X size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(msg => {
                // Searching indicator
                if (msg.role === 'searching') {
                  return (
                    <div key={msg.id} className="flex items-end gap-2">
                      <span className="text-xl flex-shrink-0 mb-0.5">🤖</span>
                      <SearchingCard isRtl={isRtl} />
                    </div>
                  );
                }

                // Owner summary card
                if (msg.role === 'owner_summary') {
                  return (
                    <div key={msg.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏠</span>
                        <span className="text-xs font-medium" style={{ color: 'rgba(15,32,64,0.5)' }}>
                          {isRtl ? 'ملخص العقار' : 'Listing Summary'}
                        </span>
                      </div>
                      <OwnerSummaryCard msg={msg} isRtl={isRtl} onPublish={handlePublish} />
                    </div>
                  );
                }

                // Listings cards
                if (msg.role === 'listings') {
                  return (
                    <div key={msg.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{msg.mode === 'tourist' ? '🏨' : '🤖'}</span>
                        <span className="text-xs font-medium" style={{ color: 'rgba(15,32,64,0.5)' }}>
                          {msg.mode === 'tourist'
                            ? (isRtl ? 'خيارات الإقامة' : 'Stay Options')
                            : (isRtl ? 'نتائج البحث' : 'Search Results')}
                        </span>
                      </div>
                      <ListingsGroup listings={msg.listings} isRtl={isRtl} mode={msg.mode} />
                    </div>
                  );
                }

                // Normal text message
                const isUser = msg.role === 'user';
                const ar = isArabicText(msg.content);
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                    {!isUser && <span className="text-xl flex-shrink-0 mb-0.5">🤖</span>}
                    <div className="max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        backgroundColor: isUser ? NAVY : '#fff',
                        color: isUser ? '#fff' : NAVY,
                        borderBottomRightRadius: isUser ? 4 : undefined,
                        borderBottomLeftRadius: !isUser ? 4 : undefined,
                        textAlign: ar ? 'right' : 'left',
                        boxShadow: !isUser ? '0 1px 6px rgba(0,0,0,0.07)' : undefined,
                      }}>
                      {msg.content}
                    </div>
                    {isUser && <span className="text-xl flex-shrink-0 mb-0.5">👤</span>}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-end gap-2">
                  <span className="text-xl flex-shrink-0 mb-0.5">🤖</span>
                  <div className="rounded-2xl rounded-bl-sm" style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="flex items-end gap-2 px-3 py-2.5 flex-shrink-0"
              style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(15,32,64,0.08)' }}>
              <button disabled
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 opacity-30 cursor-not-allowed"
                title={isRtl ? 'قريباً' : 'Coming soon'}>
                <Video size={16} style={{ color: NAVY }} />
              </button>

              <button onClick={toggleMic}
                disabled={micState === 'processing' || loading}
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  micState === 'recording' ? 'bg-red-500 animate-pulse shadow-lg'
                  : micState === 'processing' ? 'bg-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200'
                }`}>
                {micState === 'recording' ? <MicOff size={16} className="text-white" />
                  : micState === 'processing' ? <Loader2 size={16} className="animate-spin text-white" />
                  : <Mic size={16} style={{ color: NAVY }} />}
              </button>

              <textarea ref={inputRef} rows={1} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  micState === 'recording' ? (isRtl ? '🔴 جارٍ التسجيل...' : '🔴 Recording...')
                  : micState === 'processing' ? (isRtl ? '⏳ جارٍ التحويل...' : '⏳ Transcribing...')
                  : (isRtl ? 'اكتب أو تحدث...' : 'Type or speak...')
                }
                disabled={loading || micState !== 'idle'}
                className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 min-h-[38px] max-h-28 bg-slate-50"
                style={{ borderColor: 'rgba(15,32,64,0.12)', color: NAVY, direction: inputIsAr ? 'rtl' : 'ltr', textAlign: inputIsAr ? 'right' : 'left' }} />

              <button onClick={handleSend}
                disabled={!input.trim() || loading || micState !== 'idle'}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
                style={{ backgroundColor: GOLD }}>
                {loading ? <Loader2 size={15} className="animate-spin text-white" />
                  : <Send size={15} className="text-white" />}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
