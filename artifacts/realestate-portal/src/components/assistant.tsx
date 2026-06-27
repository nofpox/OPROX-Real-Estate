import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import {
  MessageCircle, X, Send, Bot,
  ArrowRight, ArrowLeft, RotateCcw,
  CheckCircle2, Loader2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuickReply {
  label: string;
  action: () => void;
}

interface Message {
  id: string;
  from: 'bot' | 'user';
  text: string;
  quickReplies?: QuickReply[];
}

// Inquiry wizard state — maps 1-to-1 with DB / API fields
type InquiryType = 'property_management' | 'investment' | 'other' | null;
type InquiryStep =
  | 'idle'
  | 'pick_type'
  | 'collect_name'
  | 'collect_email'
  | 'collect_phone'
  | 'confirm'
  | 'submitting'
  | 'done'
  | 'error';

interface InquiryData {
  type:    InquiryType;
  name:    string;
  email:   string;
  phone:   string;
}

const EMPTY_INQUIRY: InquiryData = { type: null, name: '', email: '', phone: '' };

// Property search wizard state
type SearchStep =
  | 'idle'
  | 'pick_prop_type'
  | 'pick_listing_type'
  | 'collect_city'
  | 'pick_price'
  | 'pick_bedrooms'
  | 'showing_results'
  | 'saving'
  | 'saved';

interface SearchData {
  propertyType?: string;
  listingType?:  string;
  city?:         string;
  minPrice?:     string;
  maxPrice?:     string;
  bedrooms?:     number;
}

const EMPTY_SEARCH: SearchData = {};

// ── Validators ────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function sanitize(v: string): string {
  return v.trim().replace(/<[^>]*>/g, '').slice(0, 300);
}

// ── Keyword matcher ───────────────────────────────────────────────────────────

function detectIntent(text: string): 'partner' | 'investor' | 'properties' | 'contact' | 'unknown' {
  const t = text.toLowerCase();
  if (/partner|manag|invest|collaborat|شراكة|استثمار|تعاون|إدارة/.test(t)) return 'partner';
  if (/portal|login|sign.?in|dashboard|investor|account|forgot|password|بوابة|دخول|مستثمر|حساب/.test(t)) return 'investor';
  if (/propert|listing|rent|buy|sale|hotel|compound|apart|villa|عقار|فندق|مجمع|شقة|إيجار|شراء/.test(t)) return 'properties';
  if (/contact|email|call|phone|reach|support|help|تواصل|اتصل|مساعدة|دعم/.test(t)) return 'contact';
  return 'unknown';
}

// ── Main component ────────────────────────────────────────────────────────────

