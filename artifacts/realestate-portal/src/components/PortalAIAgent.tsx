import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Trash2, Sparkles, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { usePortalAuth } from '@/lib/portal-auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isGreeting?: boolean;
  isError?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  agentType: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function buildGreeting(displayName: string | undefined, isRtl: boolean): string {
  const firstName = displayName?.split(' ')[0] || '';
  if (isRtl) {
    return `مرحباً${firstName ? ' ' + firstName : ''}، أنا ليلى 👋\nمساعدتك الذكية في بوابة المستثمرين.\n\nأنا هنا لمساعدتك في الاطلاع على أداء عقاراتك، التقارير المالية، ومعدلات الإشغال. كيف يمكنني مساعدتك اليوم؟`;
  }
  return `Hi${firstName ? ' ' + firstName : ''}! I'm Layla 👋\nYour AI assistant for the Investor Portal.\n\nI'm here to help with your property performance, financial reports, occupancy data, and any investment questions. What can I help you with today?`;
}

export function PortalAIAgent() {
  const { isRtl } = useLanguage();
  const { user } = usePortalAuth();

  const [open,             setOpen]             = useState(false);
  const [conversationId,   setConversationId]   = useState<number | null>(null);
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [input,            setInput]            = useState('');
  const [streaming,        setStreaming]        = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [greetingPending,  setGreetingPending]  = useState(false);
  const [greetingTyping,   setGreetingTyping]   = useState(false);
  const [retrying,         setRetrying]         = useState(false);

  const bottomRef        = useRef<HTMLDivElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasGreetedRef    = useRef(false);

  const swipeTouchStartY = useRef<number | null>(null);
  const swipeTouchStartX = useRef<number | null>(null);

  const displayName = ((user as unknown) as Record<string, string>)?.displayName
    || ((user as unknown) as Record<string, string>)?.username || '';
  const role = ((user as unknown) as Record<string, string>)?.role || 'portal_client';

  const buildContext = useCallback(() => ({
    name:     displayName,
    role,
    platform: 'investor-portal',
    page:     window.location.pathname,
  }), [displayName, role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, greetingTyping]);

  useEffect(() => {
    if (open && !hasGreetedRef.current && messages.length === 0) {
      setGreetingPending(true);
      greetingTimerRef.current = setTimeout(() => {
        setGreetingPending(false);
        setGreetingTyping(true);
        setTimeout(() => {
          setGreetingTyping(false);
          setMessages([{ role: 'assistant', content: buildGreeting(displayName, isRtl), isGreeting: true }]);
          hasGreetedRef.current = true;
        }, 900);
      }, 2000);
    }
    return () => { if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureConversation(): Promise<number> {
    if (conversationId) return conversationId;
    const res = await fetch('/realestate-api/openai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: 'Investor Portal Assistant', agentType: 'portal' }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    const conv: Conversation = await res.json();
    setConversationId(conv.id);
    return conv.id;
  }

  function handleOpen() { setOpen(true); }

  function handleClose() {
    setOpen(false);
    abortRef.current?.abort();
    if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    setGreetingPending(false);
    setGreetingTyping(false);
  }

  function handlePanelTouchStart(e: React.TouchEvent) {
    swipeTouchStartY.current = e.touches[0].clientY;
    swipeTouchStartX.current = e.touches[0].clientX;
  }

  function handlePanelTouchEnd(e: React.TouchEvent) {
    if (swipeTouchStartY.current === null || swipeTouchStartX.current === null) return;
    const deltaY = e.changedTouches[0].clientY - swipeTouchStartY.current;
    const deltaX = Math.abs(e.changedTouches[0].clientX - swipeTouchStartX.current);
    swipeTouchStartY.current = null;
    swipeTouchStartX.current = null;
    if (deltaY > 80 && deltaX < deltaY * 0.7) handleClose();
  }

  async function clearChat() {
    if (conversationId) {
      await fetch(`/realestate-api/openai/conversations/${conversationId}`, {
        method: 'DELETE', credentials: 'include',
      });
    }
    setConversationId(null);
    setMessages([]);
    setStreamingContent('');
    hasGreetedRef.current = false;
    setGreetingPending(false);
    setGreetingTyping(false);
    greetingTimerRef.current = setTimeout(() => {
      setGreetingPending(false);
      setGreetingTyping(true);
      setTimeout(() => {
        setGreetingTyping(false);
        setMessages([{ role: 'assistant', content: buildGreeting(displayName, isRtl), isGreeting: true }]);
        hasGreetedRef.current = true;
      }, 900);
    }, 2000);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setStreaming(true);
    setStreamingContent('');
    setRetrying(false);

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        const id = await ensureConversation();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        if (attempt > 0) {
          setRetrying(true);
          await sleep(RETRY_DELAY_MS * attempt);
          setRetrying(false);
          setStreamingContent('');
        }

        const res = await fetch(`/realestate-api/openai/conversations/${id}/messages`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal:  ctrl.signal,
          body:    JSON.stringify({ content: text, context: buildContext() }),
        });

        if (!res.ok || !res.body) throw new Error('Stream error');

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let assembled = '';
        let buf       = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.done) break;
              if (payload.error) throw new Error(payload.error);
              if (payload.content) {
                assembled += payload.content;
                setStreamingContent(assembled);
              }
            } catch (parseErr) {
              if ((parseErr as Error).message !== 'Unexpected end of JSON input') throw parseErr;
            }
          }
        }

        setMessages(prev => [...prev, { role: 'assistant', content: assembled || '…' }]);
        break;

      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') break;
        if (attempt < MAX_RETRIES) { attempt++; continue; }
        const errMsg = isRtl
          ? '⚠️ تعذّر الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة مجدداً.'
          : '⚠️ Could not reach the AI service. Please try again.';
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true }]);
        break;
      }
    }

    setStreaming(false);
    setStreamingContent('');
    setRetrying(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const showTypingIndicator = greetingPending || greetingTyping || (streaming && !streamingContent && !retrying);

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 z-50 flex items-center justify-center',
          'w-14 h-14 rounded-full shadow-xl',
          'bg-secondary hover:bg-secondary/90 text-secondary-foreground',
          'transition-all hover:scale-105 active:scale-95',
          open && 'opacity-0 pointer-events-none',
          isRtl ? 'left-6' : 'right-6'
        )}
        aria-label={isRtl ? 'افتح المساعدة الذكية' : 'Open AI Assistant'}
      >
        <Sparkles size={24} />
      </button>

      {/* Click-outside backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            'fixed bottom-6 z-50 flex flex-col',
            'w-[360px] max-w-[calc(100vw-2rem)] h-[520px]',
            'bg-white rounded-2xl shadow-2xl border border-slate-200',
            isRtl ? 'left-6' : 'right-6'
          )}
          dir={isRtl ? 'rtl' : 'ltr'}
          onTouchStart={handlePanelTouchStart}
          onTouchEnd={handlePanelTouchEnd}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-2xl select-none">
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-8 h-1 bg-slate-200 rounded-full" />
            <div className="flex items-center gap-2.5 mt-1">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">ل</span>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {isRtl ? 'ليلى — المساعدة الذكية' : 'Layla — AI Assistant'}
                </p>
                <p className="text-xs text-primary/70 leading-tight">
                  {isRtl ? 'بوابة المستثمرين · متصلة' : 'Investor Portal · Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 mt-1">
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-500"
                onClick={clearChat}
                title={isRtl ? 'مسح المحادثة' : 'Clear chat'}
              >
                <Trash2 size={13} />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={handleClose}
                aria-label={isRtl ? 'إغلاق' : 'Close'}
              >
                <X size={15} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2 items-end',
                  msg.role === 'user'
                    ? (isRtl ? 'justify-start flex-row-reverse' : 'justify-end')
                    : (isRtl ? 'justify-end flex-row-reverse' : 'justify-start')
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 mb-0.5">
                    <span className="text-white font-bold text-[10px]">ل</span>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  )}
                >
                  {msg.content}
                  {msg.isError && (
                    <button
                      onClick={sendMessage}
                      className="flex items-center gap-1 mt-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      <RefreshCw size={10} />
                      {isRtl ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {retrying && (
              <div className={cn('flex gap-2 items-center text-xs text-primary/70', isRtl ? 'justify-end' : 'justify-start')}>
                <WifiOff size={12} className="animate-pulse" />
                {isRtl ? 'جارٍ إعادة الاتصال…' : 'Reconnecting…'}
              </div>
            )}

            {(showTypingIndicator || (streaming && streamingContent)) && (
              <div className={cn('flex gap-2 items-end', isRtl ? 'justify-end flex-row-reverse' : 'justify-start')}>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 mb-0.5">
                  <span className="text-white font-bold text-[10px]">ل</span>
                </div>
                <div className="max-w-[78%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm bg-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {streaming && streamingContent ? (
                    streamingContent
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 px-3 py-2.5 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isRtl ? 'اكتب رسالتك لليلى…' : 'Message Layla…'}
              disabled={streaming || greetingPending || greetingTyping}
              className={cn(
                'flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2',
                'text-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                'max-h-24 min-h-[38px] bg-slate-50',
                (streaming || greetingPending || greetingTyping) && 'opacity-50'
              )}
              style={{ direction: isRtl ? 'rtl' : 'ltr' }}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || streaming || greetingPending || greetingTyping}
              className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
            >
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
