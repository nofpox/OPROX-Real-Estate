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
    invalidUnit: "कृपया एक वैध इकाई नंबर दर्ज करें।",
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
  landing: {
    accessUnit: "अपनी इकाई तक पहुँचें",
    enterUnit: "शुरू करने के लिए अपना इकाई नंबर दर्ज करें",
    accessPortal: "पोर्टल एक्सेस करें",
    submitRequests: "अनुरोध सबमिट करें",
    rateStay: "अपने प्रवास को रेट करें",
    unitDetails: "इकाई विवरण",
  },
  lang: { select: "भाषा" },
};

export default hi;
