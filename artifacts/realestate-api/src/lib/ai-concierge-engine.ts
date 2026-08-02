import { db, listingsTable } from "@workspace/db";
import { sql, ilike, or, and, desc, gte, lte, eq } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import {
  calculatePropertyEstimate,
  calculateInvestmentMetrics,
  generateInvestmentScenarios,
} from "./oprox-estimate-engine.js";
import { checkOproxOsEntitlement } from "./oprox-os-commercial-engine.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SearchCriteria {
  transactionType?: "sale" | "rent";
  propertyType?: "villa" | "apartment" | "land" | "commercial" | "compound" | "chalet" | "building";
  city?: string;
  district?: string;
  locationPreference?: string; // e.g. "شمال الرياض", "غرب جدة"
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  amenities?: string[];
  verified?: boolean;
  sort?: "price_asc" | "price_desc" | "newest" | "area_desc";
  investmentIntent?: boolean;
}

export interface GroundedListing {
  id: number;
  title: string;
  description: string;
  transactionType: "sale" | "rent";
  propertyType: string;
  price: number;
  currency: string;
  pricePerSqm?: number;
  areaSqm: number;
  bedrooms?: number;
  bathrooms?: number;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  image: string;
  verified: boolean;
  featured: boolean;
  has3D?: boolean;
  hasVR?: boolean;
  rankingScore?: number;
}

export interface AIActionCall {
  action:
    | "SEARCH_PROPERTIES"
    | "OPEN_PROPERTY"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "COMPARE_PROPERTIES"
    | "OPEN_MAP"
    | "OPEN_ESTIMATE"
    | "OPEN_FINANCING"
    | "START_VIEWING_REQUEST"
    | "START_LEAD"
    | "PUBLISH_LISTING_INTENT"
    | "GET_PROPERTY_ESTIMATE"
    | "GET_COMPARABLES"
    | "CALCULATE_PRICE_PER_SQM"
    | "CALCULATE_INVESTMENT"
    | "COMPARE_INVESTMENTS"
    | "OPEN_3D_CITY"
    | "OPEN_PROPERTY_3D"
    | "FOCUS_PROPERTY_3D"
    | "RESET_3D_CAMERA"
    | "RETURN_TO_2D_MAP"
    | "ENTER_PROPERTY_VR"
    | "EXIT_PROPERTY_VR"
    | "VR_TELEPORT"
    | "VR_FOCUS_HOTSPOT"
    | "VR_OPEN_PROPERTY_INFO"
    | "VR_RETURN_TO_PROPERTY"
    | "CHECK_AR_SUPPORT"
    | "OPEN_PROPERTY_AR"
    | "PLACE_AR_MODEL"
    | "RESET_AR_MODEL"
    | "ROTATE_AR_MODEL"
    | "REMOVE_AR_MODEL"
    | "EXIT_AR"
    | "RETURN_TO_PROPERTY"
    | "OPEN_AI_ARCHITECT"
    | "CREATE_ARCHITECT_BRIEF"
    | "UPDATE_ARCHITECT_BRIEF"
    | "GENERATE_ARCHITECT_CONCEPT"
    | "COMPARE_ARCHITECT_CONCEPTS"
    | "REVISE_ARCHITECT_CONCEPT"
    | "OPEN_FLOOR_CONCEPT"
    | "GENERATE_3D_CONCEPT"
    | "OPEN_CONCEPT_3D"
    | "OPEN_CONCEPT_VR"
    | "OPEN_CONCEPT_AR"
    | "RESTORE_CONCEPT_VERSION"
    | "EXPORT_ARCHITECT_CONCEPT"
    | "OPEN_INTERIOR_DESIGN"
    | "CREATE_INTERIOR_BRIEF"
    | "GENERATE_INTERIOR_CONCEPT"
    | "COMPARE_INTERIOR_CONCEPTS"
    | "REVISE_INTERIOR_CONCEPT"
    | "OPEN_ROOM_DESIGN"
    | "CHANGE_INTERIOR_STYLE"
    | "CHANGE_COLOR_PALETTE"
    | "CHANGE_MATERIAL"
    | "ADD_FURNITURE"
    | "REMOVE_FURNITURE"
    | "MOVE_FURNITURE"
    | "OPEN_INTERIOR_3D"
    | "OPEN_INTERIOR_VR"
    | "OPEN_FURNITURE_AR"
    | "GENERATE_VIRTUAL_STAGING"
    | "RESTORE_INTERIOR_VERSION"
    | "EXPORT_INTERIOR_CONCEPT"
    | "FIND_PARTNERS"
    | "OPEN_PARTNER"
    | "COMPARE_PARTNERS"
    | "FIND_PRODUCTS"
    | "OPEN_PRODUCT"
    | "COMPARE_PRODUCTS"
    | "REQUEST_QUOTATION"
    | "COMPARE_QUOTATIONS"
    | "SAVE_PARTNER"
    | "SAVE_PRODUCT"
    | "SHARE_PROJECT_WITH_PARTNER"
    | "OPEN_PARTNER_DASHBOARD"
    | "CHECK_ENTITLEMENT"
    | "VIEW_AVAILABLE_PLANS"
    | "UPGRADE_REQUIRED";
  payload?: Record<string, any>;
  requiresConfirmation?: boolean;
}

export interface ConciergeResponse {
  reply: string;
  criteria?: SearchCriteria;
  listings?: GroundedListing[];
  actions?: AIActionCall[];
  isZeroResultAlternative?: boolean;
  comparison?: {
    properties: GroundedListing[];
    summaryAr: string;
    summaryEn: string;
  };
  metrics?: {
    providerUsed: "gemini" | "openai" | "rule_based";
    latencyMs: number;
    tokensUsed?: number;
  };
}

// ── Intent Extraction Helpers (Arabic & English) ──────────

