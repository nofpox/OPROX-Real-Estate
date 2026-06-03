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
// 24/7 Smart Concierge — stateless chat (history + context passed in)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/chat", async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
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

    const portfolioSummary = context
      ? `محفظة المستخدم: ${context.totalProperties} عقار (${context.publishedCount} منشور)، ${context.totalViews} مشاهدة إجمالية، ${context.totalLeads} مستفسر. العقارات: ${context.properties
          .map(
            (p) =>
              `${TYPE_LABELS[p.type] ?? p.type} في ${p.city}${p.district ? " / " + p.district : ""} - ${p.price.toLocaleString("ar-SA")} ريال${p.area ? " - " + p.area + "م²" : ""}${p.bedrooms ? " - " + p.bedrooms + " غرف" : ""} (${p.status === "published" ? "منشور" : "جارٍ النشر"}, ${p.views} مشاهدة, ${p.leads} مستفسر)`
          )
          .join(" | ")}.`
      : "";

    const systemPrompt = `أنت "مساعد ركز الذكي" — وكيل عقاري رقمي متخصص في السوق السعودي، تعمل ضمن منصة "ركز" للنشر العقاري الفوري على عقار وبيوت ووصلت و Property Finder.

${portfolioSummary}

دورك:
• تحليل أداء العقارات وتقديم رؤى تسويقية مخصصة
• الإجابة عن أسئلة السوق العقاري السعودي (الأسعار، المواسم، المناطق)
• نصائح تحسين الإعلانات والتسعير عبر المنصات
• مساعدة في استراتيجية التفاوض مع المستفسرين

قواعد صارمة:
• أجب دائماً بنفس لغة رسالة المستخدم الأخيرة (عربي أو إنجليزي)
• الردود مختصرة ومباشرة — أقل من 120 كلمة
• لا تتخيل معلومات خارج نطاق العقارات السعودية
• إذا سُئلت عن شيء خارج اختصاصك، أحل المستخدم لفريق ركز`;

    const r = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10), // Keep last 10 turns to avoid token overflow
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
// Lead Qualification Engine — scores each lead as serious / maybe / not_serious
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/qualify", async (req, res) => {
  try {
    const { leads, property } = req.body as {
      leads: { id: string; name: string; phone: string; platform: string; message?: string }[];
      property: { type: string; city: string; price: number; area?: number; bedrooms?: number };
    };

    if (!leads || leads.length === 0) {
      res.status(400).json({ error: "leads array is required" });
      return;
    }

    const propLabel = TYPE_LABELS[property.type] ?? property.type;
    const propDetails = [
      `${propLabel} في ${property.city}`,
      `السعر: ${property.price.toLocaleString("ar-SA")} ريال`,
      property.area ? `المساحة: ${property.area}م²` : null,
      property.bedrooms ? `${property.bedrooms} غرف` : null,
    ]
      .filter(Boolean)
      .join("، ");

    const leadsText = leads
      .map(
        (l, i) =>
          `${i + 1}. ID: "${l.id}" | الاسم: "${l.name}" | الجوال: "${l.phone}" | المنصة: "${l.platform}"${l.message ? ` | الرسالة: "${l.message}"` : ""}`
      )
      .join("\n");

    const prompt = `أنت محلل متخصص في تقييم جدية المستفسرين العقاريين في السوق السعودي.
العقار: ${propDetails}

المستفسرون:
${leadsText}

قيّم جدية كل مستفسر بناءً على معايير السوق السعودي:
- جاد (serious): جوال سعودي كامل 10 أرقام + اسم عربي حقيقي + منصة موثوقة + رسالة ذات صلة
- محتمل (maybe): بعض المؤشرات ناقصة أو رسالة عامة
- غير جاد (not_serious): جوال ناقص أو مشبوه، اسم مزيف، أو رسالة عشوائية

أجب بـ JSON فقط دون أي نص إضافي:
{"results":[{"leadId":"...","score":"serious","summary":"سبب قصير بالعربية"}]}`;

    const parsed = await callWithRetry(
      async () => {
        const r = await openai.chat.completions.create({
          model: "gpt-5.4",
          max_completion_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        });
        return extractJson(r.choices[0]?.message?.content ?? "{}");
      },
      (v) => Array.isArray(v.results) && (v.results as unknown[]).length > 0
    );

    const results = (
      (parsed.results as { leadId: string; score: string; summary: string }[]) ?? []
    ).map((r) => ({
      leadId: String(r.leadId ?? ""),
      score: ["serious", "maybe", "not_serious"].includes(r.score) ? r.score : "maybe",
      summary: String(r.summary ?? ""),
    }));

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "rkz assistant/qualify error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/assistant/report
// Owner Dashboard Intelligence — portfolio performance report
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/assistant/report", async (req, res) => {
  try {
    const { properties } = req.body as {
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
    };

    if (!properties || properties.length === 0) {
      res.status(400).json({ error: "properties array is required" });
      return;
    }

    const portfolioText = properties
      .map(
        (p, i) =>
          `${i + 1}. ${TYPE_LABELS[p.type] ?? p.type} - ${p.city}${p.district ? "/" + p.district : ""} - ${p.price.toLocaleString("ar-SA")} ريال${p.area ? " - " + p.area + "م²" : ""} - ${p.views} مشاهدة - ${p.leads} مستفسر - الحالة: ${p.status === "published" ? "منشور" : "جارٍ النشر"}`
      )
      .join("\n");

    const prompt = `أنت محلل عقاري استراتيجي لمنصة ركز السعودية. قدّم تقريراً تحليلياً دقيقاً عن محفظة العقارات التالية:

${portfolioText}

قدّم التقرير بـ JSON فقط دون أي نص خارجه:
{
  "summary": "ملخص تحليلي بجملتين أو ثلاث باللغة العربية الفصحى",
  "insights": ["رؤية تشغيلية أو تسويقية1", "رؤية2", "رؤية3"],
  "actions": ["إجراء موصى به1 قابل للتنفيذ", "إجراء2"],
  "score": 82
}

حيث score مؤشر صحة المحفظة من 0 إلى 100 بناءً على: نسبة النشر، عدد المشاهدات، نسبة التحويل للمستفسرين، وتنوع المنصات.`;

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
