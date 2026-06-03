import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const TYPE_LABELS: Record<string, string> = {
  villa: "فيلا",
  apartment: "شقة",
  land: "أرض",
  commercial: "عقار تجاري",
  compound: "مجمع سكني",
  floor: "دور",
};

const TYPE_LABELS_EN: Record<string, string> = {
  villa: "Villa",
  apartment: "Apartment",
  land: "Land",
  commercial: "Commercial",
  compound: "Compound",
  floor: "Floor",
};

async function callWithRetry<T>(
  fn: () => Promise<T>,
  validate: (v: T) => boolean,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    const result = await fn();
    if (validate(result)) return result;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 800));
  }
  return fn();
}

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/assistant/chat
// 24/7 Smart Concierge — stateless chat (history + context + lang passed in)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/chat", async (req, res) => {
  try {
    const { messages, context, lang = "ar" } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      lang?: "ar" | "en";
      context: {
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
        }[];
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const isAr = lang === "ar";

    const portfolioSummary = context
      ? isAr
        ? `محفظة المستخدم: ${context.totalProperties} عقار (${context.publishedCount} منشور)، ${context.totalViews} مشاهدة إجمالية، ${context.totalLeads} مستفسر. العقارات: ${context.properties
            .map(
              (p) =>
                `${TYPE_LABELS[p.type] ?? p.type} في ${p.city}${p.district ? " / " + p.district : ""} - ${p.price.toLocaleString("ar-SA")} ريال${p.area ? " - " + p.area + "م²" : ""}${p.bedrooms ? " - " + p.bedrooms + " غرف" : ""} (${p.status === "published" ? "منشور" : "جارٍ النشر"}, ${p.views} مشاهدة, ${p.leads} مستفسر)`
            )
            .join(" | ")}.`
        : `Portfolio: ${context.totalProperties} properties (${context.publishedCount} published), ${context.totalViews} total views, ${context.totalLeads} leads. Properties: ${context.properties
            .map(
              (p) =>
                `${TYPE_LABELS_EN[p.type] ?? p.type} in ${p.city}${p.district ? " / " + p.district : ""} - ${p.price.toLocaleString()} SAR${p.area ? " - " + p.area + "m²" : ""}${p.bedrooms ? " - " + p.bedrooms + " BR" : ""} (${p.status === "published" ? "published" : "publishing"}, ${p.views} views, ${p.leads} leads)`
            )
            .join(" | ")}.`
      : "";

    const systemPrompt = isAr
      ? `أنت "مساعد ركز الذكي" — وكيل عقاري رقمي متخصص في السوق السعودي، تعمل ضمن منصة "ركز" للنشر العقاري الفوري على عقار وبيوت ووصلت و Property Finder.

${portfolioSummary}

دورك:
• تحليل أداء العقارات وتقديم رؤى تسويقية مخصصة
• الإجابة عن أسئلة السوق العقاري السعودي (الأسعار، المواسم، المناطق)
• نصائح تحسين الإعلانات والتسعير عبر المنصات
• مساعدة في استراتيجية التفاوض مع المستفسرين

قواعد صارمة:
• يجب أن تكون جميع ردودك باللغة العربية الفصحى دائماً — حتى لو كتب المستخدم بالإنجليزية
• الردود مختصرة ومباشرة — أقل من 120 كلمة
• لا تتخيل معلومات خارج نطاق العقارات السعودية
• إذا سُئلت عن شيء خارج اختصاصك، أحل المستخدم لفريق ركز`
      : `You are "Rkz AI Assistant" — a digital real estate agent specializing in the Saudi market, operating within the "Rkz" platform for instant property publishing on Aqar, Bayut, Wasalt, and Property Finder.

${portfolioSummary}

Your role:
• Analyze property performance and provide tailored marketing insights
• Answer questions about the Saudi real estate market (prices, seasons, areas)
• Advise on listing optimization and cross-platform pricing strategy
• Help with negotiation strategies for leads

Strict rules:
• ALL responses MUST be in English — even if the user writes in Arabic
• Responses must be concise and direct — under 120 words
• Do not fabricate information outside Saudi real estate scope
• If asked about something outside your expertise, refer the user to the Rkz team`;

    const r = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10),
      ],
    });

    const reply = r.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      res.status(500).json({ error: "Empty AI response" });
      return;
    }

    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "rkz assistant/chat error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/assistant/qualify
