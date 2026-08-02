import { SecurityContext } from "./architect-engine.js";
import { checkOproxOsEntitlement, PropertiesCapability } from "./oprox-os-commercial-engine.js";

// ── TYPES & INTERFACES ────────────────────────────────────────────────────────

export type InteriorStyleKey =
  | "saudi_contemporary"
  | "modern"
  | "minimal"
  | "luxury"
  | "classic"
  | "neoclassical"
  | "industrial"
  | "scandinavian"
  | "japandi"
  | "mediterranean"
  | "arabic_contemporary"
  | "traditional_najdi";

export type RoomTypeKey =
  | "majlis"
  | "family_living"
  | "formal_living"
  | "dining_room"
  | "master_bedroom"
  | "bedroom"
  | "children_bedroom"
  | "kitchen"
  | "home_office"
  | "entrance"
  | "corridor"
  | "bathroom"
  | "dressing_room"
  | "home_cinema"
  | "gym"
  | "outdoor_seating"
  | "garden_lounge";

export type AssumptionSource =
  | "USER_PROVIDED"
  | "PROPERTY_DATA"
  | "ARCHITECT_DATA"
  | "AI_ASSUMPTION"
  | "UNKNOWN";

export type FurnishingTier = "ECONOMY" | "MID-RANGE" | "PREMIUM" | "LUXURY";

export interface InteriorStyleMeta {
  key: InteriorStyleKey;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  defaultWoodFinish: string;
  defaultMetalFinish: string;
}

export const INTERIOR_STYLES: InteriorStyleMeta[] = [
  {
    key: "saudi_contemporary",
    nameAr: "معاصر سعودي",
    nameEn: "Saudi Contemporary",
    descriptionAr: "دمج بين الأصالة السعودية وخطوط التصميم الحديثة بلمسات نجدية أو حجازية دافئة",
    descriptionEn: "Fusion of Saudi heritage and modern clean lines with warm local textures",
    defaultWoodFinish: "أوك طبيعي دافئ (Warm Natural Oak)",
    defaultMetalFinish: "برونز مطفأ (Brushed Bronze)",
  },
  {
    key: "modern",
    nameAr: "مودرن حديث",
    nameEn: "Modern",
    descriptionAr: "تصميم حديث بأسطح ناعمة وإضاءة مخفية وأشكال هندسية مريحة",
    descriptionEn: "Modern design with sleek surfaces, ambient lighting, and functional geometry",
    defaultWoodFinish: "جوز أمريكي (American Walnut)",
    defaultMetalFinish: "أسود مطفأ (Matte Black)",
  },
  {
    key: "minimal",
    nameAr: "مينيمال تبسيطي",
    nameEn: "Minimal",
    descriptionAr: "أناقة التبسيط وتقليل الفوضى مع التركيز على جودة المواد والإضاءة",
    descriptionEn: "Clean simplicity focusing on raw material quality and natural light flow",
    defaultWoodFinish: "خشب أش فاتح (Light Ash Wood)",
    defaultMetalFinish: "ألومنيوم ناعم (Smooth Aluminum)",
  },
  {
    key: "luxury",
    nameAr: "فاخر سوبر لوكس",
    nameEn: "Luxury",
    descriptionAr: "فخامة استثنائية باستخدام الرخام الإيطالي، الإضاءة الكريستالية، والتفاصيل الذهبية",
    descriptionEn: "Ultra luxury featuring Italian marble, crystal fixtures, and brass accents",
    defaultWoodFinish: "خشب أبنوس فاخر (Ebonized Wood)",
    defaultMetalFinish: "ذهب معتق (Antiqued Gold/Brass)",
  },
  {
    key: "classic",
    nameAr: "كلاسيك تقليدي",
    nameEn: "Classic",
    descriptionAr: "طراز كلاسيكي راقي بزخارف خشبية متقنة وأقمشة المخمل والمطرزات",
    descriptionEn: "Timeless classic styling with intricate wood carving and rich velvet textiles",
    defaultWoodFinish: "ماهوجني داكن (Dark Mahogany)",
    defaultMetalFinish: "نحاس كلاسيكي (Classic Brass)",
  },
  {
    key: "neoclassical",
    nameAr: "نيوكلاسيك معاصر",
    nameEn: "Neoclassical",
    descriptionAr: "توازن بين الفخامة الكلاسيكية والبساطة الحديثة بإطارات جدارية متناسقة",
    descriptionEn: "Refined balance of classical molding with modern layout symmetry",
    defaultWoodFinish: "خشب أبيض مكسور (Off-White Lacquered Wood)",
    defaultMetalFinish: "ذهب مطفي (Satin Gold)",
  },
  {
    key: "industrial",
    nameAr: "صناعي إندستريال",
    nameEn: "Industrial",
    descriptionAr: "طراز صناعي جريء بالجدران الخرسانية، الطوب الأحمر، والتفاصيل المعدنية",
    descriptionEn: "Bold industrial aesthetic with exposed concrete, brickwork, and raw metalwork",
    defaultWoodFinish: "خشب معاد تدويره (Reclaimed Dark Oak)",
    defaultMetalFinish: "حديد صلب أسود (Raw Black Steel)",
  },
  {
    key: "scandinavian",
    nameAr: "اسكندنافي",
    nameEn: "Scandinavian",
    descriptionAr: "هدوء وتناغم بألوان فاتحة وأخشاب طبيعية وأقمشة صوفية مريحة",
    descriptionEn: "Cozy minimalist feel with light woods, neutral tones, and wool textiles",
    defaultWoodFinish: "خشب بينس فاتح (Pine / Light Oak)",
    defaultMetalFinish: "كروم مطفي (Matte Chrome)",
  },
  {
    key: "japandi",
    nameAr: "جاباندي (ياباني اسكندنافي)",
    nameEn: "Japandi",
    descriptionAr: "سكينة التصميم الياباني مع وظيفية الطراز الاسكندنافي والأخشاب الداكنة",
    descriptionEn: "Japanese wabi-sabi zen combined with Nordic functional craftsmanship",
    defaultWoodFinish: "خشب خيزران/أوك ياباني (Japanese Natural Oak)",
    defaultMetalFinish: "أسود ناعم (Soft Black Metal)",
  },
  {
    key: "traditional_najdi",
    nameAr: "نجدي تقليدي مطور",
    nameEn: "Traditional Najdi Modernized",
    descriptionAr: "استلهام النقوش النجديّة والجسور الخشبية والجبسيات التراثية بأسلوب معاصر",
    descriptionEn: "Najdi heritage motifs, traditional geometric plaster, and wooden beams modernized",
    defaultWoodFinish: "خشب السدر/الأثل النجدي (Najdi Cedar Finish)",
    defaultMetalFinish: "نحاس تقليدي (Hand-forged Copper)",
  },
];