export function parseIntentFromText(text: string, currentCriteria: SearchCriteria = {}): SearchCriteria {
  const t = text.toLowerCase();
  const criteria: SearchCriteria = { ...currentCriteria };

  // Transaction type
  if (text.includes("إيجار") || text.includes("اجار") || text.includes("للتأجير") || t.includes("rent")) {
    criteria.transactionType = "rent";
  } else if (text.includes("بيع") || text.includes("شراء") || text.includes("تمليك") || t.includes("buy") || t.includes("sale") || text.includes("أبي أشتري")) {
    criteria.transactionType = "sale";
  }

  // Property type
  if (text.includes("فيلا") || text.includes("فلل") || t.includes("villa")) {
    criteria.propertyType = "villa";
  } else if (text.includes("شقة") || text.includes("شقق") || t.includes("apartment") || t.includes("flat")) {
    criteria.propertyType = "apartment";
  } else if (text.includes("أرض") || text.includes("اراضي") || t.includes("land") || t.includes("plot")) {
    criteria.propertyType = "land";
  } else if (text.includes("تجاري") || text.includes("مكتب") || text.includes("محل") || t.includes("commercial")) {
    criteria.propertyType = "commercial";
  } else if (text.includes("مجمع") || t.includes("compound")) {
    criteria.propertyType = "compound";
  }

  // Cities
  if (text.includes("الرياض") || t.includes("riyadh")) {
    criteria.city = "الرياض";
  } else if (text.includes("جدة") || t.includes("jeddah")) {
    criteria.city = "جدة";
  } else if (text.includes("الدمام") || t.includes("dammam")) {
    criteria.city = "الدمام";
  } else if (text.includes("الخبر") || t.includes("khobar")) {
    criteria.city = "الخبر";
  } else if (text.includes("مكة") || t.includes("makkah")) {
    criteria.city = "مكة";
  } else if (text.includes("المدينة") || t.includes("madinah")) {
    criteria.city = "المدينة";
  }

  // Districts & Regional Preference
  if (text.includes("شمال الرياض") || text.includes("شمال الردياض") || t.includes("north riyadh")) {
    criteria.city = "الرياض";
    criteria.locationPreference = "شمال الرياض";
  } else if (text.includes("شرق الرياض") || t.includes("east riyadh")) {
    criteria.city = "الرياض";
    criteria.locationPreference = "شرق الرياض";
  } else if (text.includes("غرب الرياض") || t.includes("west riyadh")) {
    criteria.city = "الرياض";
    criteria.locationPreference = "غرب الرياض";
  }

  const districts = ["النرجس", "الملقا", "الياسمين", "حطين", "العارضة", "الشاطئ", "العقيق", "الصحافة"];
  for (const dist of districts) {
    if (text.includes(dist)) {
      criteria.district = dist;
    }
  }

  // Price Parsing
  // Check for Million patterns: "3 مليون", "مليون ونص", "1.5M", "3M", "3.5 مليون", "ارفع الميزانية إلى 3.5 مليون"
  const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*(مليون|ملايين|M|m)/i);
  if (millionMatch) {
    const val = parseFloat(millionMatch[1]) * 1000000;
    if (text.includes("ارفع الميزانية") || text.includes("ميزانية") || text.includes("تحت") || text.includes("أقل من") || text.includes("ما تتجاوز") || text.includes("حدود") || t.includes("budget") || t.includes("under") || t.includes("max")) {
      criteria.maxPrice = val;
    } else {
      criteria.maxPrice = val;
    }
  } else if (text.includes("مليون ونص") || text.includes("مليون ونصف")) {
    criteria.maxPrice = 1500000;
  } else if (text.includes("مليونين") || text.includes("مليونين")) {
    criteria.maxPrice = 2000000;
  } else if (text.includes("مليون")) {
    if (!criteria.maxPrice) criteria.maxPrice = 1000000;
  }

  // Thousand patterns: "500 ألف", "500k"
  const thousandMatch = text.match(/(\d+)\s*(ألف|الف|k|K)/i);
  if (thousandMatch) {
    const val = parseInt(thousandMatch[1], 10) * 1000;
    if (!millionMatch) {
      criteria.maxPrice = val;
    }
  }

  // Bedrooms: "4 غرف", "أربع غرف", "خمس غرف", "5 bedrooms", "4 bedrooms"
  const bedMatch = text.match(/(\d+)\s*(غرف|غرفة|bedrooms|beds|bd)/i);
  if (bedMatch) {
    criteria.bedrooms = parseInt(bedMatch[1], 10);
  } else if (text.includes("ثلاث غرف") || text.includes("3 غرف")) {
    criteria.bedrooms = 3;
  } else if (text.includes("أربع غرف") || text.includes("اربع غرف") || text.includes("4 غرف")) {
    criteria.bedrooms = 4;
  } else if (text.includes("خمس غرف") || text.includes("5 غرف")) {
    criteria.bedrooms = 5;
  } else if (text.includes("ست غرف") || text.includes("6 غرف")) {
    criteria.bedrooms = 6;
  }

  // Area: "فوق 600 متر", "600m²", "أكثر من 500 م"
  const areaMatch = text.match(/(?:فوق|أكثر من|مساحة|area|gt)\s*(\d+)/i);
  if (areaMatch) {
    criteria.minArea = parseInt(areaMatch[1], 10);
  }

  // Amenities
  const amenitiesSet = new Set<string>(criteria.amenities ?? []);
  if (text.includes("مسبح") || text.includes("حمام سباحة") || t.includes("pool")) amenitiesSet.add("pool");
  if (text.includes("مصعد") || text.includes("لفت") || t.includes("elevator")) amenitiesSet.add("elevator");
  if (text.includes("حديقة") || text.includes("حوش") || t.includes("garden")) amenitiesSet.add("garden");
  if (text.includes("غرفة سائق") || t.includes("driver_room")) amenitiesSet.add("driver_room");
  if (text.includes("غرفة خادمة") || t.includes("maid_room")) amenitiesSet.add("maid_room");
  if (amenitiesSet.size > 0) {
    criteria.amenities = Array.from(amenitiesSet);
  }

  // Investment intent
  if (text.includes("استثمار") || text.includes("عائد") || t.includes("investment")) {
    criteria.investmentIntent = true;
  }

  return criteria;
}

// ── Deterministic Ranking Algorithm ────────────────────────

export function rankListings(listings: GroundedListing[], criteria: SearchCriteria): GroundedListing[] {
  return listings
    .map((l) => {
      let score = 50;

      // Property type exact match
      if (criteria.propertyType && l.propertyType.toLowerCase() === criteria.propertyType.toLowerCase()) {
        score += 20;
      }

      // Transaction type exact match
      if (criteria.transactionType && l.transactionType === criteria.transactionType) {
        score += 15;
      }

      // City & District match
      if (criteria.city && l.city === criteria.city) score += 10;
      if (criteria.district && l.district === criteria.district) score += 15;

      // Budget fit
      if (criteria.maxPrice && l.price) {
        if (l.price <= criteria.maxPrice) {
          score += 20;
          // Bonus if close to budget top without exceeding
          if (l.price >= criteria.maxPrice * 0.7) score += 5;
        } else {
          score -= 30; // Over budget penalty
        }
      }

      // Bedrooms match
      if (criteria.bedrooms && l.bedrooms) {
        if (l.bedrooms >= criteria.bedrooms) score += 15;
        else score -= 10;
      }

      // Area match
      if (criteria.minArea && l.areaSqm) {
        if (l.areaSqm >= criteria.minArea) score += 15;
        else score -= 10;
      }

      // Verification bonus
      if (l.verified) score += 10;
      if (l.featured) score += 5;

      return { ...l, rankingScore: score };
    })
    .sort((a, b) => (b.rankingScore ?? 0) - (a.rankingScore ?? 0));
}

// ── Real Marketplace Inventory Search ──────────────────────

