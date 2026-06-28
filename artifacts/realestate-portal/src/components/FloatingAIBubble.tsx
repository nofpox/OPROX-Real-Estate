import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Mic, Video } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const NAVY = '#0f2040';
const GOLD = '#c9a84c';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ backgroundColor: NAVY, opacity: 0.5, animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}

export function FloatingAIBubble() {
  const { isRtl } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const greeting: Message = {
    id: '0',
    role: 'assistant',
    content: isRtl
      ? 'هلا! أنا مساعدك العقاري الذكي 🤖\nتدلل واسألني عن أي شي — أسعار، مناطق، إيجار أو شراء 😎'
      : "Hello! I'm your HousIn AI assistant 🤖\nAsk me anything about real estate in Saudi Arabia!",
  };

  const [messages, setMessages] = useState<Message[]>([greeting]);

  // Tooltip: show once per browser session
  useEffect(() => {
    const seen = localStorage.getItem('housin_ai_bubble_seen');
    if (!seen) {
      const t1 = setTimeout(() => {
        setShowTooltip(true);
        requestAnimationFrame(() => setTooltipVisible(true));
        const t2 = setTimeout(() => {
          setTooltipVisible(false);
          setTimeout(() => {
            setShowTooltip(false);
            localStorage.setItem('housin_ai_bubble_seen', '1');
          }, 300);
        }, 4500);
        return () => clearTimeout(t2);
      }, 1500);
      return () => clearTimeout(t1);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 80);
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const history = updated
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));
      const reply = await callAiChat(history);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + 'r', role: 'assistant', content: reply },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + 'e',
          role: 'assistant',
          content: isRtl
            ? '⚠️ عذراً يا غالي، ما قدرت أتواصل مع الخادم. حاول مرة ثانية 🙏'
            : '⚠️ Sorry, could not reach the server. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function openChat() {
    setOpen(true);
    setShowTooltip(false);
    localStorage.setItem('housin_ai_bubble_seen', '1');
  }

  const userMessages = messages.filter(m => m.role === 'user' && m.id !== '0');
  const inputIsAr = isArabic(
    userMessages.map(m => m.content).join('') || (isRtl ? 'أ' : '')
  );

  const bubblePos = isRtl ? 'left-5' : 'right-5';
  const panelPos  = isRtl ? 'left-5' : 'right-5';

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <div className={`fixed bottom-6 ${bubblePos} z-50 flex flex-col items-end gap-2`}>
          {/* Tooltip */}
          {showTooltip && (
            <div
              className="relative mb-1"
              style={{
                opacity: tooltipVisible ? 1 : 0,
                transform: tooltipVisible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.28s, transform 0.28s',
              }}
            >
              <div
                className="px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold whitespace-nowrap"
                style={{ backgroundColor: NAVY, color: GOLD }}
              >
                الذكاء الاصطناعي: امر تدلل 😎
              </div>
              {/* Arrow */}
              <div
                className="absolute -bottom-1.5 right-5 w-3 h-3 rotate-45 rounded-sm"
                style={{ backgroundColor: NAVY }}
              />
            </div>
          )}

          <button
            onClick={openChat}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
            style={{
              backgroundColor: NAVY,
              border: `2.5px solid ${GOLD}`,
              boxShadow: `0 6px 24px rgba(15,32,64,0.45)`,
            }}
            aria-label="AI Chat"
          >
            <span className="text-2xl">🤖</span>
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 z-40 md:hidden bg-black/20"
            onClick={() => setOpen(false)}
          />

          <div
            className={`fixed bottom-5 ${panelPos} z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden`}
            style={{
              width: 'min(380px, calc(100vw - 2rem))',
              height: 'min(560px, calc(100dvh - 5rem))',
              border: `1.5px solid rgba(15,32,64,0.1)`,
              backgroundColor: '#f5f7fa',
            }}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ backgroundColor: NAVY }}
            >
              <span className="text-2xl">🤖</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">
                  {isRtl ? 'مساعد HousIn الذكي' : 'HousIn AI Assistant'}
                </p>
                <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {isRtl ? 'يكتشف لغتك تلقائياً · متاح دائماً' : 'Auto-detects your language · Always on'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(msg => {
                const user = msg.role === 'user';
                const ar = isArabic(msg.content);
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${user ? 'flex-row-reverse' : ''}`}
                  >
                    {!user && <span className="text-xl flex-shrink-0 mb-0.5">🤖</span>}
                    <div
                      className="max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                      style={{
                        backgroundColor: user ? NAVY : '#fff',
                        color: user ? '#fff' : NAVY,
                        borderBottomRightRadius: user ? 4 : undefined,
                        borderBottomLeftRadius: !user ? 4 : undefined,
                        textAlign: ar ? 'right' : 'left',
                        boxShadow: !user ? '0 1px 6px rgba(0,0,0,0.07)' : undefined,
                      }}
                    >
                      {msg.content}
                    </div>
                    {user && <span className="text-xl flex-shrink-0 mb-0.5">👤</span>}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-end gap-2">
                  <span className="text-xl flex-shrink-0 mb-0.5">🤖</span>
                  <div
                    className="rounded-2xl rounded-bl-sm"
                    style={{ backgroundColor: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div
              className="flex items-end gap-2 px-3 py-2.5 flex-shrink-0"
              style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(15,32,64,0.08)' }}
            >
              {/* Camera — disabled */}
              <button
                disabled
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 opacity-30 cursor-not-allowed"
                title={isRtl ? 'كاميرا (قريباً)' : 'Camera (coming soon)'}
              >
                <Video size={16} style={{ color: NAVY }} />
              </button>

              {/* Mic — placeholder */}
              <button
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 transition-colors hover:bg-slate-200"
                title={isRtl ? 'الإدخال الصوتي' : 'Voice input'}
              >
                <Mic size={16} style={{ color: NAVY }} />
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isRtl ? 'اكتب رسالتك...' : 'Type your message...'}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 min-h-[38px] max-h-28 bg-slate-50"
                style={{
                  borderColor: 'rgba(15,32,64,0.12)',
                  color: NAVY,
                  direction: inputIsAr ? 'rtl' : 'ltr',
                  textAlign: inputIsAr ? 'right' : 'left',
                  focusRingColor: GOLD,
                }}
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
                style={{ backgroundColor: GOLD }}
              >
                {loading
                  ? <Loader2 size={15} className="animate-spin text-white" />
                  : <Send size={15} className="text-white" />
                }
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