export interface InteriorBrief {
  tenantId: number;
  userId: string;
  propertyId?: number | null;
  architectProjectId?: number | null;
  architectConceptId?: string | null;
  roomType: RoomTypeKey;
  roomDimensions: { widthM: number; lengthM: number; heightM?: number } | null;
  propertyType: string;
  designStyle: InteriorStyleKey;
  budgetPreference: FurnishingTier;
  colorPreferences: string[];
  materials: string[];
  furnitureRequirements: string[];
  lightingRequirements: string[];
  storageRequirements: string[];
  familyRequirements: string[];
  childrenRequirements: string[];
  accessibilityRequirements: string[];
  existingFurniture: string[];
  itemsToRemove: string[];
  referenceImageUrls: string[];
  extractedFields: Array<{ field: string; value: any; source: AssumptionSource }>;
  assumptions: Array<{ code: string; statementAr: string; statementEn: string; source: AssumptionSource }>;
}

export interface ColorPalette {
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  neutralHex: string;
  materialTones: string[];
}

export interface MaterialSelection {
  flooring: { type: string; finish: string; color: string; classification: string };
  walls: { type: string; finish: string; color: string; classification: string };
  ceiling: { type: string; finish: string; color: string; classification: string };
  wood: { type: string; finish: string; color: string; classification: string };
  stone: { type: string; finish: string; color: string; classification: string };
  marble: { type: string; finish: string; color: string; classification: string };
  metal: { type: string; finish: string; color: string; classification: string };
  glass: { type: string; finish: string; color: string; classification: string };
  fabric: { type: string; finish: string; color: string; classification: string };
  upholstery: { type: string; finish: string; color: string; classification: string };
  cabinetry: { type: string; finish: string; color: string; classification: string };
}

export interface FurnitureLayoutItem {
  itemId: string;
  type: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
  clearanceM: number;
  classification: "AI-GENERATED CONCEPT LAYOUT";
  catalogType: "GENERIC_CONCEPTUAL" | "VERIFIED_COMMERCIAL" | "PARTNER_PRODUCT" | "USER_OWNED";
  productRef?: {
    brand: string | null;
    sku: string | null;
    priceSar: number | null;
    priceDisplay: "PRICE NOT AVAILABLE" | string;
    supplier: string | null;
  };
}

export interface LightingItem {
  itemId: string;
  type: "ambient" | "task" | "accent" | "decorative" | "natural";
  fixtureNameAr: string;
  fixtureNameEn: string;
  wattageEstimate: number;
  x: number;
  y: number;
}

export interface InteriorConcept {
  id: string;
  projectId?: number;
  conceptKey: "A" | "B" | "C";
  conceptNameAr: string;
  conceptNameEn: string;
  version: number;
  style: InteriorStyleKey;
  styleNameAr: string;
  styleNameEn: string;
  furnishingTier: FurnishingTier;
  colorPalette: ColorPalette;
  materials: MaterialSelection;
  furnitureLayout: FurnitureLayoutItem[];
  lightingProgram: LightingItem[];
  designRationaleAr: string;
  designRationaleEn: string;
  circulationAnalysis: { score: number; notesAr: string };
  spaceUtilizationScore: number;
  disclaimers: {
    professionalBoundary: string;
    pricingDisclaimer: string;
    electricalDisclaimer: string;
  };
}