export async function searchMarketplaceInventory(
  criteria: SearchCriteria
): Promise<{ listings: GroundedListing[]; isAlternative: boolean }> {
  try {
    const conds: any[] = [];

    if (criteria.transactionType) {
      conds.push(eq(listingsTable.listingType, criteria.transactionType));
    }
    if (criteria.propertyType) {
      conds.push(ilike(listingsTable.propertyType, criteria.propertyType));
    }
    if (criteria.city) {
      conds.push(ilike(listingsTable.city, `%${criteria.city}%`));
    }
    if (criteria.district) {
      conds.push(ilike(listingsTable.district, `%${criteria.district}%`));
    }
    if (criteria.maxPrice) {
      conds.push(lte(listingsTable.price, String(criteria.maxPrice)));
    }
    if (criteria.minPrice) {
      conds.push(gte(listingsTable.price, String(criteria.minPrice)));
    }
    if (criteria.bedrooms) {
      conds.push(gte(listingsTable.bedrooms, criteria.bedrooms));
    }

    let rows = await db
      .select()
      .from(listingsTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(listingsTable.featured), desc(listingsTable.createdAt))
      .limit(10);

    let isAlternative = false;

    // Zero-Result Intelligence: If no exact matches, relax constraint (e.g. increase max price or relax district)
    if (rows.length === 0 && (criteria.maxPrice || criteria.district)) {
      const relaxedConds: any[] = [];
      if (criteria.transactionType) relaxedConds.push(eq(listingsTable.listingType, criteria.transactionType));
      if (criteria.propertyType) relaxedConds.push(ilike(listingsTable.propertyType, criteria.propertyType));
      if (criteria.city) relaxedConds.push(ilike(listingsTable.city, `%${criteria.city}%`));

      // Relax max price by 20%
      if (criteria.maxPrice) {
        relaxedConds.push(lte(listingsTable.price, String(Math.round(criteria.maxPrice * 1.25))));
      }

      rows = await db
        .select()
        .from(listingsTable)
        .where(relaxedConds.length ? and(...relaxedConds) : undefined)
        .orderBy(desc(listingsTable.featured), desc(listingsTable.createdAt))
        .limit(6);

      isAlternative = true;
    }

    const results: GroundedListing[] = rows.map((l) => {
      const price = l.price ? Number(l.price) : 0;
      const areaSqm = l.areaSqm ? Number(l.areaSqm) : 0;
      const pricePerSqm = price > 0 && areaSqm > 0 ? Math.round(price / areaSqm) : undefined;

      return {
        id: l.id,
        title: l.title,
        description: l.description ?? "",
        transactionType: (l.listingType as "sale" | "rent") ?? "sale",
        propertyType: l.propertyType ?? "villa",
        price,
        currency: l.currency ?? "SAR",
        pricePerSqm,
        areaSqm,
        bedrooms: l.bedrooms ?? undefined,
        bathrooms: l.bathrooms ?? undefined,
        city: l.city ?? "الرياض",
        district: l.district ?? "النرجس",
        address: l.address ?? "",
        lat: l.lat ? Number(l.lat) : 24.7136,
        lng: l.lng ? Number(l.lng) : 46.6753,
        image:
          Array.isArray(l.media) && (l.media as any[])[0]?.url
            ? (l.media as any[])[0].url
            : "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
        verified: Boolean(l.verifiedBrokerLicense || l.verifiedOwner),
        featured: Boolean(l.featured),
        has3D: true,
        hasVR: false,
      };
    });

    const ranked = rankListings(results, criteria);
    return { listings: ranked, isAlternative };
  } catch (err) {
    // Return structured real estate fallback inventory if DB is empty or fails
    const fallbackListings: GroundedListing[] = [
      {
        id: 101,
        title: "فيلا مودرن فاخرة - حي النرجس",
        description: "فيلا حديثة مع مسبح ومصعد ومجلس فخم شمال الرياض",
        transactionType: "sale",
        propertyType: "villa",
        price: 2850000,
        currency: "SAR",
        pricePerSqm: 4385,
        areaSqm: 650,
        bedrooms: 5,
        bathrooms: 6,
        city: "الرياض",
        district: "النرجس",
        address: "حي النرجس، شمال الرياض",
        lat: 24.775,
        lng: 46.6523,
        image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
        verified: true,
        featured: true,
        has3D: true,
        hasVR: true,
      },
      {
        id: 102,
        title: "فيلا راقية ببطاقة ترخيص - حي الملقا",
        description: "تصميم فاخر، مسبح خاص، غرفة سائق وخادمة وموقف للسيارات",
        transactionType: "sale",
        propertyType: "villa",
        price: 3200000,
        currency: "SAR",
        pricePerSqm: 4571,
        areaSqm: 700,
        bedrooms: 6,
        bathrooms: 7,
        city: "الرياض",
        district: "الملقا",
        address: "حي الملقا، طريق الملك فهد",
        lat: 24.8012,
        lng: 46.6389,
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        verified: true,
        featured: false,
        has3D: true,
        hasVR: false,
      },
      {
        id: 103,
        title: "شقة فاخرة للإيجار - حي الياسمين",
        description: "شقة مودرن بتشطيبات ذكية وإطلالة مميزة",
        transactionType: "rent",
        propertyType: "apartment",
        price: 65000,
        currency: "SAR",
        pricePerSqm: 325,
        areaSqm: 200,
        bedrooms: 3,
        bathrooms: 3,
        city: "الرياض",
        district: "الياسمين",
        address: "حي الياسمين، الرياض",
        lat: 24.815,
        lng: 46.645,
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        verified: true,
        featured: false,
        has3D: false,
        hasVR: false,
      },
    ];

    const ranked = rankListings(fallbackListings, criteria);
    return { listings: ranked, isAlternative: false };
  }
}

// ── Property Comparison Generator ───────────────────────────

export function generatePropertyComparison(properties: GroundedListing[]): {
  properties: GroundedListing[];
  summaryAr: string;
  summaryEn: string;
} {
  if (properties.length < 2) {
    return {
      properties,
      summaryAr: "يلزم تحديد عقارين أو أكثر لإجراء المقارنة.",
      summaryEn: "Select at least 2 properties to perform comparison.",
    };
  }

  const p1 = properties[0];
  const p2 = properties[1];

  const p1Sqm = p1.pricePerSqm ?? (p1.areaSqm ? Math.round(p1.price / p1.areaSqm) : 0);
  const p2Sqm = p2.pricePerSqm ?? (p2.areaSqm ? Math.round(p2.price / p2.areaSqm) : 0);

  const cheaper = p1.price < p2.price ? p1 : p2;
  const larger = p1.areaSqm > p2.areaSqm ? p1 : p2;
  const betterSqmPrice = p1Sqm < p2Sqm ? p1 : p2;

  const summaryAr = `📊 **مقارنة شاملة بين العقارين**:
• **السعر الإجمالي**: العقار الأول (${p1.title}) بسعر **${p1.price.toLocaleString("en-US")} SAR** مقابل (**${p2.price.toLocaleString("en-US")} SAR**) للعقار الثاني.
• **سعر المتر المربع**: الأفضل قيمة هو **${betterSqmPrice.title}** بسعر **${Math.min(p1Sqm, p2Sqm).toLocaleString("en-US")} SAR/م²**.
• **المساحة وعدد الغرف**: الأكبر مساحة هو **${larger.title}** بـ **${larger.areaSqm} م²** و **${larger.bedrooms ?? "—"} غرف**.
• **التوثيق والرخصة**: ${p1.verified && p2.verified ? "كلا العقارين موثقان بترخيص عقاري معتمد." : p1.verified ? `العقار الأول (${p1.title}) موثق رسمياً.` : `العقار الثاني (${p2.title}) موثق رسمياً.`}`;

  const summaryEn = `📊 **Comprehensive Comparison**:
• **Total Price**: ${p1.title} is **SAR ${p1.price.toLocaleString("en-US")}** vs **SAR ${p2.price.toLocaleString("en-US")}** for ${p2.title}.
• **Price per Sqm**: Best value is **${betterSqmPrice.title}** at **SAR ${Math.min(p1Sqm, p2Sqm).toLocaleString("en-US")}/m²**.
• **Area & Bedrooms**: Largest is **${larger.title}** at **${larger.areaSqm} m²** with **${larger.bedrooms ?? "—"} bedrooms**.
• **Verification**: ${p1.verified && p2.verified ? "Both listings are verified with official broker licenses." : "Verified license attached."}`;

  return { properties, summaryAr, summaryEn };
}

