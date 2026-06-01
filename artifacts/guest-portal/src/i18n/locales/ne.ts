import type { Translations } from "./en";

const ne: Translations = {
  request: {
    serviceRequest: "सेवा अनुरोध",
    requestType: "अनुरोधको प्रकार",
    description: "विवरण",
    descPlaceholder: "समस्याको संक्षिप्त विवरण दिनुहोस्…",
    submit: "अनुरोध पेश गर्नुहोस्",
    submitting: "पेश हुँदैछ...",
    unitNotFound: "एकाइ फेला परेन",
    invalidUnit: "कृपया सही एकाइ नम्बर हाल्नुहोस्।",
    errorGeneric: "त्रुटि भयो। पुनः प्रयास गर्नुहोस्।",
    types: {
      electrical: "विद्युत",
      plumbing: "प्लम्बिङ",
      ac: "एसी / हिटिङ",
      cleaning: "सफाई",
      maintenance: "मर्मत",
      noise: "आवाज",
      other: "अन्य",
    },
    timeSlot: "मनपर्ने समय स्लट",
    timeSlotPlaceholder: "समय विन्डो छान्नुहोस्",
    timeSlotHint: "छानिएको समयमा उपस्थित रहनुहोस् ताकि हाम्रो टोलीले तपाईंलाई सहयोग गर्न सकोस्।",
    success: {
      title: "अनुरोध प्राप्त भयो",
      subtitle: "तपाईंको अनुरोध प्राप्त भयो।",
      refCode: "सन्दर्भ कोड",
      keepCode: "अनुगमनका लागि सन्दर्भ कोड राख्नुहोस्",
      newRequest: "नयाँ अनुरोध",
    },
    status: { label: "अनुरोधको स्थिति", pending: "पेन्डिङ", hint: "हरेक ३० सेकेन्डमा स्वतः रिफ्रेस हुन्छ" },
    rating: { title: "आफ्नो अनुभव मूल्याङ्कन गर्नुहोस्", subtitle: "हाम्रो सेवा कस्तो थियो?", commentPlaceholder: "टिप्पणी लेख्नुहोस् (ऐच्छिक)…", submit: "मूल्याङ्कन पठाउनुहोस्", thankyou: "आफ्नो प्रतिक्रियाका लागि धन्यवाद!" },
  },
  landing: {
    accessUnit: "आफ्नो एकाइ पहुँच गर्नुहोस्",
    enterUnit: "सुरु गर्न एकाइ नम्बर हाल्नुहोस्",
    accessPortal: "पोर्टल पहुँच गर्नुहोस्",
    submitRequests: "अनुरोध पेश गर्नुहोस्",
    rateStay: "आफ्नो बसाइको मूल्याङ्कन गर्नुहोस्",
    unitDetails: "एकाइ विवरण",
  },
  lang: { select: "भाषा" },
};

export default ne;