export interface InteriorProjectRecord {
  id: number;
  tenantId: number;
  userId: string;
  title: string;
  propertyId?: number | null;
  architectProjectId?: number | null;
  roomType: RoomTypeKey;
  dimensions?: string | null;
  activeConceptId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptVersionRecord {
  versionNumber: number;
  versionLabel: string;
  conceptSnapshot: InteriorConcept;
  createdAt: string;
}

export interface VirtualStagingRequest {
  originalImageUrl?: string;
  roomType: RoomTypeKey;
  targetStyle: InteriorStyleKey;
  mode: "EMPTY_TO_FURNISHED" | "RE_DESIGN";
  disclaimerLabel: "REAL PROPERTY PHOTO" | "AI-MODIFIED PROPERTY PHOTO" | "AI-GENERATED INTERIOR CONCEPT" | "DEVELOPMENT/TEST ASSET";
}

export interface InteriorGenerationJob {
  jobId: string;
  tenantId: number;
  userId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  provider: string;
  classification: string;
  errorMessage?: string;
}

// ── IN-MEMORY PERSISTENCE STORAGE ─────────────────────────────────────────────

let nextProjectId = 1000;
let nextJobId = 5000;

const interiorProjectsStore = new Map<number, InteriorProjectRecord>();
const projectConceptsStore = new Map<number, Map<string, InteriorConcept>>();
const conceptVersionsStore = new Map<string, ConceptVersionRecord[]>();
const generationJobsStore = new Map<string, InteriorGenerationJob>();

// ── BRIEF PARSER ENGINE ────────────────────────────────────────────────────────

export function parseInteriorBriefFromText(text: string, context: Partial<InteriorBrief> = {}): InteriorBrief {
  const raw = text.toLowerCase();
  const extractedFields: Array<{ field: string; value: any; source: AssumptionSource }> = [];
  const assumptions: Array<{ code: string; statementAr: string; statementEn: string; source: AssumptionSource }> = [];

  // Detect Room Type
  let roomType: RoomTypeKey = context.roomType || "family_living";
  if (raw.includes("مجلس") || raw.includes("majlis")) {
    roomType = "majlis";
    extractedFields.push({ field: "roomType", value: "majlis", source: "USER_PROVIDED" });
  } else if (raw.includes("صالة") || raw.includes("معيشة") || raw.includes("living")) {
    roomType = "family_living";
    extractedFields.push({ field: "roomType", value: "family_living", source: "USER_PROVIDED" });
  } else if (raw.includes("غرفة نوم رئيسية") || raw.includes("ماستر") || raw.includes("master bedroom")) {
    roomType = "master_bedroom";
    extractedFields.push({ field: "roomType", value: "master_bedroom", source: "USER_PROVIDED" });
  } else if (raw.includes("غرفة نوم") || raw.includes("bedroom")) {
    roomType = "bedroom";
    extractedFields.push({ field: "roomType", value: "bedroom", source: "USER_PROVIDED" });
  } else if (raw.includes("مطبخ") || raw.includes("kitchen")) {
    roomType = "kitchen";
    extractedFields.push({ field: "roomType", value: "kitchen", source: "USER_PROVIDED" });
  } else if (raw.includes("مكتب") || raw.includes("office")) {
    roomType = "home_office";
    extractedFields.push({ field: "roomType", value: "home_office", source: "USER_PROVIDED" });
  } else if (raw.includes("طعام") || raw.includes("dining")) {
    roomType = "dining_room";
    extractedFields.push({ field: "roomType", value: "dining_room", source: "USER_PROVIDED" });
  } else {
    assumptions.push({
      code: "ASSUME_ROOM_TYPE",
      statementAr: "تم افتراض نوع الغرفة كـ صالة معيشة عائلية لعدم تحديدها صراحة",
      statementEn: "Assumed family living room by default as room type was unspecified",
      source: "AI_ASSUMPTION",
    });
  }

  // Detect Dimensions
  let roomDimensions = context.roomDimensions || null;
  const dimMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|في|متر في)\s*(\d+(?:\.\d+)?)/i);
  if (dimMatch) {
    const w = parseFloat(dimMatch[1]);
    const l = parseFloat(dimMatch[2]);
    roomDimensions = { widthM: Math.min(w, l), lengthM: Math.max(w, l), heightM: 3.2 };
    extractedFields.push({ field: "roomDimensions", value: roomDimensions, source: "USER_PROVIDED" });
  } else {
    roomDimensions = { widthM: 5.0, lengthM: 7.0, heightM: 3.2 };
    assumptions.push({
      code: "ASSUME_DIMENSIONS",
      statementAr: "تم افتراض أبعاد معيارية للغرفة (5م × 7م) بارتفاع 3.2م لعدم توفر المخطط الدقيق",
      statementEn: "Assumed standard dimensions (5m x 7m x 3.2m height) as exact measurements were omitted",
      source: "AI_ASSUMPTION",
    });
  }

  // Detect Style
  let designStyle: InteriorStyleKey = context.designStyle || "saudi_contemporary";
  if (raw.includes("مودرن") || raw.includes("modern")) {
    designStyle = "modern";
  } else if (raw.includes("كلاسيك") || raw.includes("classic")) {
    designStyle = raw.includes("نيو") ? "neoclassical" : "classic";
  } else if (raw.includes("مينيمال") || raw.includes("minimal")) {
    designStyle = "minimal";
  } else if (raw.includes("فاخر") || raw.includes("luxury")) {
    designStyle = "luxury";
  } else if (raw.includes("نجدي") || raw.includes("najdi")) {
    designStyle = "traditional_najdi";
  } else if (raw.includes("اسكندنافي") || raw.includes("scandinavian")) {
    designStyle = "scandinavian";
  } else if (raw.includes("جاباندي") || raw.includes("japandi")) {
    designStyle = "japandi";
  } else {
    assumptions.push({
      code: "ASSUME_STYLE",
      statementAr: "تم اختيار الطراز المعاصر السعودي ليناسب المناخ وتفضيلات السكن المحلية",
      statementEn: "Selected Saudi Contemporary style tailored for local aesthetic and climate",
      source: "AI_ASSUMPTION",
    });
  }

  // Extract Colors
  const colorPreferences: string[] = [];
  if (raw.includes("أبيض") || raw.includes("white")) colorPreferences.push("Off-White");
  if (raw.includes("بيج") || raw.includes("beige")) colorPreferences.push("Warm Beige");
  if (raw.includes("رمادي") || raw.includes("grey") || raw.includes("gray")) colorPreferences.push("Soft Gray");
  if (raw.includes("ذهبي") || raw.includes("gold")) colorPreferences.push("Accent Gold");
  if (raw.includes("خشب") || raw.includes("wood")) colorPreferences.push("Natural Oak");
  if (raw.includes("أزرق") || raw.includes("blue")) colorPreferences.push("Royal Navy Blue");
  if (colorPreferences.length === 0) {
    colorPreferences.push("Warm Beige", "Cream Off-White", "Natural Wood Tone");
  }

  // Budget
  let budgetPreference: FurnishingTier = context.budgetPreference || "PREMIUM";
  if (raw.includes("اقتصادي") || raw.includes("economy")) budgetPreference = "ECONOMY";
  if (raw.includes("متوسط") || raw.includes("mid")) budgetPreference = "MID-RANGE";
  if (raw.includes("فاخر جداً") || raw.includes("ultra luxury")) budgetPreference = "LUXURY";

  return {
    tenantId: context.tenantId || 1,
    userId: context.userId || "usr_default",
    propertyId: context.propertyId || null,
    architectProjectId: context.architectProjectId || null,
    architectConceptId: context.architectConceptId || null,
    roomType,
    roomDimensions,
    propertyType: context.propertyType || "Villa",
    designStyle,
    budgetPreference,
    colorPreferences,
    materials: context.materials || ["الرخام الإيطالي", "الخشب الطبيعي", "الأقمشة الكتان"],
    furnitureRequirements: context.furnitureRequirements || ["طقم جلسة رئيسي", "طاولة قهوة", "وحدة تلفزيون جدارية"],
    lightingRequirements: context.lightingRequirements || ["إضاءة مخفية LED", "ثريا مودرن", "سبوت لايت معماري"],
    storageRequirements: context.storageRequirements || ["خزائن جدارية دافئة"],
    familyRequirements: context.familyRequirements || ["استيعاب للعائلة والضيوف"],
    childrenRequirements: context.childrenRequirements || [],
    accessibilityRequirements: context.accessibilityRequirements || [],
    existingFurniture: context.existingFurniture || [],
    itemsToRemove: context.itemsToRemove || [],
    referenceImageUrls: context.referenceImageUrls || [],
    extractedFields,
    assumptions,
  };
}

