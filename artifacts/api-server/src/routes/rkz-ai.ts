import { Router } from "express";
import multer from "multer";
import { toFile } from "openai";
import { eq, and, ilike, lte, gte, desc, or } from "drizzle-orm";
import { db, listingsTable } from "@workspace/db";
import { isAiHalted } from "./aiGovernance.js";
import { resolveAiClient, resolveAiModel } from "../lib/ai-provider.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

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
  return fn(); // final attempt — return regardless
}

function extractJson(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

// POST /rkz/suggest-price
// Public — called from the Rozoz Expo app (no PMS session)
router.post("/rkz/suggest-price", async (req, res) => {
  try {
    if (await isAiHalted(1)) {
      res.status(423).json({ error: "AI_HALTED", message: "AI services are currently halted by the system administrator." });
      return;
    }

    const { type, city, district, area, bedrooms } = req.body as {
      type: string;
      city: string;
      district?: string;
      area?: number;
      bedrooms?: number;
    };

    if (!type || !city) {
      res.status(400).json({ error: "type and city are required" });
      return;
    }

    const typeLabel = TYPE_LABELS[type] ?? type;
    const details = [
      area ? `مساحة ${area} م²` : null,
      bedrooms ? `${bedrooms} غرف` : null,
      district ? `حي ${district}` : null,
    ].filter(Boolean).join("، ");

    const prompt = `أنت خبير تقييم عقاري في السوق السعودي. اقترح نطاق سعر عادل لـ ${typeLabel} في ${city}${details ? `، ${details}` : ""}. استند إلى أسعار السوق الحالية في المملكة العربية السعودية 2024-2025. أجب بـ JSON فقط بهذا الشكل بدون أي نص إضافي: {"min":1000000,"max":2000000,"suggested":1500000,"note":"سبب قصير"}`;

    const [aiClient, aiModel] = await Promise.all([resolveAiClient(1), resolveAiModel(1, "gpt-5.4")]);
    const parsed = await callWithRetry(
      async () => {
        const r = await aiClient.chat.completions.create({
          model: aiModel,
          max_completion_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        });
        return extractJson(r.choices[0]?.message?.content ?? "{}");
      },
      (v) => Number(v.suggested) > 0,
    );

    res.json({
      min: Number(parsed.min ?? 0),
      max: Number(parsed.max ?? 0),
      suggested: Number(parsed.suggested ?? 0),
      note: String(parsed.note ?? ""),
    });
  } catch (err) {
    req.log.error({ err }, "rkz suggest-price error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// POST /rkz/generate-description
// Public — called from the Rozoz Expo app (no PMS session)
router.post("/rkz/generate-description", async (req, res) => {
  try {
    if (await isAiHalted(1)) {
      res.status(423).json({ error: "AI_HALTED", message: "AI services are currently halted by the system administrator." });
      return;
    }

    const { type, city, district, area, bedrooms, price } = req.body as {
      type: string;
      city: string;
      district?: string;
      area?: number;
      bedrooms?: number;
      price?: number;
    };

    if (!type || !city) {
      res.status(400).json({ error: "type and city are required" });
      return;
    }

    const typeLabel = TYPE_LABELS[type] ?? type;
    const details = [
      area ? `مساحة ${area} م²` : null,
      bedrooms ? `${bedrooms} غرف نوم` : null,
      district ? `حي ${district}` : null,
      price ? `السعر ${price.toLocaleString("ar-SA")} ريال` : null,
    ].filter(Boolean).join("، ");

    const prompt = `أنت كاتب إعلانات عقارية محترف في السوق السعودي. اكتب وصفاً تسويقياً جذاباً باللغة العربية الفصحى لـ ${typeLabel} في ${city}${details ? `، ${details}` : ""}. الوصف يجب أن لا يتجاوز 80 كلمة، يبرز المزايا الرئيسية، ويثير اهتمام المشتري، وينتهي بنداء للتصرف مختصر. أجب بـ JSON فقط: {"description":"النص هنا"}`;

    const [aiClient, aiModel] = await Promise.all([resolveAiClient(1), resolveAiModel(1, "gpt-5.4")]);
    const parsed = await callWithRetry(
      async () => {
        const r = await aiClient.chat.completions.create({
          model: aiModel,
          max_completion_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        });
        return extractJson(r.choices[0]?.message?.content ?? "{}");
      },
      (v) => typeof v.description === "string" && (v.description as string).length > 10,
    );

    res.json({ description: String(parsed.description ?? "") });
  } catch (err) {
    req.log.error({ err }, "rkz generate-description error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// POST /rkz/ai-chat
// Public — bilingual real estate AI chat (auto-detects AR/EN)
router.post("/rkz/ai-chat", async (req, res) => {
  try {
    if (await isAiHalted(1)) {
      res.status(423).json({ error: "AI_HALTED" });
      return;
    }

    const { messages } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const isArabic = /[\u0600-\u06FF]/.test(lastUserMsg);

    const systemPrompt = isArabic
      ? `أنت سكرتير عقار ذكي اسمك "HousIn AI" تعمل لمنصة HousIn العقارية السعودية.

مهمتك: تجمع من المستخدم المعلومات التالية بمحادثة طبيعية ومتدرجة (لا تسأل كلها دفعة وحدة):
1. نوع العقار (شقة، فيلا، أرض، تجاري)
2. الحي أو المنطقة المطلوبة
3. الميزانية
4. عدد الغرف (إن انطبق)

بعد ما تجمع المعلومات الكافية، قل بالضبط: "تمام بدور لك الحين 🔍"

قواعد:
- رد باللهجة السعودية العامية الودودة دائماً
- استخدم: "يا غالي"، "ابشر"، "تدلل"، "الله يعطيك العافية"
- ابدأ بسؤال واحد فقط كل مرة
- إذا المستخدم أعطاك معلومات كافية بدون ما تسأل، ما تحتاج تسأل الباقي — فقط قل "تمام بدور لك الحين 🔍"`
      : `You are "HousIn AI", a smart real estate secretary for HousIn — Saudi Arabia's premier property platform.

Your mission: Collect the following information through natural, progressive conversation (do NOT ask all at once):
1. Property type (apartment, villa, land, commercial)
2. Preferred neighborhood or area
3. Budget
4. Number of rooms (if applicable)

Once you have enough information, say exactly: "Great, searching for you now! 🔍"

Rules:
- Reply in formal, warm, and friendly English
- Ask one question at a time
- If the user volunteers enough details, skip remaining questions and proceed`;

    const [aiClient, aiModel] = await Promise.all([resolveAiClient(1), resolveAiModel(1, "gpt-5.4")]);

    const response = await aiClient.chat.completions.create({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10),
      ],
    });

    const reply = response.choices[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "rkz ai-chat error");
    res.status(500).json({ error: "AI request failed" });
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────
function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function formatListingForAi(l: typeof listingsTable.$inferSelect) {
  const media = parseJsonSafe<{ url: string; caption?: string }[]>(l.media, []);
  return {
    id:           l.id,
    title:        l.title,
    propertyType: l.propertyType,
    listingType:  l.listingType,
    price:        l.price   ? Number(l.price) : null,
    currency:     l.currency,
    areaSqm:      l.areaSqm ? Number(l.areaSqm) : null,
    bedrooms:     l.bedrooms,
    bathrooms:    l.bathrooms,
    district:     l.district,
    city:         l.city,
    address:      l.address,
    image:        media[0]?.url ?? null,
    featured:     l.featured,
  };
}

interface SearchParams {
  propertyType?: string;
  listingType?: string;
  district?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
}

async function extractSearchParams(
  messages: Array<{ role: string; content: string }>,
  aiClient: import("openai").default,
  model: string,
): Promise<SearchParams> {
  const extraction = await aiClient.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a JSON extractor. Read this real estate conversation and extract search parameters.
Return ONLY a valid JSON object with these optional fields (omit fields not clearly mentioned):
{
  "propertyType": "villa|apartment|commercial|land|hotel|compound",
  "listingType": "sale|rent",
  "district": "neighborhood/district name in Arabic or English",
  "city": "city name",
  "minPrice": number,
  "maxPrice": number,
  "bedrooms": number
}
ONLY return JSON. No explanation. No markdown.`,
      },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  const raw = extraction.choices[0]?.message?.content?.trim() ?? "{}";
  // strip potential ```json fences
  const clean = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
  return parseJsonSafe<SearchParams>(clean, {});
}

// POST /rkz/search-listings
// Public — extract params from conversation → query DB → return top 3 listings
router.post("/rkz/search-listings", async (req, res) => {
  try {
    if (await isAiHalted(1)) { res.status(423).json({ error: "AI_HALTED" }); return; }

    const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
    if (!Array.isArray(messages)) { res.status(400).json({ error: "messages required" }); return; }

    const [aiClient, aiModel] = await Promise.all([resolveAiClient(1), resolveAiModel(1, "gpt-5.4")]);

    // Extract structured params from conversation
    const params = await extractSearchParams(messages, aiClient, aiModel);
    req.log.info({ params }, "rkz search-listings params");

    // Build query conditions — active listings only
    const conds: import("drizzle-orm").SQL[] = [eq(listingsTable.status, "active")];

    if (params.propertyType) conds.push(eq(listingsTable.propertyType, params.propertyType));
    if (params.listingType)  conds.push(eq(listingsTable.listingType,  params.listingType));
    if (params.bedrooms)     conds.push(eq(listingsTable.bedrooms,     params.bedrooms));
    if (params.maxPrice)     conds.push(lte(listingsTable.price,       params.maxPrice.toString()));
    if (params.minPrice)     conds.push(gte(listingsTable.price,       params.minPrice.toString()));

    if (params.district || params.city) {
      const locationConds: import("drizzle-orm").SQL[] = [];
      if (params.district) locationConds.push(ilike(listingsTable.district, `%${params.district}%`));
      if (params.city)     locationConds.push(ilike(listingsTable.city, `%${params.city}%`));
      conds.push(or(...locationConds)!);
    }

    let rows = await db
      .select()
      .from(listingsTable)
      .where(and(...conds))
      .orderBy(desc(listingsTable.featured))
      .limit(3);

    // Fallback: relax location if no results
    if (!rows.length && (params.district || params.city)) {
      const relaxed = [eq(listingsTable.status, "active")];
      if (params.propertyType) relaxed.push(eq(listingsTable.propertyType, params.propertyType));
      if (params.listingType)  relaxed.push(eq(listingsTable.listingType,  params.listingType));
      rows = await db.select().from(listingsTable).where(and(...relaxed)).orderBy(desc(listingsTable.featured)).limit(3);
    }

    // Final fallback: any active featured listings
    if (!rows.length) {
      rows = await db.select().from(listingsTable).where(eq(listingsTable.status, "active")).orderBy(desc(listingsTable.featured)).limit(3);
    }

    res.json({ listings: rows.map(formatListingForAi), params });
  } catch (err) {
    req.log.error({ err }, "rkz search-listings error");
    res.status(500).json({ error: "Search failed" });
  }
});

// POST /rkz/transcribe
// Public — Whisper STT: accepts multipart audio, returns { text }
router.post("/rkz/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (await isAiHalted(1)) {
      res.status(423).json({ error: "AI_HALTED" });
      return;
    }

    const file = req.file;
    if (!file || !file.buffer?.length) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    const ext = file.mimetype.includes("mp4") ? "mp4"
      : file.mimetype.includes("wav")  ? "wav"
      : file.mimetype.includes("ogg")  ? "ogg"
      : file.mimetype.includes("mp3")  ? "mp3"
      : "webm";

    const aiClient = await resolveAiClient(1);
    const audioFile = await toFile(Buffer.from(file.buffer), `voice.${ext}`, { type: file.mimetype || "audio/webm" });

    const result = await aiClient.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });

    res.json({ text: result.text ?? "" });
  } catch (err) {
    req.log.error({ err }, "rkz transcribe error");
    res.status(500).json({ error: "Transcription failed" });
  }
});

export default router;
