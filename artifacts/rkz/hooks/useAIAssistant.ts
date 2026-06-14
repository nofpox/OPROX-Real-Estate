import AsyncStorage from "@react-native-async-storage/async-storage";
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

// ── Admin event logging ───────────────────────────────────────────────────────
export const ADMIN_EVENTS_KEY = "rozoz_admin_events";

export interface AdminEvent {
  id: string;
  type:
    | "valuation_request"
    | "partner_contact"
    | "security_alert"
    | "pending_search"
    | "property_section"
    | "tourism_section"
    | "map_open"
    | "map_close";
  description: string;
  timestamp: number;
}

export async function logAdminEvent(
  type: AdminEvent["type"],
  description: string
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_EVENTS_KEY);
    const events: AdminEvent[] = raw ? (JSON.parse(raw) as AdminEvent[]) : [];
    events.unshift({
      id: Date.now().toString(),
      type,
      description,
      timestamp: Date.now(),
    });
    if (events.length > 200) events.splice(200);
    await AsyncStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(events));
  } catch {}
}

// ── PII filter ────────────────────────────────────────────────────────────────
const PII_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /(\+?966|00966|0)5\d{7,8}/, label: "phone_number" },
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, label: "email" },
  { re: /https?:\/\/\S+/, label: "external_link" },
  { re: /www\.\S+\.\S+/, label: "external_link" },
];

function detectPii(text: string): string | null {
  for (const { re, label } of PII_PATTERNS) {
    if (re.test(text)) return label;
  }
  return null;
}

// ── Portfolio context type ────────────────────────────────────────────────────
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