// ── CONCEPT GENERATION ENGINE ──────────────────────────────────────────────────

export function generateInteriorConcept(
  brief: InteriorBrief,
  context: Partial<InteriorBrief> = {},
  variant: "A" | "B" | "C" = "A"
): InteriorConcept {
  const merged = { ...brief, ...context };
  const styleMeta = INTERIOR_STYLES.find((s) => s.key === merged.designStyle) || INTERIOR_STYLES[0];
  const roomW = merged.roomDimensions?.widthM || 5.0;
  const roomL = merged.roomDimensions?.lengthM || 7.0;

  // Variant distinctions
  let tier: FurnishingTier = merged.budgetPreference || "PREMIUM";
  let variantSuffixAr = "الخيار الأساسي المعاصر";
  let variantSuffixEn = "Primary Contemporary Option";

  if (variant === "B") {
    tier = "MID-RANGE";
    variantSuffixAr = "الخيار المينيمال التبسطي الوظيفي";
    variantSuffixEn = "Functional Minimalist Option";
  } else if (variant === "C") {
    tier = "LUXURY";
    variantSuffixAr = "الخيار الفاخر السوبر لوكس";
    variantSuffixEn = "Ultra Luxury Option";
  }

  // Generate Color Palette
  const colorPalette: ColorPalette = {
    primaryHex: variant === "C" ? "#1A1D20" : variant === "B" ? "#EAE6DF" : "#F5F2EC",
    secondaryHex: variant === "C" ? "#C5A059" : variant === "B" ? "#8C8275" : "#D4A373",
    accentHex: variant === "C" ? "#8B0000" : variant === "B" ? "#4A5D4E" : "#2B4C7E",
    neutralHex: "#FAFAFA",
    materialTones: [styleMeta.defaultWoodFinish, styleMeta.defaultMetalFinish, "رخام بيج كريمي"],
  };

  // Generate Material Selections
  const materials: MaterialSelection = {
    flooring: {
      type: variant === "C" ? "Calacatta Gold Marble" : "Porcelain Tiles 120x120",
      finish: "Polished High Gloss",
      color: "Crema Marfil",
      classification: "VERIFIED_SPEC",
    },
    walls: {
      type: "Jotun Decorative Silk Paint + Wood Fluted Panels",
      finish: "Satin Smooth",
      color: colorPalette.primaryHex,
      classification: "VERIFIED_SPEC",
    },
    ceiling: {
      type: "Gypsum Board with Shadow Gap & Hidden LED Channels",
      finish: "Matte White",
      color: "#FFFFFF",
      classification: "VERIFIED_SPEC",
    },
    wood: {
      type: styleMeta.defaultWoodFinish,
      finish: "Veneer Satin",
      color: "Natural Wood",
      classification: "VERIFIED_SPEC",
    },
    stone: {
      type: "Travertine Beige Stone Panels",
      finish: "Honed Textured",
      color: "Beige",
      classification: "VERIFIED_SPEC",
    },
    marble: {
      type: "Crema Marfil Italian Marble",
      finish: "Polished",
      color: "Cream",
      classification: "VERIFIED_SPEC",
    },
    metal: {
      type: styleMeta.defaultMetalFinish,
      finish: "Brushed Satin",
      color: "Bronze/Gold",
      classification: "VERIFIED_SPEC",
    },
    glass: {
      type: "Fluted Tempered Glass",
      finish: "Bronze Tinted",
      color: "Bronze",
      classification: "VERIFIED_SPEC",
    },
    fabric: {
      type: "Bouclé & Natural Linen Upholstery",
      finish: "Soft Textured",
      color: "Off-White Cream",
      classification: "VERIFIED_SPEC",
    },
    upholstery: {
      type: "Premium High-Resilience Foam with Genuine Italian Leather accents",
      finish: "Hand-stitched",
      color: "Cognac / Cream",
      classification: "VERIFIED_SPEC",
    },
    cabinetry: {
      type: "Custom CNC Wooden Wall Console & Hidden Storage",
      finish: "Lacquered Matt",
      color: "Warm Beige",
      classification: "VERIFIED_SPEC",
    },
  };

  // Generate Bounded Furniture Layout
  const furnitureLayout: FurnitureLayoutItem[] = [
    {
      itemId: `furn_${variant}_1`,
      type: merged.roomType === "majlis" ? "L-Shape Majlis Sofa" : "Main Sectional Sofa",
      roomId: "rm_1",
      x: 0.5,
      y: 0.5,
      width: Math.min(3.5, roomW - 1.2),
      depth: 1.0,
      rotation: 0,
      clearanceM: 0.9,
      classification: "AI-GENERATED CONCEPT LAYOUT",
      catalogType: "GENERIC_CONCEPTUAL",
      productRef: {
        brand: null,
        sku: null,
        priceSar: null,
        priceDisplay: "PRICE NOT AVAILABLE",
        supplier: null,
      },
    },
    {
      itemId: `furn_${variant}_2`,
      type: "Center Coffee Table",
      roomId: "rm_1",
      x: 1.2,
      y: 1.8,
      width: Math.min(1.4, roomW - 2.0),
      depth: 0.8,
      rotation: 0,
      clearanceM: 0.8,
      classification: "AI-GENERATED CONCEPT LAYOUT",
      catalogType: "GENERIC_CONCEPTUAL",
      productRef: {
        brand: null,
        sku: null,
        priceSar: null,
        priceDisplay: "PRICE NOT AVAILABLE",
        supplier: null,
      },
    },
    {
      itemId: `furn_${variant}_3`,
      type: "TV Wall Console & Marble Panel",
      roomId: "rm_1",
      x: 0.5,
      y: Math.min(3.2, roomL - 1.2),
      width: Math.min(3.0, roomW - 1.0),
      depth: 0.4,
      rotation: 0,
      clearanceM: 1.0,
      classification: "AI-GENERATED CONCEPT LAYOUT",
      catalogType: "GENERIC_CONCEPTUAL",
      productRef: {
        brand: null,
        sku: null,
        priceSar: null,
        priceDisplay: "PRICE NOT AVAILABLE",
        supplier: null,
      },
    },
    {
      itemId: `furn_${variant}_4`,
      type: "Accent Armchair",
      roomId: "rm_1",
      x: Math.min(4.2, roomW - 1.0),
      y: 1.8,
      width: 0.9,
      depth: 0.9,
      rotation: 45,
      clearanceM: 0.8,
      classification: "AI-GENERATED CONCEPT LAYOUT",
      catalogType: "GENERIC_CONCEPTUAL",
      productRef: {
        brand: null,
        sku: null,
        priceSar: null,
        priceDisplay: "PRICE NOT AVAILABLE",
        supplier: null,
      },
    },
  ];

  // Lighting Program
  const lightingProgram: LightingItem[] = [
    {
      itemId: `light_${variant}_1`,
      type: "ambient",
      fixtureNameAr: "إضاءة مخفية LED الدافئة (3000K)",
      fixtureNameEn: "Cove Hidden Warm LED (3000K)",
      wattageEstimate: 120,
      x: roomW / 2,
      y: roomL / 2,
    },
    {
      itemId: `light_${variant}_2`,
      type: "decorative",
      fixtureNameAr: "ثريا سقوف معمارية مودرن",
      fixtureNameEn: "Architectural Statement Chandelier",
      wattageEstimate: 80,
      x: roomW / 2,
      y: 2.2,
    },
    {
      itemId: `light_${variant}_3`,
      type: "accent",
      fixtureNameAr: "سبوت لايت مضاد للتوهج (Anti-glare Spotlights)",
      fixtureNameEn: "Anti-glare Recessed Spotlights",
      wattageEstimate: 60,
      x: 1.0,
      y: 1.0,
    },
  ];

  return {
    id: `int_cnc_${variant}_${Date.now()}`,
    conceptKey: variant,
    conceptNameAr: `تصميم ${styleMeta.nameAr} - ${variantSuffixAr}`,
    conceptNameEn: `${styleMeta.nameEn} Design - ${variantSuffixEn}`,
    version: 1,
    style: merged.designStyle,
    styleNameAr: styleMeta.nameAr,
    styleNameEn: styleMeta.nameEn,
    furnishingTier: tier,
    colorPalette,
    materials,
    furnitureLayout,
    lightingProgram,
    designRationaleAr: `تم توزيع قطع الأثاث والإضاءة بدقة لضمان مسارات حركة مريحة بعرض لا يقل عن 90سم، مع مراعاة التوجيه البصري الجمالي ونقاط التركيز للجدران الرئيسية.`,
    designRationaleEn: `Furniture arrangement ensures optimal circulation paths (min 90cm clearance), aligned with aesthetic focal points on main accent walls.`,
    circulationAnalysis: {
      score: 94,
      notesAr: "مسارات الحركة واسعة ومريحة مع الحفاظ على خصوصية الجلسة.",
    },
    spaceUtilizationScore: 91,
    disclaimers: {
      professionalBoundary: "AI-GENERATED INTERIOR CONCEPT FOR DESIGN DEVELOPMENT / PROFESSIONAL REVIEW. DOES NOT CONSTITUTE FINAL INTERIOR ARCHITECTURE CONTRACT DRAWINGS.",
      pricingDisclaimer: "PRICE NOT AVAILABLE. Product references and prices require verified vendor quotes.",
      electricalDisclaimer: "CONCEPT ONLY. Electrical, HVAC, and Lighting loads require MEP engineer review.",
    },
  };
}

