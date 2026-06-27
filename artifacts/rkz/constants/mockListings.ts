// ─────────────────────────────────────────────────────────────────────────────
// Mock property listings — fallback when API returns empty
// ─────────────────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  titleAr: string;
  titleEn: string;
  type: "villa" | "apartment" | "land" | "commercial";
  status: "sale" | "rent";
  price: number;
  currency: "SAR";
  city: string;
  district: string;
  beds?: number;
  baths?: number;
  area?: number;
  lat: number;
  lng: number;
  image: string;
  featured: boolean;
  agentName: string;
  agentPhone: string;
  description: string;
  listedAt: string;
}

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "101",
    titleAr: "فيلا فاخرة في حي النرجس",
    titleEn: "Luxury Villa in Al-Narjis",
    type: "villa",
    status: "sale",
    price: 3_500_000,
    currency: "SAR",
    city: "الرياض",
    district: "حي النرجس",
    beds: 5,
    baths: 6,
    area: 450,
    lat: 24.7954,
    lng: 46.7374,
    image: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800",
    featured: true,
    agentName: "أحمد المنصور",
    agentPhone: "0501234567",
    description: "فيلا فاخرة بتصميم عصري في أرقى أحياء الرياض، تحتوي على مسبح خاص وحديقة واسعة وغرف نوم مريحة مع إطلالة رائعة.",
    listedAt: "2026-05-15",
  },
  {
    id: "102",
    titleAr: "شقة مميزة في جدة",
    titleEn: "Upscale Apartment in Jeddah",
    type: "apartment",
    status: "sale",
    price: 1_200_000,
    currency: "SAR",
    city: "جدة",
    district: "حي الشاطئ",
    beds: 3,
    baths: 2,
    area: 180,
    lat: 21.5433,
    lng: 39.1728,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    featured: true,
    agentName: "سارة العتيبي",
    agentPhone: "0551234567",
    description: "شقة راقية بإطلالة جميلة على البحر الأحمر، قريبة من الخدمات والمراكز التجارية.",
    listedAt: "2026-05-20",
  },
  {
    id: "103",
    titleAr: "أرض تجارية في الدمام",
    titleEn: "Commercial Land in Dammam",
    type: "land",
    status: "sale",
    price: 2_800_000,
    currency: "SAR",
    city: "الدمام",
    district: "حي العزيزية",
    area: 1200,
    lat: 26.4207,
    lng: 50.0888,
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
    featured: false,
    agentName: "محمد الزهراني",
    agentPhone: "0561234567",
    description: "أرض تجارية في موقع استراتيجي مميز، صالحة للاستثمار التجاري والسكني.",
    listedAt: "2026-05-10",
  },
  {
    id: "104",
    titleAr: "فيلا للإيجار في مكة",
    titleEn: "Villa for Rent in Makkah",
    type: "villa",
    status: "rent",
    price: 120_000,
    currency: "SAR",
    city: "مكة المكرمة",
    district: "العزيزية",
    beds: 4,
    baths: 3,
    area: 300,
    lat: 21.3891,
    lng: 39.8579,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    featured: true,
    agentName: "خالد السالم",
    agentPhone: "0571234567",
    description: "فيلا رائعة على بعد خطوات من المسجد الحرام، مجهزة بالكامل ومكيفة.",
    listedAt: "2026-05-18",
  },
  {
    id: "105",
    titleAr: "شقة للإيجار في المدينة المنورة",
    titleEn: "Apartment for Rent in Madinah",
    type: "apartment",
    status: "rent",
    price: 45_000,
    currency: "SAR",
    city: "المدينة المنورة",
    district: "قربان",
    beds: 2,
    baths: 1,
    area: 120,
    lat: 24.4686,
    lng: 39.6142,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    featured: false,
    agentName: "فاطمة الغامدي",
    agentPhone: "0581234567",
    description: "شقة مريحة قريبة من المسجد النبوي الشريف، مجهزة بجميع الخدمات.",
    listedAt: "2026-05-22",
  },
  {
    id: "106",
    titleAr: "محل تجاري في الرياض",
    titleEn: "Commercial Shop in Riyadh",
    type: "commercial",
    status: "rent",
    price: 80_000,
    currency: "SAR",
    city: "الرياض",
    district: "العليا",
    area: 200,
    lat: 24.6877,
    lng: 46.7219,
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800",
    featured: false,
    agentName: "عبدالله الحربي",
    agentPhone: "0591234567",
    description: "محل تجاري في قلب حي العليا، مناسب لجميع الأنشطة التجارية.",
    listedAt: "2026-05-12",
  },
  {
    id: "107",
    titleAr: "فيلا حديثة في الخبر",
    titleEn: "Modern Villa in Al-Khobar",
    type: "villa",
    status: "sale",
    price: 2_200_000,
    currency: "SAR",
    city: "الخبر",
    district: "الصفا",
    beds: 4,
    baths: 4,
    area: 380,
    lat: 26.2172,
    lng: 50.1971,
    image: "https://images.unsplash.com/photo-1600047508006-f7b1e99a0f55?w=800",
    featured: true,
    agentName: "نورة القحطاني",
    agentPhone: "0601234567",
    description: "فيلا حديثة التصميم في حي راقٍ بالخبر، قريبة من كورنيش الخبر ومراكز التسوق.",
    listedAt: "2026-05-25",
  },
  {
    id: "108",
    titleAr: "شقة فندقية في الرياض",
    titleEn: "Hotel Apartment in Riyadh",
    type: "apartment",
    status: "rent",
    price: 95_000,
    currency: "SAR",
    city: "الرياض",
    district: "غرناطة",
    beds: 1,
    baths: 1,
    area: 80,
    lat: 24.7136,
    lng: 46.6753,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
    featured: false,
    agentName: "يوسف المطيري",
    agentPhone: "0611234567",
    description: "شقة فندقية فاخرة مع كامل الخدمات في برج سكني راقٍ.",
    listedAt: "2026-05-08",
  },
];

export function formatPrice(price: number, isAr: boolean): string {
  if (price >= 1_000_000) {
    const m = (price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1);
    return isAr ? `${m} مليون` : `${m}M`;
  }
  if (price >= 1_000) {
    const k = (price / 1_000).toFixed(0);
    return isAr ? `${k} ألف` : `${k}K`;
  }
  return price.toLocaleString();
}
