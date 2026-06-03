import { useCallback, useEffect, useMemo, useState } from "react";

import { apiPost } from "@/constants/api";
import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface PortfolioContext {
  totalProperties: number;
  publishedCount: number;
  totalViews: number;
  totalLeads: number;
  properties: {
    type: string;
    city: string;
    district?: string;
    price: number;
    area?: number;
    bedrooms?: number;
    status: string;
    views: number;
    leads: number;
    publishedAt?: string;
  }[];
}

export function useAIAssistant() {
  const { properties } = useApp();
  const { isAr } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const context: PortfolioContext = useMemo(() => {
    const totalViews = properties.reduce(
      (a, p) => a + p.platforms.reduce((b, x) => b + (x.views ?? 0), 0),
      0
    );
    const totalLeads = properties.reduce((a, p) => a + p.leads.length, 0);
    const publishedCount = properties.filter((p) =>
      p.platforms.some((x) => x.status === "published")
    ).length;
    return {
      totalProperties: properties.length,
      publishedCount,
      totalViews,
      totalLeads,
      properties: properties.map((p) => ({
        type: p.type,
        city: p.location.city,
        district: p.location.district,
        price: p.price,
        area: p.area,
        bedrooms: p.bedrooms,
        status: p.platforms.some((x) => x.status === "published") ? "published" : "publishing",
        views: p.platforms.reduce((a, x) => a + (x.views ?? 0), 0),
        leads: p.leads.length,
        publishedAt: p.publishedAt,
      })),
    };
  }, [properties]);

  // Client-generated greeting — no API cost
  useEffect(() => {
    const c = context;
    const viewsStr = isAr
      ? c.totalViews.toLocaleString("ar-SA")
      : c.totalViews.toLocaleString();
    const content = isAr
      ? `مرحباً! أنا مساعد ركز الذكي ✨\n\nمحفظتك تضم **${c.totalProperties}** عقارات، ${c.publishedCount} منها منشورة مع **${viewsStr}** مشاهدة و**${c.totalLeads}** مستفسر.\n\nاسألني عن أداء عقاراتك، التسعير، استراتيجية النشر، أو أي شيء عن السوق السعودي.`
      : `Hello! I'm Rkz AI Assistant ✨\n\nYour portfolio has **${c.totalProperties}** properties, ${c.publishedCount} published with **${viewsStr}** views and **${c.totalLeads}** leads.\n\nAsk me about your property performance, pricing, publishing strategy, or anything about the Saudi market.`;

    setMessages([{ id: "greeting", role: "assistant", content, ts: Date.now() }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Capture history before optimistic update
      const historyForAPI = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ];

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        const { reply } = await apiPost<{ reply: string }>("/rkz/assistant/chat", {
          messages: historyForAPI,
          context,
          lang: isAr ? "ar" : "en",
        });
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: reply,
            ts: Date.now(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: isAr
              ? "حدث خطأ في الاتصال. يرجى المحاولة مجدداً."
              : "Connection error. Please try again.",
            ts: Date.now(),
          },
        ]);
      }
      setIsThinking(false);
    },
    [messages, context, isAr]
  );

  const clearMessages = useCallback(() => {
    setMessages((prev) => prev.slice(0, 1)); // Keep only greeting
  }, []);

  return { messages, isThinking, sendMessage, clearMessages, context };
}