// ── Core reply logic ──────────────────────────────────────────────────────────
function localReply(
  text: string,
  ctx: PortfolioContext,
  isAr: boolean
): { reply: string; quickReplies: QuickReply[] } {
  const lower = text.toLowerCase();
  const hasAr = (kw: string) => text.includes(kw);
  const hasEn = (kw: string) => lower.includes(kw);

  const totalValue = ctx.properties.reduce((s, p) => s + p.price, 0);
  const avgPrice = ctx.totalProperties > 0 ? Math.round(totalValue / ctx.totalProperties) : 0;
  const bestProp = ctx.properties.reduce(
    (best, p) => p.views > (best?.views ?? 0) ? p : best,
    ctx.properties[0]
  );

  const isViews   = hasAr("مشاهد") || hasAr("views") || hasEn("view") || hasEn("traffic");
  const isLeads   = hasAr("مستفسر") || hasAr("استفسار") || hasEn("lead") || hasEn("inquiry") || hasEn("contact");
  const isPrice   = hasAr("سعر") || hasAr("تسعير") || hasEn("price") || hasEn("pricing") || hasEn("value");
  const isPublish = hasAr("نشر") || hasAr("منصة") || hasEn("publish") || hasEn("platform") || hasEn("listing");
  const isPerf    = hasAr("أداء") || hasAr("تقرير") || hasEn("performance") || hasEn("report") || hasEn("analytic");
  const isMarket  = hasAr("سوق") || hasAr("الرياض") || hasEn("market") || hasEn("riyadh") || hasEn("saudi");
  const isTip     = hasAr("نصيح") || hasAr("توصي") || hasEn("tip") || hasEn("advice") || hasEn("recommend") || hasEn("suggest");
  const isGreet   = hasEn("hello") || hasEn("hi ") || hasEn("hey") || hasAr("مرحبا") || hasAr("السلام") || lower === "hi";
  const isValuation = hasAr("تقييم") || hasAr("خبير") || hasEn("valuation") || hasEn("expert") || hasEn("apprais");
  const isSearch  =
    hasAr("أبحث عن") || hasAr("أريد شراء") || hasAr("أريد إيجار") || hasAr("ابحث") ||
    hasAr("عقار للبيع") || hasAr("عقار للإيجار") || hasEn("looking for") ||
    hasEn("find a property") || hasEn("want to buy") || hasEn("looking to buy") ||
    hasEn("looking to rent") || hasEn("search for");

  // ── Expert Valuation ──────────────────────────────────────────────────────
  if (isValuation) {
    void logAdminEvent("valuation_request", `Expert valuation requested: "${text.slice(0, 80)}"`);
    return isAr
      ? {
          reply: `🏆 **طلب تقييم عقاري متخصص**\n\nتم تسجيل طلبك! سيتواصل معك أحد خبرائنا في أقرب وقت.\n\n📋 **ما يتضمنه التقييم:**\n• تقييم السوق المحلي للحي\n• مقارنة بالعقارات المماثلة\n• تقرير أسعار مفصل\n• توصيات للبيع أو الإيجار`,
          quickReplies: [{ label: "متابعة الطلب", value: "كيف أتابع طلب التقييم؟" }],
        }
      : {
          reply: `🏆 **Expert Valuation Request**\n\nYour request has been logged! One of our property experts will be in touch shortly.\n\n📋 **Your valuation includes:**\n• Local neighbourhood market analysis\n• Comparison with similar properties\n• Detailed current pricing report\n• Sell, buy, or rent recommendations`,
          quickReplies: [{ label: "Track my request", value: "How do I track my valuation request?" }],
        };
  }

  // ── Property search (buyer mode) ──────────────────────────────────────────
  if (isSearch) {
    const published = ctx.properties.filter((p) => p.status === "published");
    if (published.length === 0) {
      void logAdminEvent("pending_search", `Pending search (no matches): "${text.slice(0, 80)}"`);
      return isAr
        ? {
            reply: `🔍 **البحث عن عقار**\n\nشكراً لاهتمامك! لا توجد قوائم متاحة حالياً، لكن تم تسجيل طلبك كـ **"بحث معلّق"** وسيتواصل فريقنا معك.\n\nأخبرنا بمتطلباتك:\n• الموقع المطلوب\n• الميزانية المتاحة\n• نوع العقار`,
            quickReplies: [
              { label: "فيلا", value: "أبحث عن فيلا" },
              { label: "شقة", value: "أبحث عن شقة" },
              { label: "أرض", value: "أبحث عن أرض" },
            ],
          }
        : {
            reply: `🔍 **Property Search**\n\nThank you for your interest! No matching listings are available right now — your request has been logged as a **"Pending Search"** and our team will follow up.\n\nTell us your requirements:\n• Preferred location\n• Budget\n• Property type`,
            quickReplies: [
              { label: "Villa", value: "Looking for a villa" },
              { label: "Apartment", value: "Looking for an apartment" },
              { label: "Land", value: "Looking for land" },
            ],
          };
    }
    const top3 = published.slice(0, 3);
    const listAr = top3
      .map((p, i) => `${i + 1}. **${p.type} — ${p.city}** | ${p.price.toLocaleString("ar-SA")} ريال${p.area ? ` | ${p.area} م²` : ""}`)
      .join("\n");
    const listEn = top3
      .map((p, i) => `${i + 1}. **${p.type} — ${p.city}** | ${p.price.toLocaleString()} SAR${p.area ? ` | ${p.area} m²` : ""}`)
      .join("\n");
    return isAr
      ? {
          reply: `🔍 **نتائج البحث — أفضل 3 عقارات:**\n\n${listAr}\n\n💬 هل تريد تفاصيل أكثر عن أي منها؟`,
          quickReplies: [{ label: "تفاصيل العقار الأول", value: "أريد تفاصيل العقار الأول" }],
        }
      : {
          reply: `🔍 **Search Results — Top 3 Matches:**\n\n${listEn}\n\n💬 Would you like more details on any of these?`,
          quickReplies: [{ label: "Details on #1", value: "I want details on property #1" }],
        };
  }

  // ── Greeting ──────────────────────────────────────────────────────────────
  if (isGreet) {
    return isAr
      ? {
          reply: `مرحباً بك في Rozoz! 👋 كيف يمكنني مساعدتك في إيجاد عقارك المثالي اليوم؟\n\nلديك حالياً **${ctx.totalProperties}** عقارات بإجمالي **${ctx.totalViews.toLocaleString("ar-SA")}** مشاهدة.`,
          quickReplies: [
            { label: "أداء المحفظة", value: "كيف أداء محفظتي؟" },
            { label: "ابحث عن عقار", value: "أبحث عن عقار للشراء" },
          ],
        }
      : {
          reply: `Welcome to Rozoz! 👋 How can I help you find your ideal property today?\n\nYou currently have **${ctx.totalProperties}** properties with **${ctx.totalViews.toLocaleString()}** total views.`,
          quickReplies: [
            { label: "Portfolio performance", value: "How is my portfolio performing?" },
            { label: "Find a property", value: "Looking for a property to buy" },
          ],
        };
  }

  if (isViews) {
    const topType = bestProp ? bestProp.type : "";
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
          reply: `💰 **Pricing Analysis:**\n\nYour portfolio average: **${avgPrice.toLocaleString()} SAR**\n\n📈 Pricing tips:\n• Compare with similar listings in the same district\n• Riyadh land prices grow ~12% annually\n• Al-Malqa and Al-Narjis apartments are in highest demand`,
          quickReplies: [{ label: "Market analysis", value: "Tell me about the real estate market" }],
        };
  }

  if (isPublish) {
    const publishedRate = ctx.totalProperties > 0 ? Math.round((ctx.publishedCount / ctx.totalProperties) * 100) : 0;
    return isAr
      ? {
          reply: `🚀 **حالة النشر:**\n\n${ctx.publishedCount} من ${ctx.totalProperties} عقارات منشورة (${publishedRate}%)\n\n✅ أفضل المنصات:\n1. عقار — أعلى حجم مشاهدات\n2. بيوت — أفضل جودة مستفسرين\n3. بروبرتي فايندر — المستثمرون الأجانب`,
          quickReplies: [{ label: "أفضل أوقات النشر", value: "متى أفضل وقت للنشر؟" }],
        }
      : {
          reply: `🚀 **Publishing Status:**\n\n${ctx.publishedCount} of ${ctx.totalProperties} published (${publishedRate}%)\n\n✅ Most effective platforms:\n1. Aqar — highest view volume\n2. Bayut — best lead quality\n3. Property Finder — international investors`,
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
          reply: `📈 **Full Performance Report:**\n\nPortfolio score: **${score}/100**\n\n• Published: ${ctx.publishedCount}/${ctx.totalProperties}\n• Total views: ${ctx.totalViews.toLocaleString()}\n• Total leads: ${ctx.totalLeads}\n\n${score >= 70 ? "✅ Excellent performance!" : "💡 Performance can improve with better photos and descriptions."}`,
          quickReplies: [{ label: "Improvement tips", value: "How can I improve my portfolio?" }],
        };
  }

  if (isTip) {
    return isAr
      ? {
          reply: `💡 **أفضل 5 نصائح لبيع أسرع:**\n\n1. **الصور الاحترافية** — ترفع المشاهدات 60%\n2. **التسعير التنافسي** — ابحث عن أقرب 3 منافسين\n3. **العناوين الجذابة** — أضف المميزات الرئيسية\n4. **الاستجابة السريعة** — رد خلال ساعة من الاستفسار\n5. **تحديث دوري** — حدّث القائمة كل أسبوعين`,
          quickReplies: [{ label: "نصائح الصور", value: "نصائح للصور الاحترافية" }],
        }
      : {
          reply: `💡 **Top 5 Tips for Faster Sales:**\n\n1. **Professional photos** — boost views by 60%\n2. **Competitive pricing** — research 3 nearest competitors\n3. **Compelling titles** — highlight key features\n4. **Quick response** — reply within 1 hour of inquiry\n5. **Regular updates** — refresh listings every two weeks`,
          quickReplies: [{ label: "Photo tips", value: "Tips for professional property photos" }],
        };
  }

  return isAr
    ? {
        reply: `يسعدني مساعدتك! 😊\n\nيمكنني مساعدتك في:\n• البحث عن عقار مناسب\n• تحليل أداء محفظتك\n• نصائح التسعير والنشر\n• طلب تقييم عقاري متخصص\n\nعن ماذا تود أن نتحدث؟`,
        quickReplies: [
          { label: "ابحث عن عقار", value: "أبحث عن عقار للشراء" },
          { label: "أداء المحفظة", value: "كيف أداء محفظتي؟" },
          { label: "تقييم متخصص", value: "أريد تقييم عقاري متخصص" },
        ],
      }
    : {
        reply: `Happy to help! 😊\n\nI can assist you with:\n• Finding the right property\n• Analysing your portfolio performance\n• Pricing and publishing advice\n• Requesting an expert valuation\n\nWhat would you like to talk about?`,
        quickReplies: [
          { label: "Find a property", value: "Looking for a property to buy" },
          { label: "Portfolio performance", value: "How is my portfolio performing?" },
          { label: "Expert valuation", value: "I need an expert property valuation" },
        ],
      };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
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
      ? `مرحباً بك في Rozoz! ✨ كيف يمكنني مساعدتك في إيجاد عقارك المثالي اليوم؟\n\nمحفظتك تضم **${c.totalProperties}** عقارات، ${c.publishedCount} منها منشورة مع **${viewsStr}** مشاهدة و**${c.totalLeads}** مستفسر.\n\nاسألني عن البحث عن عقار، أداء محفظتك، التسعير، أو اطلب تقييماً متخصصاً.`
      : `Welcome to Rozoz! ✨ How can I help you find your ideal property today?\n\nYour portfolio has **${c.totalProperties}** properties, ${c.publishedCount} published with **${viewsStr}** views and **${c.totalLeads}** leads.\n\nAsk me about finding a property, your portfolio performance, pricing, or request an expert valuation.`;

    const quickReplies: QuickReply[] = isAr
      ? [
          { label: "ابحث عن عقار", value: "أبحث عن عقار للشراء" },
          { label: "أداء المحفظة", value: "كيف أداء محفظتي؟" },
          { label: "تقييم متخصص", value: "أريد تقييم عقاري متخصص" },
        ]
      : [
          { label: "Find a property", value: "Looking for a property to buy" },
          { label: "Portfolio performance", value: "How is my portfolio performing?" },
          { label: "Expert valuation", value: "I need an expert property valuation" },
        ];

    setMessages([{ id: "greeting", role: "assistant", content, ts: Date.now(), quickReplies }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // ── PII guard: block phone numbers, emails, external links ────────────
      const piiType = detectPii(trimmed);
      if (piiType) {
        void logAdminEvent(
          "security_alert",
          `PII filter triggered (${piiType}): message blocked at ${new Date().toISOString()}`
        );
        const userMsg: Message = {
          id: Date.now().toString(),
          role: "user",
          content: trimmed,
          ts: Date.now(),
        };
        const warning: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: isAr
            ? "⚠️ **تنبيه أمني:** لأسباب تتعلق بالخصوصية، لا يمكن مشاركة أرقام الهواتف أو عناوين البريد الإلكتروني أو الروابط الخارجية في هذه المحادثة. يرجى التواصل عبر القنوات الرسمية."
            : "⚠️ **Security Notice:** For privacy and safety, phone numbers, email addresses, and external links cannot be shared in this chat. Please use our official contact channels.",
          ts: Date.now() + 1,
          quickReplies: [],
        };
        setMessages((prev) => [...prev, userMsg, warning]);
        return;
      }

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
