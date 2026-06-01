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
    success: {
      title: "अनुरोध प्राप्त भयो",
      subtitle: "तपाईंको अनुरोध प्राप्त भयो।",
      refCode: "सन्दर्भ कोड",
      keepCode: "अनुगमनका लागि सन्दर्भ कोड राख्नुहोस्",
      newRequest: "नयाँ अनुरोध",
    },
  },
  lang: { select: "भाषा" },
};

export default ne;
