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
      ? `أنت Housin AI — سكرتير عقار سعودي من الرياض. شخصيتك ودودة وخفيف دم وتسولف وتحش مع الناس. 😎
ردودك بالعامية السعودية الخفيفة دائماً — مو رسمي، مو خشب.
استخدم: "يا غالي"، "ابشر"، "تدلل"، "والله ما قصّرت"، "زين قلت"، "هههه"، "الله يعطيك العافية"، وما شابهها.

اذا المستخدم جاء بـ سوالف أو نكت — سوالف معه وضحك، لكن ما تنسى شغلك.
اذا ذكر شيء يتعلق بعقار أو فندق أو نشر — ارجع للشغل فوراً وابدأ تسأله.

━━━ البداية ━━━
اول رسالة في المحادثة ابدأ بها: "يا هلا والله 👋 تبغى تسكن، تسافر، ولا عندك عقار تبي تنشره؟"

━━━ وضع 1: سكرتير عقاري (شراء / إيجار / سكن دايم) ━━━
اذا المستخدم يدور يشتري أو يستأجر أو يسكن:
اجمع هذه المعلومات تدريجياً (سؤال واحد كل مرة):
1. نوع العقار (شقة، فيلا، أرض، تجاري، مجمع)
2. الحي أو المنطقة
3. الميزانية
4. عدد الغرف (إن انطبق)
لما تجمع المعلومات الكافية، قل بالضبط: "تمام بدور لك الحين 🔍"

━━━ وضع 2: كونسيرج سياحي (فندق / إقامة / سياحة) ━━━
اذا ذكر: سياحة، فندق، أيام، إجازة، رحلة، عمرة، ليلة:
اجمع تدريجياً (سؤال واحد كل مرة):
1. عدد الأشخاص
2. الميزانية بالليلة (ريال)
3. عدد الليالي
4. خدمات مطلوبة (مسبح، فطور، موقف...)
5. المدينة
لما تجمع الكافي، قل بالضبط: "تمام جهزت لك اقتراحات إقامتك 🏨"

━━━ وضع 3: موظف استقبال — نشر عقار ━━━
اذا قال: "عندي عقار"، "ابي انشر"، "اعلن"، "ابي ابيع"، "ابي اؤجر" (من منظور صاحب العقار):
اجمع تدريجياً (سؤال واحد كل مرة):
1. نوع العقار
2. بيع أو إيجار؟
3. المدينة والحي
4. السعر المطلوب (ريال)
5. المساحة (م²)
6. عدد الغرف (إن انطبق)
لما تكمل، قل بالضبط: "تمام جهزت ملخص عقارك 🏠"

━━━ وضع 4: طلب تصميم ديكور / أثاث / داخلي ━━━
اذا ذكر: ديكور، تصميم، أثاث، غرفة نوم، صالة، مطبخ، ألوان، داخلي، فرش، ترتيب البيت، interior:
لا تساعده في التصميم أبداً من هنا.
رد بالضبط بهذا الأسلوب (عامية خفيفة):

"يا غالي، عندنا قسم الذكاء الاصطناعي للتصميم 🎨 — لكنه في تطبيق Housin فقط.

السبب؟ التصميم يحتاج تصوّر غرفتك بالكاميرا حتى يطلع الديكور صح وملائم لمساحتك الحقيقية — ما يقدر يشتغل بدون صورة! 📸

حمّل التطبيق وافتح قسم 'المصمم الذكي' وصوّر غرفتك — بتشوف النتيجة في ثواني 🔥"

━━━ قواعد ذهبية ━━━
- سؤال واحد فقط كل مرة
- اذا أعطاك المعلومات لحالها، لا تسأل الباقي — فعّل الخطوة التالية مباشرة
- ممنوع تكون رسمي أو "خشب" — خلك خفيف ظل يا غالي 😎
- اذا سألك أحد عن أي شيء خارج نطاق العقارات أو الإقامة أو نشر العقارات (مثل: طبخ، رياضة، سياسة، طب، برمجة، ترفيه)، رد بالضبط حرفياً: "عذراً، أنا متخصص في العقارات، كيف أقدر أساعدك؟"`
      : `You are Housin AI — a Saudi real estate secretary from Riyadh. Your vibe is warm, witty, and casual — like a friendly local who knows the market inside out.
Keep it light, crack jokes when appropriate, but always steer back to business when real estate comes up.

━━━ START ━━━
First message: "Welcome! 👋 Looking to find a home, plan a stay, or list your property?"

━━━ Mode 1: Real Estate (buy / rent / permanent housing) ━━━
Collect one question at a time:
1. Property type (apartment, villa, land, commercial, compound)
2. Neighborhood / area
3. Budget
4. Rooms (if applicable)
When ready, say exactly: "Great, searching for you now! 🔍"

━━━ Mode 2: Tourist / Hotel ━━━
If they mention hotel, stay, tourism, days, nights, vacation, Umrah:
Collect one question at a time:
1. Number of guests
2. Budget per night (SAR)
3. Duration (nights)
4. Services wanted (pool, breakfast, parking...)
5. City
When ready, say exactly: "Perfect, here are your stay options! 🏨"

━━━ Mode 3: List a Property (OwnerMode) ━━━
If they want to sell, rent out, or list their property:
Collect one question at a time:
1. Property type
2. For sale or rent?
3. City and neighborhood
4. Asking price (SAR)
5. Area (sqm)
6. Rooms (if applicable)
When ready, say exactly: "Great, your listing summary is ready! 🏠"

━━━ Mode 4: Décor / Interior Design request ━━━
If they mention: décor, interior design, furniture, bedroom, living room, kitchen, colors, flooring, arrangement, staging:
Do NOT help with design from here.
Reply with exactly this (friendly casual tone):

"Hey! 🎨 We have an AI Interior Designer — but it's only in the Housin mobile app.

Why? Because the AI needs your camera to photograph the actual room, so the design fits your real space perfectly — it can't work without a real photo! 📸

Download the app, open 'AI Designer', snap a photo of your room — and you'll see the result in seconds! 🔥"

━━━ Golden Rules ━━━
- One question at a time
- If they volunteer enough info, skip the rest and move forward
- Never be stiff or overly formal — keep it fun 😎
- If asked about anything outside real estate or accommodation or property listing (e.g. cooking, sports, politics, medicine, coding, entertainment), reply exactly: "Sorry, I specialize in real estate. How can I help you?"`;


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
  mode?: "real_estate" | "tourist";
  propertyType?: string;
  listingType?: string;
  district?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  // tourist-specific
  budgetPerNight?: number;
  persons?: number;
  nights?: number;
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
        content: `You are a JSON extractor for a Saudi real estate and hotel platform. Read this conversation and extract search parameters.
Return ONLY a valid JSON object with these optional fields (omit fields not mentioned):
{
  "mode": "tourist" or "real_estate",
  "propertyType": "villa|apartment|commercial|land|hotel|compound",
  "listingType": "sale|rent|operational",
  "district": "neighborhood name",
  "city": "city name in Arabic",
  "minPrice": number,
  "maxPrice": number,
  "bedrooms": number,
  "budgetPerNight": number,
  "persons": number,
  "nights": number
}
Set mode="tourist" if the conversation is about hotels, tourism, short stays, Umrah, vacation, days, or nights. Otherwise mode="real_estate".
ONLY return JSON. No markdown.`,
      },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  const raw = extraction.choices[0]?.message?.content?.trim() ?? "{}";
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

    const isTourist = params.mode === "tourist";
    let rows: typeof listingsTable.$inferSelect[] = [];

    if (isTourist) {
      // ── Tourist mode: search hotels / operational listings ─────────────────
      const conds: import("drizzle-orm").SQL[] = [
        eq(listingsTable.status, "active"),
        or(eq(listingsTable.listingType, "operational"), eq(listingsTable.propertyType, "hotel"))!,
      ];

      if (params.city)           conds.push(ilike(listingsTable.city, `%${params.city}%`));
      if (params.budgetPerNight) conds.push(lte(listingsTable.price, params.budgetPerNight.toString()));
      // if large group needs more bedrooms
      if (params.persons && params.persons > 4)
        conds.push(gte(listingsTable.bedrooms, Math.ceil(params.persons / 2)));

      rows = await db.select().from(listingsTable).where(and(...conds)).orderBy(desc(listingsTable.featured)).limit(3);

      // Relax budget if no results
      if (!rows.length) {
        const relaxed: import("drizzle-orm").SQL[] = [
          eq(listingsTable.status, "active"),
          or(eq(listingsTable.listingType, "operational"), eq(listingsTable.propertyType, "hotel"))!,
        ];
        if (params.city) relaxed.push(ilike(listingsTable.city, `%${params.city}%`));
        rows = await db.select().from(listingsTable).where(and(...relaxed)).orderBy(desc(listingsTable.featured)).limit(3);
      }

      // Final fallback: any hotel/operational
      if (!rows.length) {
        rows = await db.select().from(listingsTable)
          .where(and(eq(listingsTable.status, "active"), or(eq(listingsTable.listingType, "operational"), eq(listingsTable.propertyType, "hotel"))!))
          .orderBy(desc(listingsTable.featured)).limit(3);
      }
    } else {
      // ── Real-estate mode: buy / rent ───────────────────────────────────────
      const conds: import("drizzle-orm").SQL[] = [eq(listingsTable.status, "active")];

      if (params.propertyType) conds.push(eq(listingsTable.propertyType, params.propertyType));
      if (params.listingType)  conds.push(eq(listingsTable.listingType,  params.listingType));
      if (params.bedrooms)     conds.push(eq(listingsTable.bedrooms,     params.bedrooms));
      if (params.maxPrice)     conds.push(lte(listingsTable.price,       params.maxPrice.toString()));
      if (params.minPrice)     conds.push(gte(listingsTable.price,       params.minPrice.toString()));

      if (params.district || params.city) {
        const loc: import("drizzle-orm").SQL[] = [];
        if (params.district) loc.push(ilike(listingsTable.district, `%${params.district}%`));
        if (params.city)     loc.push(ilike(listingsTable.city, `%${params.city}%`));
        conds.push(or(...loc)!);
      }

      rows = await db.select().from(listingsTable).where(and(...conds)).orderBy(desc(listingsTable.featured)).limit(3);

      // Relax location
      if (!rows.length && (params.district || params.city)) {
        const relaxed = [eq(listingsTable.status, "active")];
        if (params.propertyType) relaxed.push(eq(listingsTable.propertyType, params.propertyType));
        if (params.listingType)  relaxed.push(eq(listingsTable.listingType,  params.listingType));
        rows = await db.select().from(listingsTable).where(and(...relaxed)).orderBy(desc(listingsTable.featured)).limit(3);
      }

      // Final fallback
      if (!rows.length) {
        rows = await db.select().from(listingsTable).where(eq(listingsTable.status, "active")).orderBy(desc(listingsTable.featured)).limit(3);
      }
    }

    res.json({ listings: rows.map(formatListingForAi), params, mode: isTourist ? "tourist" : "real_estate" });
  } catch (err) {
    req.log.error({ err }, "rkz search-listings error");
    res.status(500).json({ error: "Search failed" });
  }
});

