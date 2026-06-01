import type { Translations } from "./en";

const hi: Translations = {
  request: {
    serviceRequest: "सेवा अनुरोध",
    requestType: "अनुरोध का प्रकार",
    description: "विवरण",
    descPlaceholder: "समस्या का संक्षिप्त विवरण दें…",
    submit: "अनुरोध सबमिट करें",
    submitting: "सबमिट हो रहा है...",
    unitNotFound: "इकाई नहीं मिली",
    errorGeneric: "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
    types: {
      electrical: "बिजली",
      plumbing: "प्लंबिंग",
      ac: "एसी / हीटिंग",
      cleaning: "सफाई",
      maintenance: "रखरखाव",
      noise: "शोर",
      other: "अन्य",
    },
    success: {
      title: "अनुरोध प्राप्त हुआ",
      subtitle: "आपका अनुरोध प्राप्त हो गया है।",
      refCode: "संदर्भ कोड",
      keepCode: "अनुवर्ती कार्रवाई के लिए अपना संदर्भ कोड रखें",
      newRequest: "नया अनुरोध",
    },
  },
  lang: { select: "भाषा" },
};

export default hi;
