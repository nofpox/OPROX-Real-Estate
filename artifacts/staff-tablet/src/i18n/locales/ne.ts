import type { Translations } from "./en";

const ne: Translations = {
  nav: { units: "एकाइहरू", workOrders: "काम आदेशहरू", tasks: "मेरा कामहरू" },
  status: { available: "उपलब्ध", occupied: "व्यस्त", maintenance: "मर्मत", cleaning: "सफाई", pending: "विचाराधीन", inProgress: "प्रगतिमा", completed: "सम्पन्न", cancelled: "रद्द", verified: "प्रमाणित" },
  priority: { urgent: "अत्यावश्यक", high: "उच्च", medium: "मध्यम", low: "कम" },
  dashboard: { appSubtitle: "स्टाफ ड्यासबोर्ड", totalUnits: "कुल एकाइहरू", allProperties: "सबै सम्पत्तिहरू", logout: "लग आउट" },
  workOrders: { title: "काम आदेशहरू", subtitle: "मेरा काम आदेशहरू", pending: "विचाराधीन", inProgress: "प्रगतिमा", done: "सम्पन्न", all: "सबै", startWork: "काम सुरु गर्नुहोस्", complete: "सम्पन्न गर्नुहोस्", completedDone: "सम्पन्न", empty: "कुनै काम आदेश छैन", emptyDesc: "कुनै काम तोकिएको छैन", failedLoad: "लोड असफल", retry: "पुनः प्रयास", toastStarted: "सुरु भयो", toastCompleted: "सम्पन्न", toastFailed: "अपडेट असफल" },
  tasks: { title: "मेरा हालका कामहरू", pending: "विचाराधीन", active: "सक्रिय", done: "सम्पन्न", startTask: "काम सुरु गर्नुहोस्", endTask: "काम समाप्त गर्नुहोस्", awaitingApproval: "अनुमोदनको प्रतीक्षा", completedAwaiting: "सम्पन्न — अनुमोदनको प्रतीक्षा", approved: "अनुमोदित", completeTask: "काम सम्पन्न गर्नुहोस्", taskLabel: "काम", completionPhoto: "सम्पन्नता फोटो", tapPhoto: "फोटो खिच्न ट्याप गर्नुहोस्", gpsLocation: "GPS स्थान", locationGetting: "तपाईंको स्थान प्राप्त हुँदैछ...", locationDone: "स्थान दर्ता भयो", locationFailed: "स्थान प्राप्त गर्न सकिएन", allowLocation: "ब्राउजर सेटिङमा स्थान अनुमति दिनुहोस्", retryGps: "पुनः प्रयास", requirements: "आवश्यकताहरू", photo: "फोटो", submitReport: "रिपोर्ट पेश गर्नुहोस्", submitting: "पेश हुँदैछ...", cancel: "रद्द गर्नुहोस्" },
  unitDetail: { unitStatus: "एकाइ स्थिति", financialData: "वित्तीय डेटा", serviceRequests: "सेवा अनुरोधहरू", setStatus: "स्थिति सेट गर्नुहोस्", type: "प्रकार", capacity: "क्षमता", rate: "दर", status: "स्थिति", amountDue: "बाँकी रकम", dueDate: "नियत मिति", checkIn: "चेक इन", checkOut: "चेक आउट", saveChanges: "परिवर्तनहरू सुरक्षित गर्नुहोस्", noFinancial: "कुनै वित्तीय डेटा छैन", addFinancial: "वित्तीय डेटा थप्नुहोस्", noRequests: "यस एकाइका लागि कुनै अनुरोध छैन", resolve: "समाधान गर्नुहोस्", qrTitle: "सेवा अनुरोध QR", copyLink: "लिंक प्रतिलिपि गर्नुहोस्", copied: "लिंक प्रतिलिपि भयो!", guests: "अतिथिहरू", perNight: "/रात", loading: "लोड हुँदैछ…", edit: "सम्पादन", cancel: "रद्द", new: "नयाँ", offline: "अफलाइन — पुनः जडान भएपछि सिंक हुनेछ" },
  lang: { select: "भाषा" },
};

export default ne;
