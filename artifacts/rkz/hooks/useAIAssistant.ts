import { useCallback, useEffect, useMemo, useState } from "react";

import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

export interface QuickReply {
  label: string;
  value: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  quickReplies?: QuickReply[];
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

function localReply(text: string, ctx: PortfolioContext, isAr: boolean): { reply: string; quickReplies: QuickReply[] } {
  const lower = text.toLowerCase();

  const hasAr = (kw: string) => text.includes(kw);
  const hasEn = (kw: string) => lower.includes(kw);

  const totalValue = ctx.properties.reduce((s, p) => s + p.price, 0);
  const avgPrice = ctx.totalProperties > 0 ? Math.round(totalValue / ctx.totalProperties) : 0;
  const bestProp = ctx.properties.reduce((best, p) => p.views > (best?.views ?? 0) ? p : best, ctx.properties[0]);

  const isViews = hasAr("مشاهد") || hasAr("views") || hasEn("view") || hasEn("traffic");
  const isLeads = hasAr("مستفسر") || hasAr("استفسار") || hasEn("lead") || hasEn("inquiry") || hasEn("contact");
  const isPrice = hasAr("سعر") || hasAr("تسعير") || hasEn("price") || hasEn("pricing") || hasEn("value");
  const isPublish = hasAr("نشر") || hasAr("منصة") || hasEn("publish") || hasEn("platform") || hasEn("listing");
  const isPerf = hasAr("أداء") || hasAr("تقرير") || hasEn("performance") || hasEn("report") || hasEn("analytic");
  const isMarket = hasAr("سوق") || hasAr("الرياض") || hasEn("market") || hasEn("riyadh") || hasEn("saudi");
  const isTip = hasAr("نصيح") || hasAr("توصي") || hasEn("tip") || hasEn("advice") || hasEn("recommend") || hasEn("suggest");
  const isGreet = hasEn("hello") || hasEn("hi ") || hasEn("hey") || hasAr("مرحبا") || hasAr("السلام") || lower === "hi";

  if (isGreet) {
    return isAr
      ? {
          reply: `مرحباً! 👋 أنا مساعدك الذكي لإدارة محفظتك العقارية.\n\nلديك حالياً **${ctx.totalProperties}** عقارات بإجمالي **${ctx.totalViews.toLocaleString("ar-SA")}** مشاهدة. كيف يمكنني مساعدتك؟`,
          quickReplies: [{ label: "أداء المحفظة", value: "كيف أداء محفظتي؟" }, { label: "نصائح النشر", value: "نصائح لتحسين النشر" }],
        }
      : {
          reply: `Hello! 👋 I'm your smart real estate portfolio assistant.\n\nYou currently have **${ctx.totalProperties}** properties with **${ctx.totalViews.toLocaleString()}** total views. How can I help?`,
          quickReplies: [{ label: "Portfolio performance", value: "How is my portfolio performing?" }, { label: "Publishing tips", value: "Give me publishing tips" }],
        };
  }

  if (isViews) {
    const topType = bestProp ? (isAr ? bestProp.type : bestProp.type) : "";
    return isAr
      ? {
          reply: `📊 **تقرير المشاهدات:**\n\nإجمالي المشاهدات: **${ctx.totalViews.toLocaleString("ar-SA")}**\nالعقار الأكثر مشاهدة: ${bestProp ? `${topType} في ${bestProp.city} (${bestProp.views.toLocaleString("ar-SA")} مشاهدة)` : "—"}\n\n💡 **نصيحة:** تحديث الصور والوصف يرفع المشاهدات بنسبة 40%.`,
          quickReplies: [{ label: "تحسين القوائم", value: "كيف أحسّن قوائمي؟" }],
        }
      : {
          reply: `📊 **Views Report:**\n\nTotal views: **${ctx.totalViews.toLocaleString()}**\nTop property: ${bestProp ? `${topType} in ${bestProp.city} (${bestProp.views.toLocaleString()} views)` : "—"}\n\n💡 **Tip:** Updating photos and description increases views by up to 40%.`,
          quickReplies: [{ label: "Improve listings", value: "How can I improve my listings?" }],
        };
  }

  if (isLeads) {
    return isAr
      ? {
          reply: `📞 **تقرير المستفسرين:**\n\nإجمالي الاستفسارات: **${ctx.totalLeads}**\nمتوسط لكل عقار: **${ctx.totalProperties > 0 ? (ctx.totalLeads / ctx.totalProperties).toFixed(1) : 0}**\n\n✅ استجب لكل استفسار خلال ساعتين لرفع معدل الإغلاق.`,
          quickReplies: [{ label: "تحسين معدل الإغلاق", value: "كيف أحسن معدل إغلاق الصفقات؟" }],
        }
      : {
          reply: `📞 **Leads Report:**\n\nTotal leads: **${ctx.totalLeads}**\nAverage per property: **${ctx.totalProperties > 0 ? (ctx.totalLeads / ctx.totalProperties).toFixed(1) : 0}**\n\n✅ Respond to every inquiry within 2 hours to maximize your closing rate.`,
          quickReplies: [{ label: "Improve closing rate", value: "How do I improve my closing rate?" }],
        };
  }

  if (isPrice) {
    return isAr
      ? {
          reply: `💰 **تحليل التسعير:**\n\nمتوسط سعر محفظتك: **${avgPrice.toLocaleString("ar-SA")} ريال**\n\n📈 نصائح التسعير:\n• قارن مع قوائم مماثلة في نفس الحي\n• أسعار الأراضي في الرياض ترتفع ~12% سنوياً\n• الشقق في الملقا والنرجس الأكثر طلباً`,
          quickReplies: [{ label: "تحليل السوق", value: "أخبرني عن سوق العقارات" }],
        }
      : {
          reply: `💰 **Pricing Analysis:**\n\nYour portfolio average price: **${avgPrice.toLocaleString()} SAR**\n\n📈 Pricing tips:\n• Compare with similar listings in the same district\n• Riyadh land prices grow ~12% annually\n• Al-Malqa and Al-Narjis apartments are in highest demand`,
          quickReplies: [{ label: "Market analysis", value: "Tell me about the real estate market" }],
        };
  }

  if (isPublish) {
    const publishedRate = ctx.totalProperties > 0 ? Math.round((ctx.publishedCount / ctx.totalProperties) * 100) : 0;
    return isAr
      ? {
          reply: `🚀 **حالة النشر:**\n\n${ctx.publishedCount} من ${ctx.totalProperties} عقارات منشورة (${publishedRate}%)\n\n✅ المنصات الأكثر فعالية:\n1. عقار — أعلى حجم مشاهدات\n2. بيوت — أفضل جودة مستفسرين\n3. بروبرتي فايندر — المستثمرون الأجانب`,
          quickReplies: [{ label: "أفضل أوقات النشر", value: "متى أفضل وقت للنشر؟" }],
        }
      : {
          reply: `🚀 **Publishing Status:**\n\n${ctx.publishedCount} of ${ctx.totalProperties} properties published (${publishedRate}%)\n\n✅ Most effective platforms:\n1. Aqar — highest view volume\n2. Bayut — best lead quality\n3. Property Finder — international investors`,
          quickReplies: [{ label: "Best time to publish", value: "When is the best time to publish?" }],
        };
  }

  if (isMarket) {
    return isAr
      ? {
          reply: `🏙️ **نبذة عن سوق الرياض:**\n\n• الطلب على الوحدات السكنية ارتفع 18% في 2024\n• أكثر الأحياء طلباً: النرجس، الملقا، حطين\n• متوسط سعر الفيلا في الرياض: 2.5-3.5 مليون ريال\n• أفضل مواسم البيع: أكتوبر–ديسمبر، مارس–مايو`,
          quickReplies: [{ label: "تسعير عقاراتي", value: "كيف أسعّر عقاراتي؟" }],
        }
      : {
          reply: `🏙️ **Riyadh Real Estate Market:**\n\n• Residential demand rose 18% in 2024\n• Most sought-after districts: Al-Narjis, Al-Malqa, Hittin\n• Average villa price in Riyadh: 2.5–3.5 million SAR\n• Best selling seasons: Oct–Dec, Mar–May`,
          quickReplies: [{ label: "Price my properties", value: "How should I price my properties?" }],
        };
  }

  if (isPerf) {
    const score = ctx.totalProperties === 0 ? 0
      : Math.min(100, Math.round(
          (ctx.publishedCount / ctx.totalProperties) * 40 +
          Math.min(40, ctx.totalViews / 10) +
          Math.min(20, ctx.totalLeads * 2)
        ));
    return isAr
      ? {
          reply: `📈 **تقرير الأداء الشامل:**\n\nنقاط المحفظة: **${score}/100**\n\n• عقارات منشورة: ${ctx.publishedCount}/${ctx.totalProperties}\n• إجمالي المشاهدات: ${ctx.totalViews.toLocaleString("ar-SA")}\n• إجمالي الاستفسارات: ${ctx.totalLeads}\n\n${score >= 70 ? "✅ أداء ممتاز! استمر على هذا المستوى." : "💡 يمكن تحسين الأداء بزيادة جودة الصور والأوصاف."}`,
          quickReplies: [{ label: "نصائح التحسين", value: "كيف أحسن أداء محفظتي؟" }],
        }
      : {
          reply: `📈 **Full Performance Report:**\n\nPortfolio score: **${score}/100**\n\n• Published properties: ${ctx.publishedCount}/${ctx.totalProperties}\n• Total views: ${ctx.totalViews.toLocaleString()}\n• Total leads: ${ctx.totalLeads}\n\n${score >= 70 ? "✅ Excellent performance! Keep it up." : "💡 Performance can improve with better photos and descriptions."}`,
          quickReplies: [{ label: "Improvement tips", value: "How can I improve my portfolio?" }],
        };
  }

  if (isTip) {
    return isAr
      ? {
          reply: `💡 **أفضل 5 نصائح لبيع أسرع:**\n\n1. **الصور الاحترافية** — ترفع المشاهدات 60%\n2. **التسعير التنافسي** — ابحث عن أقرب 3 منافسين\n3. **العناوين الجذابة** — أضف المميزات الرئيسية\n4. **الاستجابة السريعة** — رد خلال ساعة من الاستفسار\n5. **تحديث دوري** — حدّث القائمة كل أسبوعين`,
          quickReplies: [{ label: "تحليل منافسيني", value: "كيف أحلل المنافسين؟" }, { label: "نصائح الصور", value: "نصائح للصور الاحترافية" }],
        }
      : {
          reply: `💡 **Top 5 Tips for Faster Sales:**\n\n1. **Professional photos** — boost views by 60%\n2. **Competitive pricing** — research 3 nearest competitors\n3. **Compelling titles** — highlight key features\n4. **Quick response** — reply within 1 hour of inquiry\n5. **Regular updates** — refresh listings every two weeks`,
          quickReplies: [{ label: "Analyse competitors", value: "How do I analyse competitors?" }, { label: "Photo tips", value: "Tips for professional property photos" }],
        };
  }

  return isAr
    ? {
        reply: `يسعدني مساعدتك! 😊\n\nيمكنني تحليل أداء محفظتك، تقديم نصائح التسعير، شرح أفضل منصات النشر، أو مناقشة سوق العقارات السعودي.\n\nعن ماذا تود أن نتحدث؟`,
        quickReplies: [
          { label: "أداء المحفظة", value: "كيف أداء محفظتي؟" },
          { label: "نصائح البيع", value: "أعطني نصائح للبيع" },
          { label: "السوق العقاري", value: "أخبرني عن سوق العقارات" },
        ],
      }
    : {
        reply: `Happy to help! 😊\n\nI can analyse your portfolio performance, give pricing advice, explain the best publishing platforms, or discuss the Saudi real estate market.\n\nWhat would you like to talk about?`,
        quickReplies: [
          { label: "Portfolio performance", value: "How is my portfolio performing?" },
          { label: "Selling tips", value: "Give me selling tips" },
          { label: "Market overview", value: "Tell me about the real estate market" },
        ],
      };
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

  useEffect(() => {
    const c = context;
    const viewsStr = isAr
      ? c.totalViews.toLocaleString("ar-SA")
      : c.totalViews.toLocaleString();
    const content = isAr
      ? `مرحباً! أنا مساعد ركز الذكي ✨\n\nمحفظتك تضم **${c.totalProperties}** عقارات، ${c.publishedCount} منها منشورة مع **${viewsStr}** مشاهدة و**${c.totalLeads}** مستفسر.\n\nاسألني عن أداء عقاراتك، التسعير، استراتيجية النشر، أو أي شيء عن السوق السعودي.`
      : `Hello! I'm Rkz AI Assistant ✨\n\nYour portfolio has **${c.totalProperties}** properties, ${c.publishedCount} published with **${viewsStr}** views and **${c.totalLeads}** leads.\n\nAsk me about your property performance, pricing, publishing strategy, or anything about the Saudi market.`;

    const quickReplies: QuickReply[] = isAr
      ? [
          { label: "أداء المحفظة", value: "كيف أداء محفظتي؟" },
          { label: "نصائح البيع", value: "أعطني نصائح للبيع" },
          { label: "تحليل السوق", value: "أخبرني عن سوق العقارات" },
        ]
      : [
          { label: "Portfolio performance", value: "How is my portfolio performing?" },
          { label: "Selling tips", value: "Give me selling tips" },
          { label: "Market analysis", value: "Tell me about the real estate market" },
        ];

    setMessages([{ id: "greeting", role: "assistant", content, ts: Date.now(), quickReplies }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

      const { reply, quickReplies } = localReply(trimmed, context, isAr);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          ts: Date.now(),
          quickReplies,
        },
      ]);
      setIsThinking(false);
    },
    [context, isAr]
  );

  const clearMessages = useCallback(() => {
    setMessages((prev) => prev.slice(0, 1));
  }, []);

  const dismissQuickReplies = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, quickReplies: undefined } : m))
    );
  }, []);

  return { messages, isThinking, sendMessage, clearMessages, dismissQuickReplies, context };
}