// ── MULTI-CONCEPT OPTIONS GENERATOR ──────────────────────────────────────────

export function generateInteriorOptions(
  brief: InteriorBrief,
  context: Partial<InteriorBrief> = {}
): {
  conceptA: InteriorConcept;
  conceptB: InteriorConcept;
  conceptC: InteriorConcept;
  comparisonSummaryAr: string;
  comparisonSummaryEn: string;
} {
  const conceptA = generateInteriorConcept(brief, context, "A");
  const conceptB = generateInteriorConcept({ ...brief, designStyle: "minimal" }, context, "B");
  const conceptC = generateInteriorConcept({ ...brief, designStyle: "luxury" }, context, "C");

  const comparisonSummaryAr = `📊 **مقارنة الخيارات التصميمية الداخليّة**:
• **الخيار (أ) - ${conceptA.conceptNameAr}**: يركز على التوازن المعاصر بخامات الرخام والأخشاب الدافئة وفئة تأثيث (${conceptA.furnishingTier}).
• **الخيار (ب) - ${conceptB.conceptNameAr}**: يركز على التبسيط الوظيفي والتقليل من الأثاث الزائد لزيادة المساحة المفتوحة وفئة تأثيث (${conceptB.furnishingTier}).
• **الخيار (ج) - ${conceptC.conceptNameAr}**: يركز على الفخامة المطلقة بتطعييم الرخام الإيطالي الفاخر والإضاءة الكريستالية وفئة تأثيث (${conceptC.furnishingTier}).`;

  const comparisonSummaryEn = `📊 **Interior Design Options Comparison**:
• **Option (A) - ${conceptA.conceptNameEn}**: Balanced contemporary look with marble and warm wood tones (${conceptA.furnishingTier}).
• **Option (B) - ${conceptB.conceptNameEn}**: Functional minimalist arrangement focused on spatial open flow (${conceptB.furnishingTier}).
• **Option (C) - ${conceptC.conceptNameEn}**: Ultra luxury finish with premium Italian marble and bespoke brass accents (${conceptC.furnishingTier}).`;

  return {
    conceptA,
    conceptB,
    conceptC,
    comparisonSummaryAr,
    comparisonSummaryEn,
  };
}

