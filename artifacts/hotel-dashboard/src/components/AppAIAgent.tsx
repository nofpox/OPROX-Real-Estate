import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Loader2, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { AuthUser } from "@/App";
import { useQuery } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  agentType: string;
}

interface AppAIAgentProps {
  authUser: AuthUser | null;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export function AppAIAgent({ authUser }: AppAIAgentProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch open task count for context
  const { data: stats } = useQuery<{ openTasks?: number; inProgressTasks?: number }>({
    queryKey: ["/api/stats/dashboard"],
    enabled: open,
    staleTime: 60_000,
  });

  const taskCount = (stats?.openTasks ?? 0) + (stats?.inProgressTasks ?? 0);

  const buildContext = useCallback(() => ({
    name: authUser?.displayName || authUser?.username || "User",
    role: authUser?.role || "staff",
    taskCount,
    page: window.location.pathname,
  }), [authUser, taskCount]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function ensureConversation(): Promise<number> {
    if (conversationId) return conversationId;
    const res = await apiFetch("/api/openai/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "App Assistant", agentType: "app" }),
    });
    const conv: Conversation = await res.json();
    setConversationId(conv.id);
    return conv.id;
  }

  async function loadHistory(id: number) {
    const res = await apiFetch(`/api/openai/conversations/${id}/messages`);
    const msgs: { role: string; content: string }[] = await res.json();
    setMessages(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
  }

  function handleOpen() {
    setOpen(true);
    if (!conversationId) {
      setMessages([]);
    }
  }

  function handleClose() {
    setOpen(false);
    abortRef.current?.abort();
  }

  async function clearChat() {
    if (conversationId) {
      await apiFetch(`/api/openai/conversations/${conversationId}`, { method: "DELETE" });
    }
    setConversationId(null);
    setMessages([]);
    setStreamingContent("");
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setStreamingContent("");

    try {
      const id = await ensureConversation();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch(`${BASE}/api/openai/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ctrl.signal,
        body: JSON.stringify({ content: text, context: buildContext() }),
      });

      if (!res.ok || !res.body) throw new Error("Stream error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assembled = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.done) break;
            if (payload.content) {
              assembled += payload.content;
              setStreamingContent(assembled);
            }
          } catch { /* ignore parse errors */ }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assembled || "…" }]);
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Could not reach the AI service. Please try again." }]);
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const greeting = authUser?.displayName
    ? `مرحباً ${authUser.displayName} 👋\nأنا مساعدك الذكي في المنظومة. كيف يمكنني مساعدتك اليوم؟`
    : "Hi! I'm your PMS assistant. How can I help you today?";

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-6 z-50 flex items-center justify-center",
          "w-14 h-14 rounded-full shadow-xl",
          "bg-amber-500 hover:bg-amber-600 text-white",
          "transition-all hover:scale-105 active:scale-95",
          isRtl ? "left-6" : "right-6"
        )}
        aria-label="Open AI Assistant"
      >
        <Sparkles size={24} />
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 z-50 flex flex-col",
            "w-[360px] max-w-[calc(100vw-2rem)] h-[520px]",
            "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200",
            isRtl ? "left-6" : "right-6"
          )}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">المساعد الذكي</p>
                <p className="text-xs text-amber-600">AI Assistant · Grand PMS</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-500"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 size={14} />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={handleClose}
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center mt-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={20} className="text-amber-500" />
                </div>
                <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">{greeting}</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? (isRtl ? "justify-start" : "justify-end") : (isRtl ? "justify-end" : "justify-start")
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-amber-500 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming bubble */}
            {streaming && (
              <div className={cn("flex", isRtl ? "justify-end" : "justify-start")}>
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm bg-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {streamingContent || (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Loader2 size={12} className="animate-spin" />
                      <span>يفكر…</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isRtl ? "اكتب رسالتك…" : "Type a message…"}
              disabled={streaming}
              className={cn(
                "flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2",
                "text-sm focus:outline-none focus:ring-2 focus:ring-amber-300",
                "max-h-24 min-h-[38px]",
                streaming && "opacity-50"
              )}
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="h-9 w-9 rounded-xl bg-amber-500 hover:bg-amber-600 flex-shrink-0"
            >
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