// Lead Qualification Engine — scores + classifies payment method per lead,
// returns the localized qualification script and a team notification report
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/qualify", async (req, res) => {
  try {
    const { leads, property, lang = "ar" } = req.body as {
      leads: { id: string; name: string; phone: string; platform: string; message?: string }[];
      property: {
        type: string;
        city: string;
        district?: string;
        price: number;
        area?: number;
        bedrooms?: number;
      };
      lang?: "ar" | "en";
    };

    if (!leads || leads.length === 0) {
      res.status(400).json({ error: "leads array is required" });
      return;
    }

    const isAr = lang === "ar";

    // ── Build property description ──────────────────────────────────────────
    const propLabelAr = TYPE_LABELS[property.type] ?? property.type;
    const propLabelEn = TYPE_LABELS_EN[property.type] ?? property.type;

    const propDetailsAr = [
      `${propLabelAr} في ${property.city}${property.district ? " / " + property.district : ""}`,
      `السعر: ${property.price.toLocaleString("ar-SA")} ريال`,
      property.area ? `المساحة: ${property.area}م²` : null,
      property.bedrooms ? `${property.bedrooms} غرف` : null,
    ]
      .filter(Boolean)
      .join("، ");

    const propDetailsEn = [
      `${propLabelEn} in ${property.city}${property.district ? " / " + property.district : ""}`,
      `Price: ${property.price.toLocaleString()} SAR`,
      property.area ? `Area: ${property.area}m²` : null,
      property.bedrooms ? `${property.bedrooms} bedrooms` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const propDetails = isAr ? propDetailsAr : propDetailsEn;

    // ── Build localized qualification script (verbatim per client spec) ─────
    const propNameAr = `${propLabelAr} في ${property.city}${property.district ? " / " + property.district : ""}`;
    const propNameEn = `${propLabelEn} in ${property.city}${property.district ? " / " + property.district : ""}`;

    const qualificationScript = {
      ar: `أهلاً بك، يسعدني اهتمامك بعقار ${propNameAr}. لأتمكن من تزويدك بأفضل الخيارات المتاحة وخدمتك بشكل دقيق، هل تفضل المضي قدماً في عملية الشراء عبر التمويل البنكي، أم أنك تخطط للدفع النقدي (كاش)، أم أن لديك طرقاً أخرى تود التنسيق بشأنها؟`,
      en: `Welcome! I am glad to see your interest in ${propNameEn}. To provide you with the best options and serve you accurately, could you please let me know your preferred purchase method: Bank Financing, Cash Payment, or other arrangements you would like to discuss?`,
    };

    // ── Build leads text for AI prompt ──────────────────────────────────────
    const leadsText = leads
      .map(
        (l, i) =>
          `${i + 1}. ID: "${l.id}" | Name: "${l.name}" | Phone: "${l.phone}" | Platform: "${l.platform}"${l.message ? ` | Message: "${l.message}"` : " | Message: (none)"}`
      )
      .join("\n");

    // ── AI prompt: score + payment method classification ─────────────────────
    const summaryLang = isAr
      ? "جميع حقول summary وpaymentSummary يجب أن تكون باللغة العربية"
      : "All summary and paymentSummary fields must be in English";

    const prompt = `You are a professional real estate lead analyst for the Saudi Arabian market.

Property: ${propDetails}

Leads to analyze:
${leadsText}

For each lead, determine TWO things:

1. SCORE — How serious is this lead?
   - serious: valid Saudi 10-digit phone number (e.g. 05XXXXXXXX) + real full name + reputable platform + relevant or specific message
   - maybe: some indicators missing, generic greeting, or partial info
   - not_serious: incomplete/suspicious phone, fake-looking name, or random/spam message

2. PAYMENT METHOD — What purchase method does this lead prefer, based on their message?
   - bank_financing: mentions bank, mortgage, financing, تمويل, بنك, قرض, رهن
   - cash: mentions cash, كاش, نقد, دفع نقدي, حاضر
   - other: mentions installments, owner-financing, trade, or other alternative methods
   - unknown: message absent or gives no payment method clues

${summaryLang}

Respond with valid JSON ONLY — no markdown, no extra text:
{"results":[{"leadId":"...","score":"serious","summary":"brief reason","paymentMethod":"bank_financing","paymentSummary":"brief note on payment intent"}]}`;

    const parsed = await callWithRetry(
      async () => {
        const r = await openai.chat.completions.create({
          model: "gpt-5.4",
          max_completion_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        });
        return extractJson(r.choices[0]?.message?.content ?? "{}");
      },
      (v) => Array.isArray(v.results) && (v.results as unknown[]).length > 0
    );

    const VALID_SCORES = ["serious", "maybe", "not_serious"];
    const VALID_PAYMENT = ["bank_financing", "cash", "other", "unknown"];

    const results = (
      (parsed.results as {
        leadId: string;
        score: string;
        summary: string;
        paymentMethod: string;
        paymentSummary: string;
      }[]) ?? []
    ).map((r) => ({
      leadId: String(r.leadId ?? ""),
      score: VALID_SCORES.includes(r.score) ? r.score : "maybe",
      summary: String(r.summary ?? ""),
      paymentMethod: VALID_PAYMENT.includes(r.paymentMethod) ? r.paymentMethod : "unknown",
      paymentSummary: String(r.paymentSummary ?? ""),
    }));

    // ── Build team notification text ─────────────────────────────────────────
    const bankCount = results.filter((r) => r.paymentMethod === "bank_financing").length;
    const cashCount = results.filter((r) => r.paymentMethod === "cash").length;
    const otherCount = results.filter((r) => r.paymentMethod === "other").length;
    const unknownCount = results.filter((r) => r.paymentMethod === "unknown").length;
    const seriousCount = results.filter((r) => r.score === "serious").length;
    const maybeCount = results.filter((r) => r.score === "maybe").length;

    const teamNotification = {
      ar: `📊 تقرير تأهيل المستفسرين — منصة ركز\n\n🏠 العقار: ${propDetailsAr}\n👥 إجمالي المستفسرين: ${results.length}\n✅ جادون: ${seriousCount}  ⚠️ محتملون: ${maybeCount}\n\n💰 طرق الشراء المُفضّلة:\n🏦 تمويل بنكي: ${bankCount}\n💵 نقد (كاش): ${cashCount}\n🔄 طرق أخرى: ${otherCount}\n❓ غير محدد: ${unknownCount}\n\n📌 رسالة التأهيل المُرسَلة:\n"${qualificationScript.ar}"\n\nتم التحليل بواسطة مساعد ركز الذكي ✨`,
      en: `📊 Lead Qualification Report — Rkz Platform\n\n🏠 Property: ${propDetailsEn}\n👥 Total Leads: ${results.length}\n✅ Serious: ${seriousCount}  ⚠️ Maybe: ${maybeCount}\n\n💰 Preferred Purchase Methods:\n🏦 Bank Financing: ${bankCount}\n💵 Cash Payment: ${cashCount}\n🔄 Other Methods: ${otherCount}\n❓ Not Specified: ${unknownCount}\n\n📌 Qualification Message Sent:\n"${qualificationScript.en}"\n\nAnalyzed by Rkz AI Assistant ✨`,
    };

    res.json({ results, qualificationScript, teamNotification });
  } catch (err) {
    req.log.error({ err }, "rkz assistant/qualify error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/assistant/classify-response
// Classify a lead's reply to the qualification question
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/classify-response", async (req, res) => {
  try {
    const { response, propertyName, lang = "ar" } = req.body as {
      response: string;
      propertyName: string;
      lang?: "ar" | "en";
    };

    if (!response) {
      res.status(400).json({ error: "response text is required" });
      return;
    }

    const isAr = lang === "ar";
    const summaryLang = isAr
      ? "أجب باللغة العربية"
      : "Respond in English";

    const prompt = `A potential buyer responded to a real estate qualification question about the property "${propertyName}".

Their response: "${response}"

Classify their preferred purchase method:
- bank_financing: mentions bank, mortgage, financing, تمويل, بنك, قرض
- cash: mentions cash, كاش, نقد, حاضر
- other: mentions installments, trade, or alternative methods
- unknown: unclear or off-topic

${summaryLang}

JSON ONLY:
{"method":"bank_financing","summary":"brief explanation","notificationText":"ready-to-share team message"}`;

    const parsed = await callWithRetry(
      async () => {
        const r = await openai.chat.completions.create({
          model: "gpt-5.4",
          max_completion_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        });
        return extractJson(r.choices[0]?.message?.content ?? "{}");
      },
      (v) => typeof v.method === "string"
    );

    const VALID = ["bank_financing", "cash", "other", "unknown"];
    const method = VALID.includes(String(parsed.method ?? "")) ? String(parsed.method) : "unknown";

    res.json({
      method,
      summary: String(parsed.summary ?? ""),
      notificationText: String(parsed.notificationText ?? ""),
    });
  } catch (err) {
    req.log.error({ err }, "rkz assistant/classify-response error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/assistant/report
// Owner Dashboard Intelligence — portfolio performance report
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/report", async (req, res) => {
  try {
    const { properties, lang = "ar" } = req.body as {
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
      lang?: "ar" | "en";
    };

    if (!properties || properties.length === 0) {
      res.status(400).json({ error: "properties array is required" });
      return;
    }

    const isAr = lang === "ar";

    const portfolioText = properties
      .map(
        (p, i) =>
          isAr
            ? `${i + 1}. ${TYPE_LABELS[p.type] ?? p.type} - ${p.city}${p.district ? "/" + p.district : ""} - ${p.price.toLocaleString("ar-SA")} ريال${p.area ? " - " + p.area + "م²" : ""} - ${p.views} مشاهدة - ${p.leads} مستفسر - الحالة: ${p.status === "published" ? "منشور" : "جارٍ النشر"}`
            : `${i + 1}. ${TYPE_LABELS_EN[p.type] ?? p.type} - ${p.city}${p.district ? "/" + p.district : ""} - ${p.price.toLocaleString()} SAR${p.area ? " - " + p.area + "m²" : ""} - ${p.views} views - ${p.leads} leads - ${p.status === "published" ? "published" : "publishing"}`
      )
      .join("\n");

    const prompt = isAr
      ? `أنت محلل عقاري استراتيجي لمنصة ركز السعودية. قدّم تقريراً تحليلياً دقيقاً عن محفظة العقارات التالية:

${portfolioText}

قدّم التقرير بـ JSON فقط دون أي نص خارجه:
{
  "summary": "ملخص تحليلي بجملتين أو ثلاث باللغة العربية الفصحى",
  "insights": ["رؤية تشغيلية أو تسويقية1", "رؤية2", "رؤية3"],
  "actions": ["إجراء موصى به1 قابل للتنفيذ", "إجراء2"],
  "score": 82
}

حيث score مؤشر صحة المحفظة من 0 إلى 100 بناءً على: نسبة النشر، عدد المشاهدات، نسبة التحويل للمستفسرين، وتنوع المنصات.`
      : `You are a strategic real estate analyst for the Saudi Rkz platform. Provide a precise analytical report on the following property portfolio:

${portfolioText}

Respond with JSON ONLY, no extra text:
{
  "summary": "Two to three sentence analytical summary in professional English",
  "insights": ["Operational or marketing insight 1", "insight 2", "insight 3"],
  "actions": ["Actionable recommendation 1", "recommendation 2"],
  "score": 82
}

Score is a portfolio health indicator from 0-100 based on: publish rate, view count, lead conversion ratio, and platform diversity.`;

    const parsed = await callWithRetry(
      async () => {
        const r = await openai.chat.completions.create({
          model: "gpt-5.4",
          max_completion_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        });
        return extractJson(r.choices[0]?.message?.content ?? "{}");
      },
      (v) =>
        typeof v.summary === "string" &&
        Array.isArray(v.insights) &&
        typeof v.score === "number"
    );

    res.json({
      summary: String(parsed.summary ?? ""),
      insights: ((parsed.insights as string[]) ?? []).map(String),
      actions: ((parsed.actions as string[]) ?? []).map(String),
      score: Math.min(100, Math.max(0, Number(parsed.score ?? 70))),
    });
  } catch (err) {
    req.log.error({ err }, "rkz assistant/report error");
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