// POST /rkz/extract-owner-data
// Public — extract structured listing data from owner conversation
router.post("/rkz/extract-owner-data", async (req, res) => {
  try {
    if (await isAiHalted(1)) { res.status(423).json({ error: "AI_HALTED" }); return; }

    const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
    if (!Array.isArray(messages)) { res.status(400).json({ error: "messages required" }); return; }

    const [aiClient, aiModel] = await Promise.all([resolveAiClient(1), resolveAiModel(1, "gpt-5.4")]);

    const extraction = await aiClient.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `You are a JSON extractor for a Saudi real estate platform. Read this conversation where a property owner described their listing. Extract the data and return ONLY valid JSON with these fields (omit fields not mentioned):
{
  "title": "short listing title in Arabic",
  "propertyType": "apartment|villa|land|commercial|compound",
  "listingType": "sale|rent",
  "city": "city name",
  "district": "neighborhood name",
  "price": number,
  "areaSqm": number,
  "bedrooms": number
}
ONLY return JSON. No markdown. No extra text.`,
        },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    const raw = extraction.choices[0]?.message?.content?.trim() ?? "{}";
    const clean = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    const data = parseJsonSafe<Record<string, unknown>>(clean, {});

    res.json({
      title:        String(data.title        ?? ""),
      propertyType: String(data.propertyType ?? "apartment"),
      listingType:  String(data.listingType  ?? "sale"),
      city:         String(data.city         ?? ""),
      district:     String(data.district     ?? ""),
      price:        Number(data.price        ?? 0) || null,
      areaSqm:      Number(data.areaSqm      ?? 0) || null,
      bedrooms:     Number(data.bedrooms     ?? 0) || null,
    });
  } catch (err) {
    req.log.error({ err }, "rkz extract-owner-data error");
    res.status(500).json({ error: "Extraction failed" });
  }
});

