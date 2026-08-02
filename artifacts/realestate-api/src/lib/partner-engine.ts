import { SecurityContext } from "./architect-engine.js";
import { checkOproxOsEntitlement, PropertiesCapability } from "./oprox-os-commercial-engine.js";

// ── TYPES & INTERFACES ────────────────────────────────────────────────────────

export type PartnerCategoryKey =
  | "architecture_firms"
  | "interior_design_firms"
  | "general_contractors"
  | "fit_out_contractors"
  | "furniture_companies"
  | "furniture_stores"
  | "kitchen_companies"
  | "lighting_companies"
  | "flooring_suppliers"
  | "marble_stone_suppliers"
  | "building_material_suppliers"
  | "glass_aluminum_companies"
  | "doors_windows_companies"
  | "landscaping_companies"
  | "swimming_pool_companies"
  | "smart_home_companies"
  | "security_system_companies"
  | "hvac_companies"
  | "electrical_contractors"
  | "plumbing_contractors"
  | "painting_companies"
  | "decoration_companies"
  | "curtain_textile_companies"
  | "home_appliance_suppliers"
  | "visualization_studios"
  | "surveying_engineering_offices"
  | "property_photography"
  | "moving_relocation";

export type VerificationState =
  | "UNVERIFIED"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "EXPIRED";

export type LeadStatus =
  | "NEW"
  | "VIEWED"
  | "CONTACTED"
  | "QUOTATION_REQUESTED"
  | "QUOTATION_SENT"
  | "NEGOTIATING"
  | "WON"
  | "LOST"
  | "CLOSED";

export interface PartnerProfile {
  partnerId: number;
  tenantId: number;
  organizationId: string;
  nameAr: string;
  nameEn: string;
  category: PartnerCategoryKey;
  descriptionAr: string;
  descriptionEn: string;
  city: string;
  districts: string[];
  contactEmail: string;
  contactPhone: string;
  websiteUrl?: string;
  verificationState: VerificationState;
  isSponsored: boolean;
  ratingAverage: number;
  reviewCount: number;
  classification: "DEVELOPMENT/TEST PARTNER" | "VERIFIED COMMERCIAL PARTNER";
  createdAt: string;
  updatedAt: string;
}

export interface CommercialProduct {
  productId: string;
  partnerId: number;
  tenantId: number;
  nameAr: string;
  nameEn: string;
  category: string;
  descriptionAr: string;
  descriptionEn: string;
  sku: string | null;
  priceSar: number | null;
  priceDisplay: string;
  availability: "IN_STOCK" | "CUSTOM_ORDER" | "OUT_OF_STOCK" | "UNKNOWN";
  dimensionsM?: { width: number; height: number; depth: number };
  materials: string[];
  colors: string[];
  imageUrl?: string;
  has3dModel: boolean;
  hasArAsset: boolean;
  classification: "DEVELOPMENT/TEST PRODUCT" | "VERIFIED COMMERCIAL PRODUCT";
}

export interface RequestForQuotation {
  rfqId: string;
  tenantId: number;
  userId: string;
  partnerIds: number[];
  serviceCategory: PartnerCategoryKey;
  scopeSummaryAr: string;
  propertyId?: number | null;
  architectProjectId?: number | null;
  interiorProjectId?: number | null;
  sharedCustomerConsent: boolean;
  locationCity: string;
  status: "OPEN" | "QUOTED" | "CLOSED";
  createdAt: string;
}

export interface QuotationLineItem {
  itemId: string;
  descriptionAr: string;
  quantity: number;
  unit: string;
  unitPriceSar: number;
  subtotalSar: number;
}

export interface PartnerQuotation {
  quotationId: string;
  rfqId: string;
  partnerId: number;
  tenantId: number;
  lineItems: QuotationLineItem[];
  subtotalSar: number;
  taxSar?: number | null;
  totalSar: number;
  pricingPolicyStatus: "NOT CONFIGURED";
  taxPolicyStatus: "NOT CONFIGURED";
  accountingPolicyStatus: "NOT CONFIGURED";
  validUntil: string;
  timelineDays: number;
  termsAr: string;
  createdAt: string;
}

export interface ProjectHandoffPackage {
  handoffId: string;
  tenantId: number;
  userId: string;
  partnerId: number;
  rfqId: string;
  quotationId: string;
  customerConsentGranted: boolean;
  sharedScope: {
    propertyContext?: any;
    architectConcept?: any;
    interiorConcept?: any;
    materialSchedule?: any;
  };
  handoffTimestamp: string;
}