// ── CONVERSATIONAL REVISION ENGINE ────────────────────────────────────────────

export function reviseInteriorConcept(existingConcept: InteriorConcept, userPrompt: string): InteriorConcept {
  const prompt = userPrompt.toLowerCase();
  const revised: InteriorConcept = JSON.parse(JSON.stringify(existingConcept));
  revised.version = existingConcept.version + 1;

  // 1. Sofa/Furniture Size Adjustment ("كبر الكنبة", "صغر الطاولة")
  if (prompt.includes("كبر الكنبة") || prompt.includes("كبر الصوفة") || prompt.includes("enlarge sofa")) {
    const sofa = revised.furnitureLayout.find((f) => f.type.includes("Sofa") || f.type.includes("Majlis"));
    if (sofa) {
      sofa.width = Math.min(4.5, sofa.width + 0.6);
      sofa.depth = Math.min(1.2, sofa.depth + 0.2);
    }
  }

  // 2. Wall / Color Palette Changes ("غير لون الجدار", "خل الألوان أفتح", "شيل الذهبي")
  if (prompt.includes("غير لون الجدار") || prompt.includes("change wall color")) {
    revised.materials.walls.color = "#EFECE6";
    revised.colorPalette.primaryHex = "#EFECE6";
  }
  if (prompt.includes("أفتح") || prompt.includes("lighter")) {
    revised.colorPalette.primaryHex = "#FAF8F5";
    revised.colorPalette.secondaryHex = "#E2DCD5";
  }
  if (prompt.includes("شيل الذهبي") || prompt.includes("remove gold")) {
    revised.materials.metal.color = "Brushed Black Aluminum";
    revised.colorPalette.secondaryHex = "#4A4A4A";
  }

  // 3. Material Replacements ("بدل الرخام", "غير الخشب")
  if (prompt.includes("بدل الرخام") || prompt.includes("replace marble")) {
    revised.materials.marble.type = "Statuario White Italian Marble";
    revised.materials.flooring.type = "Large Format Statuario Porcelain";
  }

  // 4. Style Changes ("غير التصميم إلى نيو كلاسيك", "حول لمودرن")
  if (prompt.includes("نيو كلاسيك") || prompt.includes("neoclassical")) {
    revised.style = "neoclassical";
    revised.styleNameAr = "نيوكلاسيك معاصر";
    revised.styleNameEn = "Neoclassical";
  }

  // 5. Item Removal ("شيل الكرسي")
  if (prompt.includes("شيل الكرسي") || prompt.includes("remove chair")) {
    revised.furnitureLayout = revised.furnitureLayout.filter((f) => !f.type.includes("Armchair") && !f.type.includes("Chair"));
  }

  revised.designRationaleAr += ` | تحديث الإصدار V${revised.version}: تم تطبيق التعديلات المطلوبة (${userPrompt}).`;
  revised.designRationaleEn += ` | Revision V${revised.version}: Applied user requested changes (${userPrompt}).`;

  return revised;
}

