import type { Translations } from "./en";

const ar: Translations = {
  request: {
    serviceRequest: "طلب خدمة",
    requestType: "نوع الطلب",
    description: "وصف المشكلة",
    descPlaceholder: "اكتب وصفاً مختصراً للمشكلة…",
    submit: "إرسال الطلب",
    submitting: "جاري الإرسال...",
    unitNotFound: "الوحدة غير موجودة",
    invalidUnit: "يرجى إدخال رقم وحدة صحيح.",
    errorGeneric: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    types: {
      electrical: "كهرباء",
      plumbing: "سباكة",
      ac: "تكييف / تدفئة",
      cleaning: "تنظيف",
      maintenance: "صيانة عامة",
      noise: "ضوضاء",
      other: "أخرى",
    },
    success: {
      title: "تم الاستلام",
      subtitle: "تم استلام طلبك.",
      refCode: "رمز الطلب المرجعي",
      keepCode: "احتفظ برمز الطلب للمتابعة",
      newRequest: "تقديم طلب جديد",
    },
  },
  landing: {
    accessUnit: "الوصول إلى وحدتك",
    enterUnit: "أدخل رقم وحدتك للبدء",
    accessPortal: "دخول البوابة",
    submitRequests: "تقديم الطلبات",
    rateStay: "تقييم إقامتك",
    unitDetails: "تفاصيل الوحدة",
  },
  lang: { select: "اللغة" },
};

export default ar;
