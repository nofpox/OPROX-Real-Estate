import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import {
  MessageCircle, X, Send, Bot,
  ArrowRight, ArrowLeft, RotateCcw,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ── Text helpers ────────────────────────────────────────────────────────────

  const T = useCallback((en: string, ar: string) => isRtl ? ar : en, [isRtl]);

  // ── Scroll to bottom on new messages ────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Proactive badge after 12 s if user hasn't opened ────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasOpened) setShowBadge(true);
    }, 12_000);
    return () => clearTimeout(t);
  }, [hasOpened]);

  // ── Re-init messages when language changes while open ───────────────────────

  useEffect(() => {
    if (open && messages.length > 0) {
      setMessages([]);
      setIsTyping(false);
      sendGreeting(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const goToPartnerForm = useCallback(() => {
    setOpen(false);
    navigate('/');
    setTimeout(() => {
      document.getElementById('partner-inquiry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [navigate]);

  const goToPortal = useCallback(() => {
    setOpen(false);
    navigate('/portal');
  }, [navigate]);

  const goToListings = useCallback(() => {
    setOpen(false);
    navigate('/listings');
  }, [navigate]);

  const goToContact = useCallback(() => {
    setOpen(false);
    navigate('/contact');
  }, [navigate]);

  // ── Message factory ─────────────────────────────────────────────────────────

  const pushMsg = useCallback((msg: Omit<Message, 'id'>, delay = 0) => {
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
    }, delay);
  }, []);

  const botTyping = useCallback((ms = 700) => {
    setIsTyping(true);
    return ms;
  }, []);

  // ── Conversation flows ──────────────────────────────────────────────────────

  const showMainMenu = useCallback((delay = 0) => {
    const d = botTyping(650) + delay;
    pushMsg({
      from: 'bot',
      text: T(
        "Hi! 👋 I'm here to help. What brings you here today?",
        'مرحباً! 👋 أنا هنا للمساعدة. ماذا تبحث عن اليوم؟'
      ),
      quickReplies: [
        { label: T('Looking to partner with Rakez', 'مهتم بالتعاون مع ركز'), action: showPartnerFlow },
        { label: T("I'm an existing client", 'أنا عميل حالي'), action: showInvestorFlow },
        { label: T('Browse properties', 'تصفح العقارات'), action: showPropertiesFlow },
      ],
    }, d + delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  const showPartnerFlow = useCallback(() => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'user', text: T('Looking to partner with Rakez', 'مهتم بالتعاون مع ركز') },
    ]);
    botTyping(750);
    pushMsg({
      from: 'bot',
      text: T(
        "Great choice! 🌟 Fill out our short partnership form — it only takes 30 seconds. Our team reviews every submission within 24 hours.",
        'اختيار رائع! 🌟 أكمل نموذج الشراكة القصير — لا يستغرق سوى 30 ثانية. يراجع فريقنا كل طلب خلال 24 ساعة.'
      ),
      quickReplies: [
        { label: T('Take me to the form ↓', 'اصطحبني إلى النموذج ↓'), action: goToPartnerForm },
        { label: T('Learn about our services', 'تعرف على خدماتنا'), action: showPropertiesFlow },
        { label: T('Contact our team', 'تواصل مع فريقنا'), action: showContactFlow },
      ],
    }, 750);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping, goToPartnerForm]);

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
        { label: T('Partner with us', 'التعاون معنا'), action: showPartnerFlow },
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
    if (intent === 'partner')     { showPartnerFlow();    return; }
    if (intent === 'investor')    { showInvestorFlow();   return; }
    if (intent === 'properties')  { showPropertiesFlow(); return; }
    if (intent === 'contact')     { showContactFlow();    return; }

    botTyping(700);
    pushMsg({
      from: 'bot',
      text: T(
        "I'm not sure I understood that. I can help you with:",
        'لم أفهم ذلك تماماً. يمكنني مساعدتك في:'
      ),
      quickReplies: [
        { label: T('Partnership inquiry', 'استفسار شراكة'), action: showPartnerFlow },
        { label: T('Investor Portal', 'بوابة المستثمر'), action: showInvestorFlow },
        { label: T('Browse properties', 'تصفح العقارات'), action: showPropertiesFlow },
        { label: T('Contact team', 'تواصل مع الفريق'), action: showContactFlow },
      ],
    }, 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl, pushMsg, botTyping]);

  // ── Greeting ────────────────────────────────────────────────────────────────

  const sendGreeting = useCallback((immediate = false) => {
    const delay = immediate ? 0 : 400;
    botTyping(600 + delay);
    showMainMenu(delay + 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMainMenu, botTyping]);

  // ── Open / close ────────────────────────────────────────────────────────────

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

  // ── Send free-text ──────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const text = inputVal.trim();
    if (!text) return;
    setInputVal('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, from: 'user', text }]);
    showUnknownFallback(text);
  }, [inputVal, showUnknownFallback]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Reset chat ──────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setMessages([]);
    setIsTyping(false);
    sendGreeting(false);
  }, [sendGreeting]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div
        className={`
          fixed bottom-24 end-4 md:end-6 z-50
          w-[calc(100vw-2rem)] max-w-sm md:max-w-[360px]
          flex flex-col
          bg-card rounded-2xl shadow-2xl border border-border/60
          transition-all duration-300 ease-out origin-bottom-right
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }
        `}
        style={{ maxHeight: 'min(500px, calc(100dvh - 8rem))' }}
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
              {isRtl ? 'ركز للحلول الذكية' : 'Rakez Smart Solutions'}
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-2 ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Bubble */}
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

              {/* Quick replies */}
              {msg.quickReplies && msg.quickReplies.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full max-w-[85%]">
                  {msg.quickReplies.map((qr, i) => (
                    <button
                      key={i}
                      onClick={qr.action}
                      className="
                        flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                        bg-background border border-border/80
                        hover:border-secondary/50 hover:bg-secondary/5 hover:text-secondary
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

        {/* Input */}
        <div className="shrink-0 border-t border-border/60 p-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRtl ? 'اكتب سؤالك هنا...' : 'Type your question…'}
            className="
              flex-1 h-9 px-3 rounded-xl text-sm
              bg-muted border-0
              focus:outline-none focus:ring-2 focus:ring-secondary/40
              placeholder:text-muted-foreground/50
            "
          />
          <button
            onClick={handleSend}
            disabled={!inputVal.trim()}
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
          fixed bottom-4 md:bottom-6 end-4 md:end-6 z-50
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
        {/* Proactive pulse ring */}
        {showBadge && !open && (
          <span className="absolute inset-0 rounded-full bg-secondary/40 animate-ping" />
        )}

        {/* Notification dot */}
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