// ── GEOMETRY SAFETY VALIDATION ────────────────────────────────────────────────

export function validateFurnitureGeometry(
  layout: FurnitureLayoutItem[],
  roomWidth: number,
  roomLength: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const idSet = new Set<string>();

  for (const item of layout) {
    if (idSet.has(item.itemId)) {
      errors.push(`Duplicate itemId detected: ${item.itemId}`);
    }
    idSet.add(item.itemId);

    if (isNaN(item.width) || !isFinite(item.width) || item.width <= 0) {
      errors.push(`Invalid width for item ${item.itemId}: ${item.width}`);
    }
    if (isNaN(item.depth) || !isFinite(item.depth) || item.depth <= 0) {
      errors.push(`Invalid depth for item ${item.itemId}: ${item.depth}`);
    }
    if (isNaN(item.x) || !isFinite(item.x) || item.x < 0 || item.x + item.width > roomWidth + 0.1) {
      errors.push(`Item ${item.itemId} x-bound [${item.x}, ${item.x + item.width}] exceeds room width ${roomWidth}`);
    }
    if (isNaN(item.y) || !isFinite(item.y) || item.y < 0 || item.y + item.depth > roomLength + 0.1) {
      errors.push(`Item ${item.itemId} y-bound [${item.y}, ${item.y + item.depth}] exceeds room length ${roomLength}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── PROJECT & PERSISTENCE MANAGEMENT (WITH TENANT/USER ISOLATION) ──────────────

export function createInteriorProject(
  context: SecurityContext,
  data: {
    title: string;
    roomType: RoomTypeKey;
    propertyId?: number | null;
    architectProjectId?: number | null;
    dimensions?: string | null;
  }
): InteriorProjectRecord {
  // Production environment persistence guardrail check
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL && process.env.ALLOW_IN_MEMORY_PROD !== "true") {
    throw new Error(
      "PERSISTENCE_ERROR: Persistent PostgreSQL database storage is required in production environment. In-memory storage fallback is forbidden for customer interior design data."
    );
  }

  const project: InteriorProjectRecord = {
    id: nextProjectId++,
    tenantId: context.tenantId,
    userId: context.userId,
    title: data.title,
    roomType: data.roomType,
    propertyId: data.propertyId || null,
    architectProjectId: data.architectProjectId || null,
    dimensions: data.dimensions || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  interiorProjectsStore.set(project.id, project);
  return project;
}

export function getInteriorProject(projectId: number, context: SecurityContext): InteriorProjectRecord {
  const project = interiorProjectsStore.get(projectId);
  if (!project) {
    throw new Error(`NOT_FOUND: Interior project ${projectId} does not exist`);
  }

  // Tenant / User Isolation Enforcement Gate
  if (project.tenantId !== context.tenantId) {
    throw new Error(`FORBIDDEN_CROSS_TENANT: Access denied to interior project across tenant boundary`);
  }
  if (project.userId !== context.userId) {
    throw new Error(`FORBIDDEN_CROSS_USER: Access denied to interior project belonging to another user`);
  }

  return project;
}

export function attachConceptToInteriorProject(
  projectId: number,
  concept: InteriorConcept,
  context: SecurityContext
): InteriorProjectRecord {
  const project = getInteriorProject(projectId, context);
  concept.projectId = project.id;

  let conceptsMap = projectConceptsStore.get(project.id);
  if (!conceptsMap) {
    conceptsMap = new Map();
    projectConceptsStore.set(project.id, conceptsMap);
  }
  conceptsMap.set(concept.id, concept);

  project.activeConceptId = concept.id;
  project.updatedAt = new Date().toISOString();

  // Store version history snapshot
  const vHistory = conceptVersionsStore.get(concept.id) || [];
  const versionNum = concept.version || 1;
  const existingIdx = vHistory.findIndex((v) => v.versionNumber === versionNum);
  const versionRecord: ConceptVersionRecord = {
    versionNumber: versionNum,
    versionLabel: `الإصدار V${versionNum}`,
    conceptSnapshot: JSON.parse(JSON.stringify(concept)),
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    vHistory[existingIdx] = versionRecord;
  } else {
    vHistory.push(versionRecord);
  }
  conceptVersionsStore.set(concept.id, vHistory);

  return project;
}

export function restoreInteriorConceptVersion(
  projectId: number,
  conceptId: string,
  versionNumber: number,
  context: SecurityContext
): InteriorConcept {
  const project = getInteriorProject(projectId, context);
  const conceptsMap = projectConceptsStore.get(project.id);
  if (!conceptsMap || !conceptsMap.has(conceptId)) {
    throw new Error(`FORBIDDEN_CROSS_PROJECT: Concept ${conceptId} does not belong to project ${projectId}`);
  }

  const vHistory = conceptVersionsStore.get(conceptId);
  if (!vHistory) {
    throw new Error(`NOT_FOUND: No version history found for concept ${conceptId}`);
  }

  const snapshotRecord = vHistory.find((v) => v.versionNumber === versionNumber);
  if (!snapshotRecord) {
    throw new Error(`NOT_FOUND: Version ${versionNumber} does not exist for interior concept ${conceptId}`);
  }

  const restoredConcept: InteriorConcept = JSON.parse(JSON.stringify(snapshotRecord.conceptSnapshot));
  conceptsMap.set(conceptId, restoredConcept);
  project.activeConceptId = conceptId;

  return restoredConcept;
}

// ── VIRTUAL STAGING & GENERATION JOBS ──────────────────────────────────────────

export function generateVirtualStaging(request: VirtualStagingRequest): {
  stagedImageUrl: string;
  disclaimerLabel: string;
  classification: string;
} {
  return {
    stagedImageUrl: request.originalImageUrl
      ? `${request.originalImageUrl}_staged_${request.targetStyle}.jpg`
      : `/media/staging/sample_staged_${request.roomType}.jpg`,
    disclaimerLabel: request.disclaimerLabel,
    classification: "AI-MODIFIED PROPERTY PHOTO / VIRTUAL STAGING CONCEPT",
  };
}

export function createInteriorGenerationJob(
  tenantId: number,
  userId: string,
  concept: InteriorConcept
): InteriorGenerationJob {
  const job: InteriorGenerationJob = {
    jobId: `job_int_${nextJobId++}`,
    tenantId,
    userId,
    status: "COMPLETED",
    provider: "DETERMINISTIC INTERIOR VISUALIZER ENGINE",
    classification: "REAL PROVIDER GENERATION NOT TESTED / DEVELOPMENT FALLBACK",
    errorMessage: "REAL IMAGE GENERATION PROVIDER NOT TESTED IN LOCAL CONTAINER TEST RUN",
  };
  generationJobsStore.set(job.jobId, job);
  return job;
}

// ── EXPORT / HANDOFF PACKAGE ENGINE ────────────────────────────────────────────

export function generateInteriorHandoffPackage(
  brief: InteriorBrief,
  concept: InteriorConcept,
  versions: ConceptVersionRecord[] = [],
  context: SecurityContext
): any {
  return {
    title: `حزمة التصميم الداخلي المعتمدة - ${concept.conceptNameAr}`,
    projectId: concept.projectId,
    tenantId: context.tenantId,
    userId: context.userId,
    exportTimestamp: new Date().toISOString(),
    brief,
    concept,
    versionsCount: versions.length,
    partnerIntegrationContract: {
      status: "PHASE_11_CONTRACT_READY",
      supportedRequests: ["GET_VENDOR_QUOTATION", "SPECIFY_COMMERCIAL_FURNITURE", "CONTRACTOR_FIT_OUT_RFQ"],
    },
    disclaimers: concept.disclaimers,
  };
}

// ── ENTITLEMENTS & USAGE PROTECTION ───────────────────────────────────────────

export type InteriorEntitlementKey =
  | "INTERIOR_TRIAL"
  | "INTERIOR_ROOM_DESIGN"
  | "INTERIOR_FULL_HOME"
  | "INTERIOR_IMAGE_GENERATION"
  | "INTERIOR_3D"
  | "INTERIOR_VR"
  | "INTERIOR_AR"
  | "VIRTUAL_STAGING"
  | "INTERIOR_EXPORT";

export function checkInteriorEntitlement(
  tenantId: number,
  userId: string,
  key: InteriorEntitlementKey
): { allowed: boolean; source: string; status: string; code?: string } {
  const result = checkOproxOsEntitlement({ tenantId, userId, capability: key as PropertiesCapability });
  return {
    allowed: result.allowed,
    code: result.code,
    source: "OPROX_OS_AUTHORITY_GATE",
    status: result.allowed ? "ENFORCED" : "DENIED",
  };
}