export const SmartAssistant: React.FC = () => {
  const { isRtl, language } = useLanguage();
  const { content } = useCms();
  const [, navigate] = useLocation();

  const [open, setOpen]               = useState(false);
  const [hasOpened, setHasOpened]     = useState(false);
  const [showBadge, setShowBadge]     = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [isTyping, setIsTyping]       = useState(false);
  const [inputVal, setInputVal]       = useState('');

  // Inquiry wizard
  const [inquiryStep, setInquiryStep] = useState<InquiryStep>('idle');
  const [inquiry, setInquiry]         = useState<InquiryData>(EMPTY_INQUIRY);
  const [inputError, setInputError]   = useState('');

  // Search wizard
  const [searchStep, setSearchStep] = useState<SearchStep>('idle');
  const [search, setSearch]         = useState<SearchData>(EMPTY_SEARCH);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ── Text helpers ─────────────────────────────────────────────────────────────

  const T = useCallback((en: string, ar: string) => isRtl ? ar : en, [isRtl]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Proactive badge after 12 s ───────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => { if (!hasOpened) setShowBadge(true); }, 12_000);
    return () => clearTimeout(t);
  }, [hasOpened]);

  // ── Re-init on language switch ───────────────────────────────────────────────

  useEffect(() => {
    if (open && messages.length > 0) {
      setMessages([]);
      setIsTyping(false);
      setInquiryStep('idle');
      setInquiry(EMPTY_INQUIRY);
      setInputError('');
      sendGreeting(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ── Navigation helpers ────────────────────────────────────────────────────────

  const goToPortal  = useCallback(() => { setOpen(false); navigate('/portal'); },   [navigate]);
  const goToListings = useCallback(() => { setOpen(false); navigate('/listings'); }, [navigate]);
  const goToContact  = useCallback(() => { setOpen(false); navigate('/contact'); },  [navigate]);

  // ── Message factory ──────────────────────────────────────────────────────────

  const pushMsg = useCallback((msg: Omit<Message, 'id'>, delay = 0) => {
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
    }, delay);
  }, []);

  const botTyping = useCallback((ms = 700) => { setIsTyping(true); return ms; }, []);

  // ── Inquiry wizard ────────────────────────────────────────────────────────────

  const startInquiryWizard = useCallback(() => {
    setInquiry(EMPTY_INQUIRY);
    setInputError('');
    setInquiryStep('pick_type');
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('Looking to partner with HousIn', 'مهتم بالتعاون مع HousIn') },
    ]);
    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        '🌟 Great! Let\'s get your inquiry to the right team.\n\nWhat best describes your interest?',
        '🌟 رائع! دعنا نوجّه استفسارك للفريق المناسب.\n\nما الذي يصف اهتمامك بشكل أفضل؟'
      ),
      quickReplies: [
        {
          label: T('🏢 Property Management', '🏢 إدارة عقارات'),
          action: () => selectInquiryType('property_management'),
        },
        {
          label: T('📈 Investment Opportunity', '📈 فرصة استثمارية'),
          action: () => selectInquiryType('investment'),
        },
        {
          label: T('💬 Other / General', '💬 أخرى / عامة'),
          action: () => selectInquiryType('other'),
        },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const selectInquiryType = useCallback((type: InquiryType) => {
    const label = type === 'property_management'
      ? T('🏢 Property Management', '🏢 إدارة عقارات')
      : type === 'investment'
        ? T('📈 Investment Opportunity', '📈 فرصة استثمارية')
        : T('💬 Other / General', '💬 أخرى / عامة');

    setInquiry(prev => ({ ...prev, type }));
    setInquiryStep('collect_name');
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: label },
    ]);
    botTyping(650);
    pushMsg({
      from: 'bot',
      text: T(
        'Perfect! Now, what\'s your full name? *',
        'ممتاز! ما هو اسمك الكامل؟ *'
      ),
    }, 650);
    setTimeout(() => inputRef.current?.focus(), 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const submitCollectedName = useCallback((raw: string) => {
    const name = sanitize(raw);
    if (!name || name.length < 2) {
      setInputError(T('Please enter your full name (at least 2 characters).', 'أدخل اسمك الكامل (حرفين على الأقل).'));
      return;
    }
    setInputError('');
    setInquiry(prev => ({ ...prev, name }));
    setInquiryStep('collect_email');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: name }]);
    botTyping(650);
    pushMsg({
      from: 'bot',
      text: T(
        `Nice to meet you, ${name}! 👋\n\nWhat's your email address? We'll use this to send you a confirmation. *`,
        `يسعدني التعرف عليك، ${name}! 👋\n\nما هو بريدك الإلكتروني؟ سنستخدمه لإرسال التأكيد. *`
      ),
    }, 650);
    setTimeout(() => inputRef.current?.focus(), 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const submitCollectedEmail = useCallback((raw: string) => {
    const email = sanitize(raw).toLowerCase();
    if (!isValidEmail(email)) {
      setInputError(T('Please enter a valid email address (e.g. name@domain.com).', 'أدخل بريدًا إلكترونيًا صحيحًا (مثال: name@domain.com).'));
      return;
    }
    setInputError('');
    setInquiry(prev => ({ ...prev, email }));
    setInquiryStep('collect_phone');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: email }]);
    botTyping(650);
    pushMsg({
      from: 'bot',
      text: T(
        'Got it! 📧\n\nFinally, what\'s the best phone number to reach you? (optional)',
        'تمام! 📧\n\nأخيرًا، ما هو رقم هاتفك؟ (اختياري)'
      ),
      quickReplies: [
        {
          label: T('⏭ Skip this step', '⏭ تخطى هذه الخطوة'),
          action: () => skipPhone(),
        },
      ],
    }, 650);
    setTimeout(() => inputRef.current?.focus(), 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const skipPhone = useCallback(() => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('Skip', 'تخطى') },
    ]);
    setInquiry(prev => ({ ...prev, phone: '' }));
    showConfirmStep('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl]);

  const submitCollectedPhone = useCallback((raw: string) => {
    const phone = sanitize(raw);
    setInputError('');
    setInquiry(prev => ({ ...prev, phone }));
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: phone }]);
    showConfirmStep(phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl]);

  const showConfirmStep = useCallback((phone: string) => {
    setInquiryStep('confirm');
    setInquiry(prev => {
      const updated = { ...prev, phone };
      const typeLabelEn = updated.type === 'property_management' ? 'Property Management'
        : updated.type === 'investment' ? 'Investment Opportunity' : 'Other / General';
      const typeLabelAr = updated.type === 'property_management' ? 'إدارة عقارات'
        : updated.type === 'investment' ? 'فرصة استثمارية' : 'أخرى / عامة';

      const summary = isRtl
        ? `يُرجى مراجعة بياناتك:\n\n📋 النوع: ${typeLabelAr}\n👤 الاسم: ${updated.name}\n📧 البريد: ${updated.email}${updated.phone ? `\n📞 الهاتف: ${updated.phone}` : ''}\n\nهل تريد إرسال الاستفسار؟`
        : `Please review your details:\n\n📋 Type: ${typeLabelEn}\n👤 Name: ${updated.name}\n📧 Email: ${updated.email}${updated.phone ? `\n📞 Phone: ${updated.phone}` : ''}\n\nReady to submit?`;

      botTyping(700);
      pushMsg({
        from: 'bot',
        text: summary,
        quickReplies: [
          { label: T('✅ Submit Inquiry', '✅ إرسال الاستفسار'), action: () => submitInquiry(updated) },
          { label: T('✏️ Start Over', '✏️ إعادة البدء'), action: () => startInquiryWizard() },
        ],
      }, 700);

      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const submitInquiry = useCallback(async (data: InquiryData) => {
    setInquiryStep('submitting');
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('✅ Submit Inquiry', '✅ إرسال الاستفسار') },
    ]);
    setIsTyping(true);

    const typeLabelEn = data.type === 'property_management' ? 'Property Management'
      : data.type === 'investment' ? 'Investment Opportunity' : 'Other / General';

    try {
      const res = await fetch('/realestate-api/guest/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    data.name,
          email:   data.email,
          phone:   data.phone || undefined,
          subject: isRtl ? `استفسار شراكة — ${typeLabelEn}` : `Partnership Inquiry — ${typeLabelEn}`,
          message: isRtl
            ? `استفسار شراكة مُقدَّم عبر المساعد الذكي. النوع: ${typeLabelEn}.`
            : `Partnership inquiry submitted via Smart Assistant. Type: ${typeLabelEn}.`,
        }),
      });

      setIsTyping(false);

      if (!res.ok) throw new Error('server_error');

      setInquiryStep('done');
      pushMsg({
        from: 'bot',
        text: T(
          `🎉 Your inquiry has been submitted, ${data.name}!\n\nOur team will contact you at ${data.email} within 24 hours.\n\nIs there anything else I can help you with?`,
          `🎉 تم إرسال استفسارك، ${data.name}!\n\nسيتواصل معك فريقنا على ${data.email} خلال 24 ساعة.\n\nهل هناك شيء آخر يمكنني مساعدتك به؟`
        ),
        quickReplies: [
          { label: T('Browse properties', 'تصفح العقارات'), action: goToListings },
          { label: T('Investor Portal', 'بوابة المستثمر'), action: goToPortal },
          { label: T('🔄 New conversation', '🔄 محادثة جديدة'), action: handleReset },
        ],
      }, 0);
    } catch {
      setIsTyping(false);
      setInquiryStep('error');
      pushMsg({
        from: 'bot',
        text: T(
          '⚠️ Something went wrong submitting your inquiry. Please try again or use the contact form directly.',
          '⚠️ حدث خطأ أثناء إرسال الاستفسار. يُرجى المحاولة مجددًا أو استخدام نموذج التواصل مباشرة.'
        ),
        quickReplies: [
          { label: T('Try again', 'حاول مجددًا'), action: () => submitInquiry(data) },
          { label: T('Contact page', 'صفحة التواصل'), action: goToContact },
        ],
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, goToListings, goToPortal, goToContact]);

  // ── Property search wizard ────────────────────────────────────────────────────

  const startSearchWizard = useCallback(() => {
    setSearch(EMPTY_SEARCH);
    setInputError('');
    setSearchStep('pick_prop_type');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: T('Find a property', 'أبحث عن عقار') }]);
    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T('🏠 Great! Let\'s find the right property for you.\n\nWhat type of property are you looking for?', '🏠 ممتاز! دعنا نجد العقار المناسب لك.\n\nما نوع العقار الذي تبحث عنه؟'),
      quickReplies: [
        { label: T('🏢 Apartment', '🏢 شقة'),      action: () => selectPropertyType('apartment') },
        { label: T('🏡 Villa',     '🏡 فيلا'),      action: () => selectPropertyType('villa') },
        { label: T('🏨 Hotel',     '🏨 فندق'),      action: () => selectPropertyType('hotel') },
        { label: T('🏘 Compound',  '🏘 مجمع'),      action: () => selectPropertyType('compound') },
        { label: T('✨ Any type',  '✨ أي نوع'),    action: () => selectPropertyType('') },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const selectPropertyType = useCallback((type: string) => {
    const label = type === 'apartment' ? T('🏢 Apartment', '🏢 شقة')
      : type === 'villa'     ? T('🏡 Villa', '🏡 فيلا')
      : type === 'hotel'     ? T('🏨 Hotel', '🏨 فندق')
      : type === 'compound'  ? T('🏘 Compound', '🏘 مجمع')
      : T('✨ Any type', '✨ أي نوع');
    setSearch(prev => ({ ...prev, propertyType: type || undefined }));
    setSearchStep('pick_listing_type');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: label }]);
    botTyping(600);
    pushMsg({
      from: 'bot',
      text: T('Are you looking to buy or rent?', 'هل تبحث للشراء أم للإيجار؟'),
      quickReplies: [
        { label: T('🏷 Buy',  '🏷 شراء'),  action: () => selectListingType('sale') },
        { label: T('🔑 Rent', '🔑 إيجار'), action: () => selectListingType('rent') },
        { label: T('✨ Either', '✨ كلاهما'), action: () => selectListingType('') },
      ],
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const selectListingType = useCallback((type: string) => {
    const label = type === 'sale' ? T('🏷 Buy', '🏷 شراء')
      : type === 'rent' ? T('🔑 Rent', '🔑 إيجار')
      : T('✨ Either', '✨ كلاهما');
    setSearch(prev => ({ ...prev, listingType: type || undefined }));
    setSearchStep('collect_city');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: label }]);
    botTyping(600);
    pushMsg({
      from: 'bot',
      text: T('Which city are you interested in? (type it or skip)', 'ما المدينة التي تهتم بها؟ (اكتبها أو تخطى)'),
      quickReplies: [
        { label: T('Riyadh',       'الرياض'),  action: () => submitSearchCity('Riyadh') },
        { label: T('Jeddah',       'جدة'),     action: () => submitSearchCity('Jeddah') },
        { label: T('Dammam',       'الدمام'),  action: () => submitSearchCity('Dammam') },
        { label: T('⏭ Any city',  '⏭ أي مدينة'), action: () => submitSearchCity('') },
      ],
    }, 600);
    setTimeout(() => inputRef.current?.focus(), 650);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const submitSearchCity = useCallback((raw: string) => {
    const city = sanitize(raw);
    setSearch(prev => ({ ...prev, city: city || undefined }));
    setSearchStep('pick_price');
    if (city) setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: city }]);
    else      setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: T('Any city', 'أي مدينة') }]);
    botTyping(600);
    pushMsg({
      from: 'bot',
      text: T('What\'s your approximate budget? (SAR)', 'ما هي ميزانيتك التقريبية؟ (ريال)'),
      quickReplies: [
        { label: T('Under 500K',        'أقل من 500 ألف'),    action: () => selectPriceRange('', '500000') },
        { label: T('500K – 1M',         '500 ألف – مليون'),   action: () => selectPriceRange('500000', '1000000') },
        { label: T('1M – 3M',           'مليون – 3 مليون'),   action: () => selectPriceRange('1000000', '3000000') },
        { label: T('3M – 10M',          '3 – 10 مليون'),      action: () => selectPriceRange('3000000', '10000000') },
        { label: T('Above 10M',         'أكثر من 10 مليون'),  action: () => selectPriceRange('10000000', '') },
        { label: T('⏭ No preference',  '⏭ غير محدد'),       action: () => selectPriceRange('', '') },
      ],
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const selectPriceRange = useCallback((min: string, max: string) => {
    const label = !min && !max ? T('No preference', 'غير محدد')
      : !min  ? T(`Under ${Number(max).toLocaleString()} SAR`,  `أقل من ${Number(max).toLocaleString()} ر.س`)
      : !max  ? T(`Above ${Number(min).toLocaleString()} SAR`,  `أكثر من ${Number(min).toLocaleString()} ر.س`)
      : T(`${Number(min).toLocaleString()}–${Number(max).toLocaleString()} SAR`, `${Number(min).toLocaleString()}–${Number(max).toLocaleString()} ر.س`);
    setSearch(prev => ({ ...prev, minPrice: min || undefined, maxPrice: max || undefined }));
    setSearchStep('pick_bedrooms');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: label }]);
    botTyping(600);
    pushMsg({
      from: 'bot',
      text: T('How many bedrooms do you need?', 'كم عدد غرف النوم التي تحتاجها؟'),
      quickReplies: [
        { label: T('Studio',        'استوديو'),         action: () => selectBedrooms(0) },
        { label: T('1 bedroom',     '1 غرفة'),          action: () => selectBedrooms(1) },
        { label: T('2 bedrooms',    '2 غرفة'),          action: () => selectBedrooms(2) },
        { label: T('3 bedrooms',    '3 غرف'),           action: () => selectBedrooms(3) },
        { label: T('4+ bedrooms',   '4+ غرف'),         action: () => selectBedrooms(4) },
        { label: T('⏭ Any',        '⏭ أي عدد'),       action: () => selectBedrooms(-1) },
      ],
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const selectBedrooms = useCallback((n: number) => {
    const label = n < 0  ? T('Any', 'أي عدد')
      : n === 0  ? T('Studio', 'استوديو')
      : n >= 4   ? T('4+ bedrooms', '4+ غرف')
      : T(`${n} bedroom${n !== 1 ? 's' : ''}`, `${n} غرف`);
    const bedrooms = n >= 0 ? n : undefined;
    const finalSearch: SearchData = {};
    setSearch(prev => {
      Object.assign(finalSearch, prev, { bedrooms });
      return { ...prev, bedrooms };
    });
    setSearchStep('showing_results');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: label }]);
    setIsTyping(true);

    // Build query params for listing count
    setTimeout(async () => {
      const params = new URLSearchParams({ status: 'active', _count: '1' });
      if (finalSearch.propertyType) params.set('propertyType', finalSearch.propertyType);
      if (finalSearch.listingType)  params.set('listingType',  finalSearch.listingType);
      if (finalSearch.city)         params.set('city',         finalSearch.city);
      if (finalSearch.minPrice)     params.set('minPrice',     finalSearch.minPrice);
      if (finalSearch.maxPrice)     params.set('maxPrice',     finalSearch.maxPrice);
      if (bedrooms !== undefined)   params.set('bedrooms',     String(bedrooms));

      let count = 0;
      try {
        const res = await fetch(`/realestate-api/listings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          count = Array.isArray(data?.data) ? data.data.length
            : Array.isArray(data)           ? data.length
            : (data?.total ?? data?.count ?? 0);
        }
      } catch { /* silent */ }

      setIsTyping(false);
      pushMsg({
        from: 'bot',
        text: count > 0
          ? T(
              `🎯 Found ${count} matching ${count === 1 ? 'listing' : 'listings'}!\n\nYou can view them now, or save this search to get notified when new properties are added.`,
              `🎯 وجدنا ${count} ${count === 1 ? 'عقار مطابق' : 'عقارات مطابقة'}!\n\nيمكنك عرضها الآن، أو حفظ البحث لتلقي تنبيه عند إضافة عقارات جديدة.`
            )
          : T(
              '🔍 No exact matches right now — but the market updates frequently!\n\nSave this search and we\'ll notify you as soon as a matching property is listed.',
              '🔍 لا توجد تطابقات دقيقة الآن — لكن السوق يتجدد باستمرار!\n\nاحفظ هذا البحث وسنعلمك فور توفر عقار مطابق.'
            ),
        quickReplies: [
          ...(count > 0 ? [{ label: T('👀 View listings', '👀 عرض العقارات'), action: () => { const p = new URLSearchParams(); if (finalSearch.propertyType) p.set('propertyType', finalSearch.propertyType); if (finalSearch.listingType) p.set('listingType', finalSearch.listingType); if (finalSearch.city) p.set('city', finalSearch.city); setOpen(false); navigate(`/listings?${p.toString()}`); } }] : []),
          { label: T('🔔 Save this search', '🔔 حفظ البحث'), action: () => saveSearchFlow(finalSearch) },
          { label: T('🔄 Start over', '🔄 بحث جديد'),        action: handleReset },
        ],
      }, 0);
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, navigate]);

  const saveSearchFlow = useCallback((criteria: SearchData) => {
    setSearchStep('saving');
    const defaultName = [
      criteria.propertyType,
      criteria.listingType === 'sale' ? 'for sale' : criteria.listingType === 'rent' ? 'for rent' : undefined,
      criteria.city,
      criteria.bedrooms !== undefined ? `${criteria.bedrooms}BR` : undefined,
    ].filter(Boolean).join(' ') || (isRtl ? 'بحث عقاري' : 'Property Search');

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text: T('🔔 Save this search', '🔔 حفظ البحث') }]);
    setIsTyping(true);

    fetch('/realestate-api/portal/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: defaultName, criteria, notifyEmail: true }),
    }).then(async (res) => {
      setIsTyping(false);
      if (res.status === 401) {
        setSearchStep('showing_results');
        pushMsg({
          from: 'bot',
          text: T(
            '🔑 To save searches and receive alerts, you need a free account.\n\nIt only takes 30 seconds to sign up!',
            '🔑 لحفظ عمليات البحث وتلقي التنبيهات، تحتاج إلى حساب مجاني.\n\nالتسجيل لا يستغرق سوى 30 ثانية!'
          ),
          quickReplies: [
            { label: T('Create free account', 'إنشاء حساب مجاني'), action: () => { setOpen(false); navigate('/join'); } },
            { label: T('Sign in', 'تسجيل الدخول'),                  action: () => { setOpen(false); navigate('/portal'); } },
            { label: T('← Back', '← رجوع'), action: () => showMainMenu() },
          ],
        }, 0);
        return;
      }
      if (!res.ok) throw new Error('save_failed');
      setSearchStep('saved');
      pushMsg({
        from: 'bot',
        text: T(
          `✅ Search saved as "${defaultName}"!\n\nYou'll get an email notification when a matching property is listed. Manage your searches in your Buyer Dashboard.`,
          `✅ تم حفظ البحث بعنوان "${defaultName}"!\n\nستتلقى تنبيهًا عبر البريد الإلكتروني عند إضافة عقار مطابق. أدِر عمليات البحث من لوحة المشتري.`
        ),
        quickReplies: [
          { label: T('📊 Buyer Dashboard', '📊 لوحة المشتري'), action: () => { setOpen(false); navigate('/portal/buyer'); } },
          { label: T('Browse listings',     'تصفح العقارات'),   action: goToListings },
          { label: T('🔄 New search',      '🔄 بحث جديد'),     action: handleReset },
        ],
      }, 0);
    }).catch(() => {
      setIsTyping(false);
      setSearchStep('showing_results');
      pushMsg({
        from: 'bot',
        text: T('⚠️ Could not save the search. Please try again.', '⚠️ تعذّر حفظ البحث. يُرجى المحاولة مجددًا.'),
        quickReplies: [
          { label: T('Try again', 'حاول مجددًا'), action: () => saveSearchFlow(criteria) },
          { label: T('← Back', '← رجوع'),        action: () => showMainMenu() },
        ],
      }, 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, navigate, goToListings]);

  // ── Main menu flows ───────────────────────────────────────────────────────────

  const showMainMenu = useCallback((delay = 0) => {
    const d = botTyping(650) + delay;
    pushMsg({
      from: 'bot',
      text: T(
        "Hi! 👋 I'm here to help. What brings you here today?",
        'مرحباً! 👋 أنا هنا للمساعدة. ماذا تبحث عن اليوم؟'
      ),
      quickReplies: [
        { label: T('🏠 Find a property', '🏠 أبحث عن عقار'), action: startSearchWizard },
        { label: T('Looking to partner with HousIn', 'مهتم بالتعاون مع HousIn'), action: startInquiryWizard },
        { label: T("I'm an existing client", 'أنا عميل حالي'), action: showInvestorFlow },
        { label: T('Contact our team', 'تواصل مع الفريق'), action: showContactFlow },
      ],
    }, d + delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const showInvestorFlow = useCallback(() => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T("I'm an existing client", 'أنا عميل حالي') },
    ]);
    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        "Welcome back! 🔑 Your Investor Portal gives you direct access to your managed properties, financial reports, and team communications.",
        'مرحباً بعودتك! 🔑 تتيح لك بوابة المستثمر الوصول المباشر إلى عقاراتك المدارة والتقارير المالية وتواصل الفريق.'
      ),
      quickReplies: [
        { label: T('Sign in to Investor Portal', 'تسجيل الدخول للبوابة'), action: goToPortal },
        { label: T('I forgot my credentials', 'نسيت بيانات الدخول'), action: showForgotFlow },
        { label: T('Contact support', 'تواصل مع الدعم'), action: showContactFlow },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping, goToPortal]);

  const showForgotFlow = useCallback(() => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('I forgot my credentials', 'نسيت بيانات الدخول') },
    ]);
    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        'No problem! On the portal sign-in page, tap "Need help logging in?" and we\'ll send you a secure access code by email.',
        'لا مشكلة! في صفحة تسجيل الدخول، اضغط "هل تحتاج مساعدة؟" وسنرسل لك رمز وصول آمن عبر البريد الإلكتروني.'
      ),
      quickReplies: [
        { label: T('Go to sign-in page', 'الذهاب لصفحة الدخول'), action: goToPortal },
        { label: T('← Back', '← رجوع'), action: () => showMainMenu() },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping, goToPortal]);

  const showPropertiesFlow = useCallback(() => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('Browse properties', 'تصفح العقارات') },
    ]);
    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        'We manage hotels, residential compounds, and corporate facilities across Saudi Arabia. Browse our full portfolio anytime.',
        'ندير فنادق ومجمعات سكنية ومرافق مؤسسية في جميع أنحاء المملكة. تصفح محفظتنا الكاملة في أي وقت.'
      ),
      quickReplies: [
        { label: T('View all properties', 'عرض كل العقارات'), action: goToListings },
        { label: T('Partner with us', 'التعاون معنا'), action: startInquiryWizard },
        { label: T('← Back', '← رجوع'), action: () => showMainMenu() },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping, goToListings]);

  const showContactFlow = useCallback(() => {
    const { contact } = content;
    const emailLine = contact.email ? `\n📧 ${contact.email}` : '';
    const phoneLine = contact.phone ? `\n📞 ${contact.phone}` : '';
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('Contact our team', 'تواصل مع فريقنا') },
    ]);
    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        `Our team is happy to help!${emailLine}${phoneLine}\nOr visit our contact page and we'll get back to you within 24 hours.`,
        `فريقنا سعيد بمساعدتك!${emailLine}${phoneLine}\nأو تفضل بزيارة صفحة التواصل وسنرد عليك خلال 24 ساعة.`
      ),
      quickReplies: [
        { label: T('Contact page', 'صفحة التواصل'), action: goToContact },
        { label: T('← Back', '← رجوع'), action: () => showMainMenu() },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping, goToContact, content]);

  const showUnknownFallback = useCallback((userText: string) => {
    const intent = detectIntent(userText);
    if (intent === 'partner')    { startInquiryWizard(); return; }
    if (intent === 'investor')   { showInvestorFlow();   return; }
    if (intent === 'properties') { showPropertiesFlow(); return; }
    if (intent === 'contact')    { showContactFlow();    return; }

    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        "I'm not sure I understood that. I can help you with:",
        'لم أفهم ذلك تماماً. يمكنني مساعدتك في:'
      ),
      quickReplies: [
        { label: T('Partnership inquiry', 'استفسار شراكة'), action: startInquiryWizard },
        { label: T('Investor Portal', 'بوابة المستثمر'), action: showInvestorFlow },
        { label: T('Browse properties', 'تصفح العقارات'), action: showPropertiesFlow },
        { label: T('Contact team', 'تواصل مع الفريق'), action: showContactFlow },
      ],
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  // ── Greeting ─────────────────────────────────────────────────────────────────

  const sendGreeting = useCallback((immediate = false) => {
    const delay = immediate ? 0 : 400;
    botTyping(600 + delay);
    showMainMenu(delay + 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMainMenu, botTyping]);

  // ── Open / close ─────────────────────────────────────────────────────────────

  const handleOpen = useCallback(() => {
    setOpen(true);
    setShowBadge(false);
    if (!hasOpened) {
      setHasOpened(true);
      sendGreeting(false);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [hasOpened, sendGreeting]);

  const handleClose = useCallback(() => setOpen(false), []);

  // ── Reset ─────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
    setInquiryStep('idle');
    setInquiry(EMPTY_INQUIRY);
    setInputError('');
    setSearchStep('idle');
    setSearch(EMPTY_SEARCH);
    sendGreeting(false);
  }, [sendGreeting]);

  // ── Free-text send — routes to wizard step or fallback ────────────────────────

  const handleSend = useCallback(() => {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal('');
    setInputError('');

    if (inquiryStep === 'collect_name')  { submitCollectedName(text);  return; }
    if (inquiryStep === 'collect_email') { submitCollectedEmail(text); return; }
    if (inquiryStep === 'collect_phone') { submitCollectedPhone(text); return; }
    if (searchStep === 'collect_city')   { submitSearchCity(text);     return; }

    // Not in wizard — free-text fallback
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text }]);
    showUnknownFallback(text);
  }, [inputVal, inquiryStep, searchStep, submitCollectedName, submitCollectedEmail, submitCollectedPhone, submitSearchCity, showUnknownFallback]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Input placeholder by wizard step ─────────────────────────────────────────

  const inputPlaceholder = (() => {
    if (inquiryStep === 'collect_name')  return T('Type your full name…', 'اكتب اسمك الكامل…');
    if (inquiryStep === 'collect_email') return T('Type your email address…', 'اكتب بريدك الإلكتروني…');
    if (inquiryStep === 'collect_phone') return T('Type your phone number…', 'اكتب رقم هاتفك…');
    if (searchStep === 'collect_city')   return T('Type a city or skip…', 'اكتب مدينة أو تخطى…');
    return T('Type your question…', 'اكتب سؤالك هنا…');
  })();

  const isInputActive: boolean = inquiryStep === 'collect_name'
    || inquiryStep === 'collect_email'
    || inquiryStep === 'collect_phone'
    || searchStep === 'collect_city'
    || (inquiryStep === 'idle' && searchStep === 'idle')
    || inquiryStep === 'done'
    || inquiryStep === 'error'
    || searchStep === 'saved';

  // ── Render ────────────────────────────────────────────────────────────────────

  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div
        className={`
          fixed bottom-36 md:bottom-24 end-4 md:end-6 z-50
          w-[calc(100vw-2rem)] max-w-sm md:max-w-[360px]
          flex flex-col
          bg-card rounded-2xl shadow-2xl border border-border/60
          transition-all duration-300 ease-out origin-bottom-right
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }
        `}
        style={{ maxHeight: 'min(540px, calc(100dvh - 8rem))' }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary rounded-t-2xl shrink-0">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              {isRtl ? 'المساعد الذكي' : 'Smart Assistant'}
            </p>
            <p className="text-xs text-white/50 leading-tight">
              {isRtl ? 'HousIn للحلول الذكية' : 'HousIn Smart Solutions'}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title={isRtl ? 'محادثة جديدة' : 'New conversation'}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress indicator — inquiry wizard */}
        {(inquiryStep !== 'idle' && inquiryStep !== 'done') && (
          <div className="shrink-0 bg-secondary/5 border-b border-border/40 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1">
              {(['pick_type', 'collect_name', 'collect_email', 'collect_phone', 'confirm'] as InquiryStep[]).map((step, i) => {
                const stepIndex = ['pick_type', 'collect_name', 'collect_email', 'collect_phone', 'confirm', 'submitting'].indexOf(inquiryStep);
                return (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i <= stepIndex ? 'bg-secondary w-6' : 'bg-border w-3'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground ms-1">
              {inquiryStep === 'submitting'
                ? T('Submitting…', 'جارٍ الإرسال…')
                : T('Partnership Inquiry', 'استفسار شراكة')}
            </span>
            {inquiryStep === 'submitting' && <Loader2 className="h-3 w-3 animate-spin text-secondary ms-auto" />}
            {inquiryStep === 'confirm' && <CheckCircle2 className="h-3.5 w-3.5 text-secondary ms-auto" />}
          </div>
        )}

        {/* Progress indicator — search wizard */}
        {searchStep !== 'idle' && searchStep !== 'saved' && inquiryStep === 'idle' && (
          <div className="shrink-0 bg-secondary/5 border-b border-border/40 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1">
              {(['pick_prop_type', 'pick_listing_type', 'collect_city', 'pick_price', 'pick_bedrooms', 'showing_results'] as SearchStep[]).map((_s, i) => {
                const idx = ['pick_prop_type', 'pick_listing_type', 'collect_city', 'pick_price', 'pick_bedrooms', 'showing_results', 'saving'].indexOf(searchStep);
                return (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= idx ? 'bg-secondary w-5' : 'bg-border w-2.5'}`} />
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground ms-1">
              {searchStep === 'saving'
                ? T('Saving…', 'جارٍ الحفظ…')
                : T('Property Search', 'بحث عقاري')}
            </span>
            {searchStep === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-secondary ms-auto" />}
            {searchStep === 'showing_results' && <CheckCircle2 className="h-3.5 w-3.5 text-secondary ms-auto" />}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-2 ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`
                  max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line
                  ${msg.from === 'bot'
                    ? 'bg-muted text-foreground rounded-ss-none'
                    : 'bg-secondary/15 text-primary rounded-se-none'}
                `}
              >
                {msg.text}
              </div>

              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full max-w-[85%]">
                  {msg.quickReplies.map((qr, i) => (
                    <button
                      key={i}
                      onClick={qr.action}
                      disabled={inquiryStep === 'submitting'}
                      className="
                        flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                        bg-background border border-border/80
                        hover:border-secondary/50 hover:bg-secondary/5 hover:text-secondary
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all duration-150 text-start
                      "
                    >
                      <Arrow className="h-3 w-3 shrink-0 opacity-50" />
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="bg-muted rounded-2xl rounded-ss-none px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Validation error */}
        {inputError && (
          <div className="shrink-0 px-4 py-2 bg-destructive/5 border-t border-destructive/20">
            <p className="text-xs text-destructive leading-snug">{inputError}</p>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-border/60 p-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type={inquiryStep === 'collect_email' ? 'email' : inquiryStep === 'collect_phone' ? 'tel' : 'text'}
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setInputError(''); }}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            disabled={!isInputActive || inquiryStep === 'submitting'}
            className="
              flex-1 h-9 px-3 rounded-xl text-sm
              bg-muted border-0
              focus:outline-none focus:ring-2 focus:ring-secondary/40
              placeholder:text-muted-foreground/50
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          />
          <button
            onClick={handleSend}
            disabled={!inputVal.trim() || !isInputActive || inquiryStep === 'submitting'}
            className="
              w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              bg-secondary text-secondary-foreground
              hover:bg-secondary/90 disabled:opacity-40 disabled:cursor-not-allowed
              transition-all
            "
            aria-label={isRtl ? 'إرسال' : 'Send'}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Floating trigger button ──────────────────────────────────────────── */}
      <button
        onClick={open ? handleClose : handleOpen}
        className={`
          fixed bottom-20 md:bottom-6 end-4 md:end-6 z-50
          w-14 h-14 rounded-full shadow-lg shadow-black/20
          flex items-center justify-center
          transition-all duration-300
          ${open
            ? 'bg-primary text-white scale-95 shadow-md'
            : 'bg-secondary text-secondary-foreground hover:scale-110 hover:shadow-xl active:scale-95'}
        `}
        aria-label={open
          ? (isRtl ? 'إغلاق المساعد' : 'Close assistant')
          : (isRtl ? 'افتح المساعد الذكي' : 'Open smart assistant')
        }
      >
        {showBadge && !open && (
          <span className="absolute inset-0 rounded-full bg-secondary/40 animate-ping" />
        )}
        {showBadge && !open && (
          <span className="absolute top-1 end-1 w-3 h-3 rounded-full bg-red-500 border-2 border-background" />
        )}
        {open
          ? <X className="h-5 w-5" />
          : <MessageCircle className="h-6 w-6" />
        }
      </button>
    </>
  );
};