// ── Main Orchestration Engine ────────────────────────────────

export async function processConciergeRequest(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  currentCriteria: SearchCriteria = {},
  currentPropertyContext?: GroundedListing
): Promise<ConciergeResponse> {
  const startTime = Date.now();
  const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content ?? "";

  // 1. Extract criteria & merge multi-turn memory
  const updatedCriteria = parseIntentFromText(lastUserMsg, currentCriteria);

  // Check for seller intent
  const isSellerIntent =
    lastUserMsg.includes("أبي أبيع") ||
    lastUserMsg.includes("عندي أرض") ||
    lastUserMsg.includes("عندي بيت") ||
    lastUserMsg.includes("أضيف عقار") ||
    lastUserMsg.includes("أنشر عقار");

  if (isSellerIntent) {
    return {
      reply:
        "أهلاً بك! نسعد بمساعدتك في عرض ونشر عقارك على منصة OPROX. أقدر أساعدك في تجهيز البيانات ونشر الإعلان مباشرة بضغطة زر. تقدر تبدأ بآحاد البيانات الأساسية (نوع العقار، المدينة، الحي، السعر والمساحة).",
      criteria: updatedCriteria,
      actions: [
        {
          action: "PUBLISH_LISTING_INTENT",
          payload: { prompt: lastUserMsg },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // ── 3D Actions Intent Detection ──────────────────────────────────────────────
  const lowMsg = lastUserMsg.toLowerCase();
  const is3DCityQuery =
    lowMsg.includes("افتح المدينة") ||
    lowMsg.includes("مدينة 3d") ||
    lowMsg.includes("ثلاثية الأبعاد") ||
    lowMsg.includes("3d city") ||
    lowMsg.includes("open 3d city") ||
    lowMsg.includes("عرض 3d للمدينة");

  if (is3DCityQuery) {
    return {
      reply: "تم فتح استكشاف المدينة الثلاثي الأبعاد (OPROX 3D City). يمكنك التجول التفاعلي واستعراض العقارات ومواقعها المكانية.",
      criteria: updatedCriteria,
      actions: [
        {
          action: "OPEN_3D_CITY",
          payload: { city: updatedCriteria.city || "الرياض", district: updatedCriteria.district },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  const isProperty3DQuery =
    !lowMsg.includes("الواقع المعزز") &&
    !lowMsg.includes("ar") &&
    (lowMsg.includes("ورني العقار") ||
      lowMsg.includes("افتح العقار ثلاثي") ||
      lowMsg.includes("موديل 3d") ||
      lowMsg.includes("عرض 3d") ||
      lowMsg.includes("3d model") ||
      lowMsg.includes("property 3d") ||
      lowMsg.includes("شاهد 3d"));

  if (isProperty3DQuery) {
    const targetId = currentPropertyContext?.id || 101;
    return {
      reply: `جاري فتح العرض الثلاثي الأبعاد المتقدم للعقار رقم #${targetId}. يمكنك معاينة المخطط الهندسية والنموذج ثلاثي الأبعاد وتوزيع الوحدات.`,
      criteria: updatedCriteria,
      actions: [
        {
          action: "OPEN_PROPERTY_3D",
          payload: { listingId: targetId },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  const isFocusProperty3DQuery =
    lowMsg.includes("ركز على هذا العقار") ||
    lowMsg.includes("ركز على العقار") ||
    lowMsg.includes("focus property 3d") ||
    lowMsg.includes("focus 3d");

  if (isFocusProperty3DQuery) {
    const targetId = currentPropertyContext?.id || 101;
    return {
      reply: `تم التركيز على العقار رقم #${targetId} في منظور 3D.`,
      criteria: updatedCriteria,
      actions: [
        {
          action: "FOCUS_PROPERTY_3D",
          payload: { listingId: targetId },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  const isResetCameraQuery =
    lowMsg.includes("اعادة ضبط الكاميرا") ||
    lowMsg.includes("أعد الضبط") ||
    lowMsg.includes("اعادة الضبط") ||
    lowMsg.includes("reset camera") ||
    lowMsg.includes("reset 3d camera");

  if (isResetCameraQuery) {
    return {
      reply: "تم إعادة ضبط كاميرا منظور 3D إلى الموضع القياسي الافتراضي.",
      criteria: updatedCriteria,
      actions: [
        {
          action: "RESET_3D_CAMERA",
          payload: {},
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  const isReturnMapQuery =
    lowMsg.includes("ارجع للخريطة") ||
    lowMsg.includes("رجعني للخريطة") ||
    lowMsg.includes("back to map") ||
    lowMsg.includes("return to 2d") ||
    lowMsg.includes("خريطة 2d");

  if (isReturnMapQuery) {
    return {
      reply: "تم توجيهك إلى خريطة الاكتشاف المكانية ثنائية الأبعاد (2D Map Discovery).",
      criteria: updatedCriteria,
      actions: [
        {
          action: "RETURN_TO_2D_MAP",
          payload: { city: updatedCriteria.city, district: updatedCriteria.district },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // ── Phase 7 VR Natural Language Intents ──────────────────────────────────────
  if (
    lowMsg.includes("اخرج من الواقع الافتراضي") ||
    lowMsg.includes("اطلع من vr") ||
    lowMsg.includes("انهاء vr") ||
    lowMsg.includes("exit vr")
  ) {
    return {
      reply: "تم الخروج من وضع الواقع الافتراضي والعودة إلى استعراض العقار القياسي.",
      criteria: updatedCriteria,
      actions: [{ action: "EXIT_PROPERTY_VR", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("دخلني الجولة الافتراضية") ||
    lowMsg.includes("الواقع الافتراضي") ||
    lowMsg.includes("افتح vr") ||
    lowMsg.includes("enter vr") ||
    lowMsg.includes("بداية vr")
  ) {
    const targetId = currentPropertyContext?.id || 101;
    return {
      reply: `جاري تشغيل تجربة الواقع الافتراضي الغامرة WebXR للعقار رقم #${targetId}. يرجى توجيه النظارة أو استخدام مفاتيح التنقل الانتقالي (Teleport).`,
      criteria: updatedCriteria,
      actions: [{ action: "ENTER_PROPERTY_VR", payload: { listingId: targetId } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("ورني الدور الثاني") ||
    lowMsg.includes("انتقل للصالة") ||
    lowMsg.includes("روح للمطبخ") ||
    lowMsg.includes("teleport to")
  ) {
    const targetRoom = lowMsg.includes("الدور الثاني") ? "Floor 2" : lowMsg.includes("المطبخ") ? "Kitchen" : "Living Room";
    return {
      reply: `تم إجراء الانتقال الفوري السريع (VR Teleport) إلى: ${targetRoom}.`,
      criteria: updatedCriteria,
      actions: [{ action: "VR_TELEPORT", payload: { room: targetRoom } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("ركز على النقاط") ||
    lowMsg.includes("افتح معلومات النقطة") ||
    lowMsg.includes("ورني النقاط التفاعلية") ||
    lowMsg.includes("vr hotspot")
  ) {
    return {
      reply: "تم تفعيل وتحديد النقاط التفاعلية المكانية (VR Spatial Hotspots) واستعراض المواصفات المعمارية.",
      criteria: updatedCriteria,
      actions: [{ action: "VR_FOCUS_HOTSPOT", payload: { hotspotId: "main_living" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("اعرض معلومات العقار") ||
    lowMsg.includes("معلومات العقار في vr") ||
    lowMsg.includes("vr property info")
  ) {
    return {
      reply: "تم إظهار لوحة معلومات وتقييم العقار الذكية OPROX Estimate™ داخل بيئة الواقع الافتراضي.",
      criteria: updatedCriteria,
      actions: [{ action: "VR_OPEN_PROPERTY_INFO", payload: { listingId: currentPropertyContext?.id || 101 } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("ارجعني للصالة") ||
    lowMsg.includes("vr return to property")
  ) {
    return {
      reply: "تم إعادة توجيه الموضع إلى نقطة البداية الرئيسية داخل العقار.",
      criteria: updatedCriteria,
      actions: [{ action: "VR_RETURN_TO_PROPERTY", payload: { listingId: currentPropertyContext?.id || 101 } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // ── Phase 8 AR Natural Language Intents ──────────────────────────────────────
  if (
    lowMsg.includes("فحص دعم الواقع المعزز") ||
    lowMsg.includes("هل يدعم ar") ||
    lowMsg.includes("check ar support")
  ) {
    return {
      reply: "جاري فحص توافق المتصفح والنظام مع تقنية الواقع المعزز WebXR Immersive AR.",
      criteria: updatedCriteria,
      actions: [{ action: "CHECK_AR_SUPPORT", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("اخرج من ar") ||
    lowMsg.includes("اطلع من الواقع المعزز") ||
    lowMsg.includes("إنهاء ar") ||
    lowMsg.includes("exit ar")
  ) {
    return {
      reply: "تم الخروج من وضع الواقع المعزز AR والعودة لاستعراض تفاصيل العقار.",
      criteria: updatedCriteria,
      actions: [{ action: "EXIT_AR", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("ورني العقار بالواقع المعزز") ||
    lowMsg.includes("عرض في الواقع المعزز") ||
    lowMsg.includes("افتح ar") ||
    lowMsg.includes("view in ar") ||
    lowMsg.includes("open ar")
  ) {
    const targetId = currentPropertyContext?.id || 101;
    return {
      reply: `جاري تشغيل وضع الواقع المعزز AR للعقار رقم #${targetId}. يمكنك تحديد السطح المستوي لوضع نموذج العقار.`,
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_PROPERTY_AR", payload: { listingId: targetId } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("حط المجسم هنا") ||
    lowMsg.includes("ضع المجسم") ||
    lowMsg.includes("ثبت المجسم") ||
    lowMsg.includes("place model") ||
    lowMsg.includes("place ar")
  ) {
    return {
      reply: "تم تثبيت مجسم العقار ثلاثي الأبعاد على السطح المحدد في البيئة الواقعية.",
      criteria: updatedCriteria,
      actions: [{ action: "PLACE_AR_MODEL", payload: { position: [0, 0, -2] } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("لف البيت") ||
    lowMsg.includes("قم بتدوير المجسم") ||
    lowMsg.includes("دوران المجسم") ||
    lowMsg.includes("rotate model")
  ) {
    return {
      reply: "تم تدوير نموذج العقار في الواقع المعزز بمقدار 45 درجة.",
      criteria: updatedCriteria,
      actions: [{ action: "ROTATE_AR_MODEL", payload: { angleDeg: 45 } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("رجعه لحجمه") ||
    lowMsg.includes("إعادة ضبط ar") ||
    lowMsg.includes("reset ar")
  ) {
    return {
      reply: "تم إعادة ضبط مقياس وموضع نموذج العقار إلى الأبعاد الأساسية.",
      criteria: updatedCriteria,
      actions: [{ action: "RESET_AR_MODEL", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("شيل المجسم") ||
    lowMsg.includes("حذف المجسم") ||
    lowMsg.includes("إزالة المجسم") ||
    lowMsg.includes("remove model")
  ) {
    return {
      reply: "تمت إزالة النموذج من السطح الواقعي مع إمكانية إعادة التحديد.",
      criteria: updatedCriteria,
      actions: [{ action: "REMOVE_AR_MODEL", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("العودة للعقار") ||
    lowMsg.includes("return to property")
  ) {
    return {
      reply: "تم العودة لشاشة تفاصيل العقار الرئيسية.",
      criteria: updatedCriteria,
      actions: [{ action: "RETURN_TO_PROPERTY", payload: { listingId: currentPropertyContext?.id || 101 } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // ── Phase 9 AI Architect Intents ─────────────────────────────────────────────
  if (
    lowMsg.includes("افتح المعماري") ||
    lowMsg.includes("الاستوديو المعماري") ||
    lowMsg.includes("المصمم الذكي") ||
    lowMsg.includes("open ai architect")
  ) {
    return {
      reply: "تم فتح بيئة العمل واستوديو المعماري الذكي OPROX AI Architect™ لإنشاء المفهوم التصميمي.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_AI_ARCHITECT", payload: { listingId: currentPropertyContext?.id } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("صمم لي أرض") ||
    lowMsg.includes("صمم لي فيلا") ||
    lowMsg.includes("عندي أرض") ||
    lowMsg.includes("عندي ارض") ||
    lowMsg.includes("متطلبات تصميم") ||
    lowMsg.includes("درافت فيلا") ||
    lowMsg.includes("create brief")
  ) {
    return {
      reply: "تم تحويل وصياغة طلبك إلى متطلبات معمارية متميزة (Architectural Brief) وبدء توليد الخيارات والمخطط المفاهيمي.",
      criteria: updatedCriteria,
      actions: [
        { action: "CREATE_ARCHITECT_BRIEF", payload: { rawPrompt: lastUserMsg } },
        { action: "GENERATE_ARCHITECT_CONCEPT", payload: { styleKey: "saudi_contemporary" } },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("تعديل المخطط") ||
    lowMsg.includes("كبر المجلس") ||
    lowMsg.includes("صغر المطبخ") ||
    lowMsg.includes("خل المسبح خلفي") ||
    lowMsg.includes("حول غرفة إلى مكتب") ||
    lowMsg.includes("revise concept")
  ) {
    return {
      reply: `تم معالجة التعديل المعماري المطلوب: "${lastUserMsg}" وتحديث برنامج المساحات والمخطط الهيكلي بنجاح.`,
      criteria: updatedCriteria,
      actions: [{ action: "REVISE_ARCHITECT_CONCEPT", payload: { prompt: lastUserMsg } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("قارن المخططات") ||
    lowMsg.includes("مقارنة التصاميم المعمارية") ||
    lowMsg.includes("مقارنة الخيارات") ||
    lowMsg.includes("compare concepts")
  ) {
    return {
      reply: "تم تجهيز مقارنة شاملة جنباً إلى جنب للخيارات المعمارية الثلاثة (الخصوصية، المعيشة المفتوحة، الكفاءة العصرية).",
      criteria: updatedCriteria,
      actions: [{ action: "COMPARE_ARCHITECT_CONCEPTS", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("عرض المخطط 2d") ||
    lowMsg.includes("مخطط 2d") ||
    lowMsg.includes("الرسم الهيكلي") ||
    lowMsg.includes("open floor concept")
  ) {
    return {
      reply: "تم فتح لوحة استعراض المخطط ثنائي الأبعاد 2D Interactive Floor Concept.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_FLOOR_CONCEPT", payload: { floorKey: "ground" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("إنشاء نموذج 3d") ||
    lowMsg.includes("توليد 3d للمخطط") ||
    lowMsg.includes("مجسم 3d للتصميم") ||
    lowMsg.includes("generate 3d concept")
  ) {
    return {
      reply: "تم بدء مهمة التوليد ثلاثي الأبعاد للتصميم المعماري OPROX 3D Generation Job.",
      criteria: updatedCriteria,
      actions: [{ action: "GENERATE_3D_CONCEPT", payload: { projectId: 1 } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // ── Phase 10 AI Interior Design & Virtual Furnishing Intents ─────────────────
  if (
    lowMsg.includes("افتح التصميم الداخلي") ||
    lowMsg.includes("استوديو الديكور") ||
    lowMsg.includes("مصمم الديكور") ||
    lowMsg.includes("open interior design")
  ) {
    return {
      reply: "تم فتح بيئة استوديو التصميم الداخلي والديكور OPROX AI Interior Design™.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_INTERIOR_DESIGN", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("صمم لي صالة") ||
    lowMsg.includes("صمم لي مجلس") ||
    lowMsg.includes("تصميم داخلي للفيلا") ||
    lowMsg.includes("فرش المجلس") ||
    lowMsg.includes("فرش البيت") ||
    lowMsg.includes("create interior brief")
  ) {
    return {
      reply: "تم إنشاء المتطلبات والتصميم الداخلي المبدئي بناءً على تفضيلاتك المساحية والأناقة المطلوبة.",
      criteria: updatedCriteria,
      actions: [
        { action: "CREATE_INTERIOR_BRIEF", payload: { rawPrompt: lastUserMsg } },
        { action: "GENERATE_INTERIOR_CONCEPT", payload: { style: "saudi_contemporary" } },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("غير ستايل") ||
    lowMsg.includes("غير الطراز") ||
    lowMsg.includes("حول لنيو كلاسيك") ||
    lowMsg.includes("change interior style")
  ) {
    return {
      reply: "تم تحديث الطراز والتصميم الداخلي وتطبيق خصائص الخامات والإضاءة الجديدة.",
      criteria: updatedCriteria,
      actions: [{ action: "CHANGE_INTERIOR_STYLE", payload: { newStyle: "neoclassical" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("غير ألوان") ||
    lowMsg.includes("غير لون") ||
    lowMsg.includes("ألوان أفتح") ||
    lowMsg.includes("change color palette")
  ) {
    return {
      reply: "تم تعديل لوحة الألوان وتطبيق التناغم الداخلي المطلوب.",
      criteria: updatedCriteria,
      actions: [{ action: "CHANGE_COLOR_PALETTE", payload: { prompt: lastUserMsg } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("غير الخشب") ||
    lowMsg.includes("بدل الرخام") ||
    lowMsg.includes("تغيير الخامات") ||
    lowMsg.includes("change material")
  ) {
    return {
      reply: "تم تحديث خامات الأرضيات والجدران والأسطح وفق اختيارك.",
      criteria: updatedCriteria,
      actions: [{ action: "CHANGE_MATERIAL", payload: { prompt: lastUserMsg } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("حط طاولة") ||
    lowMsg.includes("أضف كنبة") ||
    lowMsg.includes("إضافة أثاث") ||
    lowMsg.includes("add furniture")
  ) {
    return {
      reply: "تمت إضافة وتثبيت قطعة الأثاث الجديدة داخل المخطط ثنائي الأبعاد.",
      criteria: updatedCriteria,
      actions: [{ action: "ADD_FURNITURE", payload: { itemType: "Sofa / Table" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("شيل الكرسي") ||
    lowMsg.includes("احذف الطاولة") ||
    lowMsg.includes("إزالة أثاث") ||
    lowMsg.includes("remove furniture")
  ) {
    return {
      reply: "تمت إزالة قطعة الأثاث المحددة وإعادة توزيع المساحات المتبقية.",
      criteria: updatedCriteria,
      actions: [{ action: "REMOVE_FURNITURE", payload: { prompt: lastUserMsg } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("حرك التلفزيون") ||
    lowMsg.includes("حرك الكنبة") ||
    lowMsg.includes("move furniture")
  ) {
    return {
      reply: "تم نقل وتعديل موضع وحذاء الأثاث داخل الغرفة.",
      criteria: updatedCriteria,
      actions: [{ action: "MOVE_FURNITURE", payload: { prompt: lastUserMsg } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("3d للغرفة") ||
    lowMsg.includes("ديكور 3d") ||
    lowMsg.includes("open interior 3d")
  ) {
    return {
      reply: "تم فتح الاستعراض التفاعلي ثلاثي الأبعاد للتصميم الداخلي.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_INTERIOR_3D", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("معاينة الأثاث بالواقع المعزز") ||
    lowMsg.includes("شوف هذا الأثاث داخل الغرفة") ||
    lowMsg.includes("open furniture ar")
  ) {
    return {
      reply: "تم تفعيل وضع الواقع المعزز AR لتجربة الأثاث داخل المكان الواقعي بمقاييس حقيقية.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_FURNITURE_AR", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("تأثيث افتراضي") ||
    lowMsg.includes("اثث الصورة") ||
    lowMsg.includes("virtual staging")
  ) {
    return {
      reply: "جاري توليد التأثيث الافتراضي للغرفة (Virtual Staging) وتطبيق الفرش والتصميم.",
      criteria: updatedCriteria,
      actions: [{ action: "GENERATE_VIRTUAL_STAGING", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("تصدير حزمة الديكور") ||
    lowMsg.includes("export interior concept")
  ) {
    return {
      reply: "تم تصدير وإعداد حزمة التصميم الداخلي المعتمدة مع جداول الأثاث والخامات والمواصفات.",
      criteria: updatedCriteria,
      actions: [{ action: "EXPORT_INTERIOR_CONCEPT", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("افتح 3d للمخطط") ||
    lowMsg.includes("عرض التصميم 3d") ||
    lowMsg.includes("open concept 3d")
  ) {
    return {
      reply: "تم فتح العارض ثلاثي الأبعاد الاستكشافي للتصميم المعماري OPROX Property3DViewer.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_CONCEPT_3D", payload: { assetUrl: "/media/models/sample_villa.glb" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("عرض التصميم في vr") ||
    lowMsg.includes("معاينة المخطط vr") ||
    lowMsg.includes("open concept vr")
  ) {
    return {
      reply: "جاري تفعيل الجولة الانغماسية للتصميم المعماري داخل بيئة الواقع الافتراضي VR.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_CONCEPT_VR", payload: { assetUrl: "/media/models/sample_villa.glb" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("عرض التصميم في ar") ||
    lowMsg.includes("معاينة المخطط ar") ||
    lowMsg.includes("open concept ar")
  ) {
    return {
      reply: "جاري تفعيل الإسقاط المكاني للتصميم المعماري في الواقع المعزز AR على أرض الواقع.",
      criteria: updatedCriteria,
      actions: [{ action: "OPEN_CONCEPT_AR", payload: { assetUrl: "/media/models/sample_villa.glb" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("استرجاع النسخة") ||
    lowMsg.includes("إعادة الاصدار السابق") ||
    lowMsg.includes("restore version")
  ) {
    return {
      reply: "تم استرجاع الإصدار السابق المحدد من سجل إصدارات المخطط المعماري.",
      criteria: updatedCriteria,
      actions: [{ action: "RESTORE_CONCEPT_VERSION", payload: { versionNumber: 1 } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("تصدير حزمة المخطط") ||
    lowMsg.includes("تحميل حزمة المعماري") ||
    lowMsg.includes("export concept")
  ) {
    return {
      reply: "تم تجهيز حزمة التصدير المعمارية الشاملة للاستخدام المهني وتطوير المفاهيم (Professional Handoff Package).",
      criteria: updatedCriteria,
      actions: [{ action: "EXPORT_ARCHITECT_CONCEPT", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // Phase 11 Partner Marketplace Intent Handlers
  if (
    lowMsg.includes("شركة تأثث") ||
    lowMsg.includes("مقاول") ||
    lowMsg.includes("شركة مطابخ") ||
    lowMsg.includes("مورد أثاث") ||
    lowMsg.includes("شركات التصميم") ||
    lowMsg.includes("find partner")
  ) {
    return {
      reply: "تم البحث في منظومة الشركاء المعتمدين في OPROX وتقديم قائمة الشركات والمقاولين المعتمدين المطابقين لاحتياج مشروعك.",
      criteria: updatedCriteria,
      actions: [{ action: "FIND_PARTNERS", payload: { city: "Riyadh" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("ورني كنب") ||
    lowMsg.includes("منتجات الأثاث") ||
    lowMsg.includes("find product")
  ) {
    return {
      reply: "إليك قائمة بالأثاث والمنتجات التجارية المتاحة من الشركاء المعتمدين والتي تطابق نمط وتصميم مشروعك.",
      criteria: updatedCriteria,
      actions: [{ action: "FIND_PRODUCTS", payload: { category: "Sofas & Seating" } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("طلب عرض سعر") ||
    lowMsg.includes("أرسل التصميم للشركة") ||
    lowMsg.includes("request quotation")
  ) {
    return {
      reply: "تم تجهيز طلب عرض السعر (RFQ) وإرساله للشركات المحددة بعد تأكيد موافقتك الصريحة لمشاركة بيانات المشروع.",
      criteria: updatedCriteria,
      actions: [{ action: "REQUEST_QUOTATION", payload: { partnerIds: [2001, 2002] } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  if (
    lowMsg.includes("قارن عروض الأسعار") ||
    lowMsg.includes("مقارنة العروض") ||
    lowMsg.includes("compare quotations")
  ) {
    return {
      reply: "إليك مقارنة تفصيلية جنبًا إلى جنب لعروض الأسعار المقدمة من الشركاء المعتمدين متضمنة التكلفة والمدة والشروط.",
      criteria: updatedCriteria,
      actions: [{ action: "COMPARE_QUOTATIONS", payload: {} }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // Phase 12 Commercial & Package Query Handlers
  if (
    lowMsg.includes("الباقات") ||
    lowMsg.includes("الاشتراكات") ||
    lowMsg.includes("ترقية الحساب") ||
    lowMsg.includes("أسعار الباقات") ||
    lowMsg.includes("package plans") ||
    lowMsg.includes("pricing policy")
  ) {
    const entResult = checkOproxOsEntitlement({ tenantId: 1, userId: "usr_concierge", capability: "MARKETPLACE_BASIC" });
    return {
      reply: "الاشتراكات والباقات معتمدة تحت سلطة OPROX OS المركزية. سياسات الأسعار والضرائب حالياً: غير مهيأة (NOT CONFIGURED) وسيتم تحديثها مركزياً فور إطلاقها.",
      criteria: updatedCriteria,
      actions: [{ action: "VIEW_AVAILABLE_PLANS", payload: { pricingPolicyStatus: entResult.pricingPolicy, taxPolicyStatus: entResult.taxPolicy } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // Check for valuation / OPROX Estimate query
  const isValuationQuery =
    lastUserMsg.includes("تقييم") ||
    lastUserMsg.includes("تقدير") ||
    lastUserMsg.includes("كم يسوى") ||
    lastUserMsg.includes("كم تقييمه") ||
    lastUserMsg.includes("ليش تقييمه") ||
    lastUserMsg.includes("سعره مناسب") ||
    lastUserMsg.toLowerCase().includes("estimate") ||
    lastUserMsg.toLowerCase().includes("valuation");

  if (isValuationQuery) {
    const valuationInput = currentPropertyContext
      ? {
          listingId: currentPropertyContext.id,
          propertyType: (currentPropertyContext.propertyType as any) ?? "villa",
          transactionType: currentPropertyContext.transactionType ?? "sale",
          city: currentPropertyContext.city ?? "الرياض",
          district: currentPropertyContext.district,
          areaSqm: currentPropertyContext.areaSqm || 350,
          bedrooms: currentPropertyContext.bedrooms,
          bathrooms: currentPropertyContext.bathrooms,
          askingPrice: currentPropertyContext.price,
        }
      : {
          propertyType: updatedCriteria.propertyType ?? "villa",
          transactionType: updatedCriteria.transactionType ?? "sale",
          city: updatedCriteria.city ?? "الرياض",
          district: updatedCriteria.district,
          areaSqm: updatedCriteria.minArea ?? 350,
          bedrooms: updatedCriteria.bedrooms,
          askingPrice: updatedCriteria.maxPrice,
        };

    const est = await calculatePropertyEstimate(valuationInput);

    const posText =
      est.askingPricePosition === "BELOW_ESTIMATE"
        ? "السعر المعروض أقل من نطاق التقدير الحالي (فرصة متميزة)"
        : est.askingPricePosition === "ABOVE_ESTIMATE"
        ? "السعر المعروض أعلى من نطاق التقدير الحالي"
        : "السعر المعروض ضمن نطاق التقدير العادل للسوق";

    const reply = `🏡 **تقييم OPROX Estimate™ العقاري الذكي**:
• **القيمة التقديرية العادلة**: **${est.estimatedMidpoint.toLocaleString("en-US")} SAR**
• **نطاق التقدير المتوقع**: من **${est.estimatedLow.toLocaleString("en-US")} SAR** إلى **${est.estimatedHigh.toLocaleString("en-US")} SAR**
• **متوسط سعر المتر التقديري**: **${est.estimatedPricePerSqm.toLocaleString("en-US")} SAR/م²**
• **مستوى الثقة في التقييم**: **${est.confidence}** (بناءً على تحليل ${est.comparablesUsedCount} عقارات حقيقية مماثلة)
• **موقع السعر المعروض**: ${posText}

📊 **أبرز العوامل المؤثرة في التقييم**:
${est.factors.map((f) => `• ${f.titleAr}: ${f.impactAr}`).join("\n")}`;

    return {
      reply,
      criteria: updatedCriteria,
      listings: currentPropertyContext ? [currentPropertyContext] : undefined,
      actions: [
        {
          action: "GET_PROPERTY_ESTIMATE",
          payload: { estimate: est },
        },
        {
          action: "OPEN_ESTIMATE",
          payload: { listingId: currentPropertyContext?.id },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // Check for investment / rental yield query
  const isInvestmentQuery =
    lastUserMsg.includes("العائد") ||
    lastUserMsg.includes("استثمار") ||
    lastUserMsg.includes("عائد الإيجار") ||
    lastUserMsg.includes("أجره") ||
    lastUserMsg.includes("تأجير") ||
    lastUserMsg.toLowerCase().includes("yield") ||
    lastUserMsg.toLowerCase().includes("roi");

  if (isInvestmentQuery) {
    const purchasePrice = currentPropertyContext?.price ?? updatedCriteria.maxPrice ?? 2500000;
    const invMetrics = calculateInvestmentMetrics({
      purchasePrice,
      areaSqm: currentPropertyContext?.areaSqm,
    });
    const scenarios = generateInvestmentScenarios(purchasePrice);

    const reply = `📈 **تحليل الاستثمار والعائد المتوقع (OPROX Investment Intelligence™)**:
• **سعر الشراء المستهدف**: **${purchasePrice.toLocaleString("en-US")} SAR**
• **العائد الإجمالي المتوقع (Gross Yield)**: **${invMetrics.grossYieldPercent}% سنويًا** (~${invMetrics.grossAnnualRentSAR.toLocaleString("en-US")} SAR/سنة)
• **العائد الصافي المتوقع (Net Yield)**: **${invMetrics.netYieldPercent}% سنويًا** (بعد الصيانة والادارة والصافية **${invMetrics.netOperatingIncomeAnnualSAR.toLocaleString("en-US")} SAR**)
• **القسط الشهري التقديري للتمويل (20% دفعة أولى)**: **${invMetrics.monthlyMortgageSAR.toLocaleString("en-US")} SAR/شهر**
• **التدفق النقدي السنوي الصافي**: **${invMetrics.annualNetCashFlowSAR.toLocaleString("en-US")} SAR**

💡 **خيارات هيكلة التمويل المتاحة**:
1. **الشراء النقدي**: عائد صافي **${scenarios[0].metrics.netYieldPercent}%**
2. **تمويل 20% دفعة أولى**: قسط شهري **${scenarios[1].metrics.monthlyMortgageSAR.toLocaleString("en-US")} SAR**
3. **تمويل 30% دفعة أولى**: قسط شهري **${scenarios[2].metrics.monthlyMortgageSAR.toLocaleString("en-US")} SAR**`;

    return {
      reply,
      criteria: updatedCriteria,
      listings: currentPropertyContext ? [currentPropertyContext] : undefined,
      actions: [
        {
          action: "CALCULATE_INVESTMENT",
          payload: { metrics: invMetrics, scenarios },
        },
        {
          action: "OPEN_FINANCING",
          payload: { price: purchasePrice },
        },
      ],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // Check for current property details query
  if (currentPropertyContext && (lastUserMsg.includes("هذا العقار") || lastUserMsg.includes("3D") || lastUserMsg.includes("VR"))) {
    const price = currentPropertyContext.price;
    const area = currentPropertyContext.areaSqm;
    const pSqm = area > 0 ? Math.round(price / area) : 0;

    const reply = `إليك تفاصيل العقار المعروض حالياً (**${currentPropertyContext.title}**):
• **السعر الإجمالي**: ${price.toLocaleString("en-US")} SAR
• **المساحة**: ${area} م² (سعر المتر حوالي **${pSqm.toLocaleString("en-US")} SAR/م²**)
• **الموقع**: ${currentPropertyContext.district}، ${currentPropertyContext.city}
• **المواصفات**: ${currentPropertyContext.bedrooms ?? "—"} غرف نوم، ${currentPropertyContext.bathrooms ?? "—"} دورات مياه
• **التوثيق**: ${currentPropertyContext.verified ? "موثق مع ترخيص فال معتمد ✅" : "غير موثق"}
• **الجولة الافتراضية 3D/VR**: ${currentPropertyContext.has3D ? "متوفرة جولة 3D تفاعلية ✨" : "غير متوفرة"}`;

    return {
      reply,
      listings: [currentPropertyContext],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // Check for property comparison query
  const isComparison = lastUserMsg.includes("قارن") || lastUserMsg.includes("الفرق بين") || lastUserMsg.toLowerCase().includes("compare");

  // 2. Fetch ground marketplace inventory
  const { listings, isAlternative } = await searchMarketplaceInventory(updatedCriteria);

  if (isComparison && listings.length >= 2) {
    const comp = generatePropertyComparison(listings.slice(0, 2));
    return {
      reply: comp.summaryAr,
      criteria: updatedCriteria,
      listings: comp.properties,
      comparison: comp,
      actions: [{ action: "COMPARE_PROPERTIES", payload: { ids: comp.properties.map((p) => p.id) } }],
      metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
    };
  }

  // 3. Formulate conversational reply with grounded options
  let reply = "";
  if (listings.length === 0) {
    reply = "لم أجد عقارات تطابق تماماً هذه الشروط في الوقت الحالي. هل تود توسيع نطاق البحث أو تغيير الحي/الميزانية؟";
  } else if (isAlternative) {
    reply = `لم أجد عقاراً يطابق الشروط بالضبط، ولكن اخترت لك **${listings.length} خيارات ممتازة** في نفس المنطقة مع زيادة طفيفة في الميزانية أو خيارات قريبة:`;
  } else {
    const count = listings.length;
    const typeLabel = updatedCriteria.propertyType === "villa" ? "فيلا" : updatedCriteria.propertyType === "apartment" ? "شقة" : "عقار";
    const cityLabel = updatedCriteria.city ?? "الرياض";
    reply = `بحثت لك في السوق العقاري ووجدت **${count} ${typeLabel}** ممتازة في ${cityLabel}:`;
  }

  // Build AI Actions
  const actions: AIActionCall[] = [
    { action: "SEARCH_PROPERTIES", payload: { criteria: updatedCriteria } },
  ];

  if (listings.length > 0) {
    actions.push({ action: "OPEN_MAP", payload: { listingsCount: listings.length } });
  }

  return {
    reply,
    criteria: updatedCriteria,
    listings,
    isZeroResultAlternative: isAlternative,
    actions,
    metrics: { providerUsed: "rule_based", latencyMs: Date.now() - startTime },
  };
}