// POST /rkz/owner-submit
// Public — create a new listing from the owner chat flow
router.post("/rkz/owner-submit", async (req, res) => {
  try {
    const { title, propertyType, listingType, city, district, price, areaSqm, bedrooms } = req.body as {
      title?: string;
      propertyType?: string;
      listingType?: string;
      city?: string;
      district?: string;
      price?: number | null;
      areaSqm?: number | null;
      bedrooms?: number | null;
    };

    const effectiveTitle = title?.trim() || `${propertyType ?? "عقار"} للـ${listingType === "rent" ? "إيجار" : "بيع"} في ${city ?? "—"}`;

    const [inserted] = await db.insert(listingsTable).values({
      tenantId:     1,
      title:        effectiveTitle,
      propertyType: (propertyType ?? "apartment") as typeof listingsTable.$inferInsert["propertyType"],
      listingType:  (listingType  ?? "sale")      as typeof listingsTable.$inferInsert["listingType"],
      city:         city      ?? null,
      district:     district  ?? null,
      price:        price     ? price.toString()   : null,
      areaSqm:      areaSqm   ? areaSqm.toString() : null,
      bedrooms:     bedrooms  ?? null,
      currency:     "SAR",
      status:       "active",
    }).returning({ id: listingsTable.id });

    req.log.info({ listingId: inserted.id }, "rkz owner-submit: listing created");
    res.json({ success: true, id: inserted.id });
  } catch (err) {
    req.log.error({ err }, "rkz owner-submit error");
    res.status(500).json({ error: "Failed to create listing" });
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