export interface PartnerLeadRecord {
  leadId: string;
  tenantId: number;
  partnerId: number;
  userId: string;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── IN-MEMORY PARTNER STORE ────────────────────────────────────────────────────

let nextPartnerId = 2000;
let nextRfqId = 7000;
let nextQuotationId = 8000;
let nextHandoffId = 9000;

const partnersStore = new Map<number, PartnerProfile>();
const productsStore = new Map<string, CommercialProduct>();
const rfqsStore = new Map<string, RequestForQuotation>();
const quotationsStore = new Map<string, PartnerQuotation>();
const handoffsStore = new Map<string, ProjectHandoffPackage>();
const leadsStore = new Map<string, PartnerLeadRecord>();

// Seed Development/Test Partner Records
function seedDevelopmentPartners() {
  if (partnersStore.size > 0) return;

  const p1: PartnerProfile = {
    partnerId: 2001,
    tenantId: 1,
    organizationId: "org_najd_fitout",
    nameAr: "شركة النجدي للتصميم والديكور المطور (تجريبي)",
    nameEn: "Najdi Modern Fit-out & Interior Co. (Test)",
    category: "fit_out_contractors",
    descriptionAr: "متخصصون في تنفيذ أعمال الديكور والتشطيبات الفاخرة بالطراز النجدي والمعاصر.",
    descriptionEn: "Specialists in luxury interior fit-out and Najdi contemporary designs.",
    city: "Riyadh",
    districts: ["Hittin", "Al-Nakhil", "Al-Malqa"],
    contactEmail: "info@najdfitout-test.sa",
    contactPhone: "+966500000001",
    verificationState: "VERIFIED",
    isSponsored: true,
    ratingAverage: 4.8,
    reviewCount: 24,
    classification: "DEVELOPMENT/TEST PARTNER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const p2: PartnerProfile = {
    partnerId: 2002,
    tenantId: 1,
    organizationId: "org_riyadh_furniture",
    nameAr: "مؤسسة الرياض للأثاث الفاخر (تجريبي)",
    nameEn: "Riyadh Luxury Furniture Est. (Test)",
    category: "furniture_companies",
    descriptionAr: "مورّد معتمد لأطقم الكنب والمجالس والمفروشات الفاخرة.",
    descriptionEn: "Certified supplier of luxury sofa sets, majlis seating, and upholstery.",
    city: "Riyadh",
    districts: ["Al-Olaya", "Al-Sulaimaniyah"],
    contactEmail: "sales@riyadhfurniture-test.sa",
    contactPhone: "+966500000002",
    verificationState: "VERIFIED",
    isSponsored: false,
    ratingAverage: 4.6,
    reviewCount: 18,
    classification: "DEVELOPMENT/TEST PARTNER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  partnersStore.set(p1.partnerId, p1);
  partnersStore.set(p2.partnerId, p2);

  // Seed Products for Partner 2002
  const prod1: CommercialProduct = {
    productId: "prod_sofa_2002_1",
    partnerId: 2002,
    tenantId: 1,
    nameAr: "طقم كنب معاصر سعودي - موديل الرياض 2026",
    nameEn: "Saudi Contemporary Sofa Set - Riyadh Model 2026",
    category: "Sofas & Seating",
    descriptionAr: "طقم كنب من القماش الفاخر المقاوم للبقع بأسطح خشبية دافئة.",
    descriptionEn: "Luxury stain-resistant fabric sofa with warm oak wooden trim.",
    sku: "SKU-RYD-SOFA-01",
    priceSar: 12500,
    priceDisplay: "12,500 SAR",
    availability: "IN_STOCK",
    dimensionsM: { width: 3.5, height: 0.9, depth: 1.0 },
    materials: ["Italian Fabric", "Oak Wood", "High-Density Foam"],
    colors: ["Warm Cream Beige", "Natural Oak"],
    has3dModel: true,
    hasArAsset: true,
    classification: "DEVELOPMENT/TEST PRODUCT",
  };

  productsStore.set(prod1.productId, prod1);
}

seedDevelopmentPartners();

// ── PARTNER DOMAIN API ─────────────────────────────────────────────────────────

export function searchPartners(query: {
  category?: PartnerCategoryKey;
  city?: string;
  verificationState?: VerificationState;
  tenantId?: number;
}): PartnerProfile[] {
  seedDevelopmentPartners();
  const list = Array.from(partnersStore.values());
  return list.filter((p) => {
    if (query.tenantId && p.tenantId !== query.tenantId) return false;
    if (query.category && p.category !== query.category) return false;
    if (query.city && p.city.toLowerCase() !== query.city.toLowerCase()) return false;
    if (query.verificationState && p.verificationState !== query.verificationState) return false;
    return true;
  });
}

export function getPartnerProfile(partnerId: number, context: SecurityContext): PartnerProfile {
  seedDevelopmentPartners();
  const partner = partnersStore.get(partnerId);
  if (!partner) {
    throw new Error(`NOT_FOUND: Partner ${partnerId} does not exist`);
  }
  if (partner.tenantId !== context.tenantId) {
    throw new Error(`FORBIDDEN_CROSS_TENANT: Access denied to partner across tenant boundary`);
  }
  return partner;
}

export function getPartnerProducts(partnerId: number, context: SecurityContext): CommercialProduct[] {
  seedDevelopmentPartners();
  getPartnerProfile(partnerId, context);
  return Array.from(productsStore.values()).filter((prod) => prod.partnerId === partnerId);
}

export function createRequestForQuotation(
  context: SecurityContext,
  data: {
    partnerIds: number[];
    serviceCategory: PartnerCategoryKey;
    scopeSummaryAr: string;
    propertyId?: number | null;
    architectProjectId?: number | null;
    interiorProjectId?: number | null;
    sharedCustomerConsent: boolean;
    locationCity: string;
  }
): RequestForQuotation {
  // Guardrail for production database persistence
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL && process.env.ALLOW_IN_MEMORY_PROD !== "true") {
    throw new Error(
      "PERSISTENCE_ERROR: Persistent PostgreSQL database storage is required in production environment. In-memory storage fallback is forbidden for customer partner RFQ data."
    );
  }

  // Validate customer consent requirement
  if (!data.sharedCustomerConsent) {
    throw new Error("CONSENT_REQUIRED: Customer explicit consent is required before sharing project references with partners");
  }

  const rfq: RequestForQuotation = {
    rfqId: `rfq_${nextRfqId++}`,
    tenantId: context.tenantId,
    userId: context.userId,
    partnerIds: data.partnerIds,
    serviceCategory: data.serviceCategory,
    scopeSummaryAr: data.scopeSummaryAr,
    propertyId: data.propertyId || null,
    architectProjectId: data.architectProjectId || null,
    interiorProjectId: data.interiorProjectId || null,
    sharedCustomerConsent: data.sharedCustomerConsent,
    locationCity: data.locationCity,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };

  rfqsStore.set(rfq.rfqId, rfq);

  // Generate Lead records for partners
  for (const pid of data.partnerIds) {
    const leadId = `lead_${rfq.rfqId}_${pid}`;
    leadsStore.set(leadId, {
      leadId,
      tenantId: context.tenantId,
      partnerId: pid,
      userId: context.userId,
      status: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return rfq;
}

export function submitPartnerQuotation(
  partnerContext: { tenantId: number; partnerId: number },
  data: {
    rfqId: string;
    lineItems: QuotationLineItem[];
    timelineDays: number;
    termsAr: string;
  }
): PartnerQuotation {
  const rfq = rfqsStore.get(data.rfqId);
  if (!rfq) {
    throw new Error(`NOT_FOUND: RFQ ${data.rfqId} does not exist`);
  }
  if (rfq.tenantId !== partnerContext.tenantId) {
    throw new Error(`FORBIDDEN_CROSS_TENANT: Cross-tenant quotation submission denied`);
  }
  if (!rfq.partnerIds.includes(partnerContext.partnerId)) {
    throw new Error(`FORBIDDEN_CROSS_PARTNER: Partner ${partnerContext.partnerId} is not invited to this RFQ`);
  }

  const subtotalSar = data.lineItems.reduce((acc, item) => acc + item.subtotalSar, 0);
  // OPROX Properties does NOT assume, calculate or define tax/VAT/fees.
  // Financial authority belongs exclusively to central OPROX OS integration.
  const totalSar = subtotalSar;

  const quotation: PartnerQuotation = {
    quotationId: `quote_${nextQuotationId++}`,
    rfqId: data.rfqId,
    partnerId: partnerContext.partnerId,
    tenantId: partnerContext.tenantId,
    lineItems: data.lineItems,
    subtotalSar,
    taxSar: null,
    totalSar,
    pricingPolicyStatus: "NOT CONFIGURED",
    taxPolicyStatus: "NOT CONFIGURED",
    accountingPolicyStatus: "NOT CONFIGURED",
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    timelineDays: data.timelineDays,
    termsAr: data.termsAr,
    createdAt: new Date().toISOString(),
  };

  quotationsStore.set(quotation.quotationId, quotation);
  rfq.status = "QUOTED";

  // Update lead status
  const leadId = `lead_${data.rfqId}_${partnerContext.partnerId}`;
  const lead = leadsStore.get(leadId);
  if (lead) {
    lead.status = "QUOTATION_SENT";
    lead.updatedAt = new Date().toISOString();
  }

  return quotation;
}

export function compareQuotations(rfqId: string, context: SecurityContext): {
  rfq: RequestForQuotation;
  quotations: PartnerQuotation[];
  comparisonSummaryAr: string;
} {
  const rfq = rfqsStore.get(rfqId);
  if (!rfq) {
    throw new Error(`NOT_FOUND: RFQ ${rfqId} does not exist`);
  }
  if (rfq.tenantId !== context.tenantId) {
    throw new Error(`FORBIDDEN_CROSS_TENANT: Cross-tenant RFQ comparison denied`);
  }
  if (rfq.userId !== context.userId) {
    throw new Error(`FORBIDDEN_CROSS_USER: Cross-user RFQ comparison denied`);
  }

  const qList = Array.from(quotationsStore.values()).filter((q) => q.rfqId === rfqId);

  const summaryAr = `📊 **مقارنة عروض الأسعار المعتمدة لطلب RFQ (${rfqId})**:
${qList
  .map(
    (q, i) =>
      `• **العرض ${i + 1} (شركة #${q.partnerId})**: إجمالي العرض المباشر ${q.totalSar.toLocaleString()} ر.س (سياسة الضرائب والرسوم: غير مهيأة NOT CONFIGURED) | مدة التنفيذ: ${q.timelineDays} يوماً`
  )
  .join("\n")}`;

  return { rfq, quotations: qList, comparisonSummaryAr: summaryAr };
}

export function executeProjectHandoff(
  context: SecurityContext,
  data: {
    rfqId: string;
    quotationId: string;
    partnerId: number;
    customerConsentGranted: boolean;
    sharedScope: any;
  }
): ProjectHandoffPackage {
  if (!data.customerConsentGranted) {
    throw new Error("CONSENT_REQUIRED: Customer consent must be explicitly granted before project handoff execution");
  }

  const rfq = rfqsStore.get(data.rfqId);
  if (!rfq) {
    throw new Error(`NOT_FOUND: RFQ ${data.rfqId} does not exist`);
  }
  if (rfq.tenantId !== context.tenantId || rfq.userId !== context.userId) {
    throw new Error(`FORBIDDEN_CROSS_USER: Project handoff denied across security boundaries`);
  }

  const handoff: ProjectHandoffPackage = {
    handoffId: `handoff_${nextHandoffId++}`,
    tenantId: context.tenantId,
    userId: context.userId,
    partnerId: data.partnerId,
    rfqId: data.rfqId,
    quotationId: data.quotationId,
    customerConsentGranted: data.customerConsentGranted,
    sharedScope: data.sharedScope,
    handoffTimestamp: new Date().toISOString(),
  };

  handoffsStore.set(handoff.handoffId, handoff);

  // Update Lead Status to WON
  const leadId = `lead_${data.rfqId}_${data.partnerId}`;
  const lead = leadsStore.get(leadId);
  if (lead) {
    lead.status = "WON";
    lead.updatedAt = new Date().toISOString();
  }

  return handoff;
}

// ── OPROX OS ENTITLEMENTS AUTHORITY CHECK ──────────────────────────────────────

export type PartnerEntitlementKey =
  | "PARTNER_PROFILE"
  | "PARTNER_PRODUCTS"
  | "PARTNER_PORTFOLIO"
  | "PARTNER_LEADS"
  | "PARTNER_RFQ"
  | "PARTNER_QUOTATIONS"
  | "PARTNER_ANALYTICS"
  | "PARTNER_FEATURED"
  | "PARTNER_SPONSORED"
  | "PARTNER_3D_PRODUCTS"
  | "PARTNER_AR_PRODUCTS"
  | "PARTNER_PREMIUM_STOREFRONT";

export function checkPartnerEntitlement(
  tenantId: number,
  partnerId: number,
  key: PartnerEntitlementKey
): { allowed: boolean; source: string; status: string; code?: string } {
  const result = checkOproxOsEntitlement({ tenantId, userId: `partner_${partnerId}`, capability: key as PropertiesCapability });
  return {
    allowed: result.allowed,
    code: result.code,
    source: "OPROX_OS_AUTHORITY_GATE",
    status: result.allowed ? "ENFORCED" : "DENIED",
  };
}
