import type { Translations } from "./en";

const hi: Translations = {
  nav: { units: "इकाइयाँ", workOrders: "कार्य आदेश", tasks: "मेरे कार्य" },
  status: { available: "उपलब्ध", occupied: "व्यस्त", maintenance: "रखरखाव", cleaning: "सफाई", pending: "लंबित", inProgress: "प्रगति में", completed: "पूर्ण", cancelled: "रद्द", verified: "सत्यापित" },
  priority: { urgent: "अत्यावश्यक", high: "उच्च", medium: "मध्यम", low: "कम" },
  dashboard: { appSubtitle: "स्टाफ डैशबोर्ड", totalUnits: "कुल इकाइयाँ", allProperties: "सभी संपत्तियाँ", logout: "लॉग आउट" },
  workOrders: { title: "कार्य आदेश", subtitle: "मेरे कार्य आदेश", pending: "लंबित", inProgress: "प्रगति में", done: "पूर्ण", all: "सभी", startWork: "कार्य शुरू करें", complete: "पूर्ण करें", completedDone: "पूर्ण", empty: "कोई कार्य आदेश नहीं", emptyDesc: "कोई कार्य आदेश असाइन नहीं", failedLoad: "लोड विफल", retry: "पुनः प्रयास", toastStarted: "शुरू हुआ", toastCompleted: "पूर्ण", toastFailed: "अपडेट विफल" },
  tasks: { title: "मेरे वर्तमान कार्य", pending: "लंबित", active: "सक्रिय", done: "पूर्ण", startTask: "कार्य शुरू करें", endTask: "कार्य समाप्त करें", awaitingApproval: "अनुमोदन की प्रतीक्षा", completedAwaiting: "पूर्ण — अनुमोदन की प्रतीक्षा", approved: "अनुमोदित", completeTask: "कार्य पूर्ण करें", taskLabel: "कार्य", completionPhoto: "पूर्णता फोटो", tapPhoto: "फोटो लेने के लिए टैप करें", gpsLocation: "जीपीएस स्थान", locationGetting: "आपका स्थान प्राप्त हो रहा है...", locationDone: "स्थान दर्ज हो गया", locationFailed: "स्थान नहीं मिल सका", allowLocation: "कृपया ब्राउज़र सेटिंग में स्थान की अनुमति दें", retryGps: "पुनः प्रयास", requirements: "आवश्यकताएं", photo: "फोटो", submitReport: "रिपोर्ट सबमिट करें", submitting: "सबमिट हो रहा है...", cancel: "रद्द करें" },
  unitDetail: { unitStatus: "इकाई स्थिति", financialData: "वित्तीय डेटा", serviceRequests: "सेवा अनुरोध", setStatus: "स्थिति सेट करें", type: "प्रकार", capacity: "क्षमता", rate: "दर", status: "स्थिति", amountDue: "देय राशि", dueDate: "नियत तारीख", checkIn: "चेक इन", checkOut: "चेक आउट", saveChanges: "परिवर्तन सहेजें", noFinancial: "कोई वित्तीय डेटा नहीं", addFinancial: "वित्तीय डेटा जोड़ें", noRequests: "इस इकाई के लिए कोई अनुरोध नहीं", resolve: "हल करें", qrTitle: "सेवा अनुरोध QR", copyLink: "लिंक कॉपी करें", copied: "लिंक कॉपी हो गया!", guests: "अतिथि", perNight: "/रात", loading: "लोड हो रहा है…", edit: "संपादित करें", cancel: "रद्द करें", new: "नया", offline: "ऑफलाइन — पुनः कनेक्ट होने पर सिंक होगा" },
  lang: { select: "भाषा" },
};

export default hi;
