import type { Translations } from "./en";

const ur: Translations = {
  request: {
    serviceRequest: "خدمت کی درخواست",
    requestType: "درخواست کی قسم",
    description: "تفصیل",
    descPlaceholder: "مسئلے کا مختصر وضاحت لکھیں…",
    submit: "درخواست جمع کریں",
    submitting: "جمع ہو رہا ہے...",
    unitNotFound: "یونٹ نہیں ملا",
    invalidUnit: "براہ کرم ایک درست یونٹ نمبر درج کریں۔",
    errorGeneric: "ایک خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔",
    types: {
      electrical: "بجلی",
      plumbing: "پلمبنگ",
      ac: "اے سی / ہیٹنگ",
      cleaning: "صفائی",
      maintenance: "مرمت",
      noise: "شور",
      other: "دیگر",
    },
    timeSlot: "پسندیدہ وقت کی کھڑکی",
    timeSlotPlaceholder: "وقت کی کھڑکی منتخب کریں",
    timeSlotHint: "براہ کرم منتخب وقت کے دوران موجود رہیں تاکہ ہماری ٹیم آپ کی مدد کر سکے۔",
    success: {
      title: "درخواست موصول ہوئی",
      subtitle: "آپ کی درخواست موصول ہو گئی ہے۔",
      refCode: "حوالہ کوڈ",
      keepCode: "پیروی کے لیے اپنا حوالہ کوڈ محفوظ رکھیں",
      newRequest: "نئی درخواست",
    },
    status: { label: "درخواست کی حالت", pending: "زیر التواء", hint: "ہر 30 سیکنڈ میں خودبخود تازہ ہوتا ہے" },
    rating: { title: "اپنا تجربہ درج کریں", subtitle: "ہماری خدمت کیسی تھی؟", commentPlaceholder: "تبصرہ لکھیں (اختیاری)…", submit: "تشخیص جمع کریں", thankyou: "آپ کے تاثرات کا شکریہ!" },
  },
  landing: {
    accessUnit: "اپنے یونٹ تک رسائی",
    enterUnit: "شروع کرنے کے لیے اپنا یونٹ نمبر درج کریں",
    accessPortal: "پورٹل میں داخل ہوں",
    submitRequests: "درخواستیں جمع کریں",
    rateStay: "اپنے قیام کی درجہ بندی کریں",
    unitDetails: "یونٹ کی تفصیلات",
  },
  lang: { select: "زبان" },
};

export default ur;
