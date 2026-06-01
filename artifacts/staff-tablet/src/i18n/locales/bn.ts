import type { Translations } from "./en";

const bn: Translations = {
  nav: { units: "ইউনিট", workOrders: "কাজের আদেশ", tasks: "আমার কাজ" },
  status: { available: "উপলব্ধ", occupied: "ব্যস্ত", maintenance: "রক্ষণাবেক্ষণ", cleaning: "পরিষ্কার", pending: "মুলতুবি", inProgress: "চলমান", completed: "সম্পন্ন", cancelled: "বাতিল", verified: "যাচাইকৃত" },
  priority: { urgent: "জরুরি", high: "উচ্চ", medium: "মাঝারি", low: "কম" },
  dashboard: { appSubtitle: "স্টাফ ড্যাশবোর্ড", totalUnits: "মোট ইউনিট", allProperties: "সব সম্পত্তি", logout: "লগ আউট" },
  workOrders: { title: "কাজের আদেশ", subtitle: "আমার কাজের আদেশ", pending: "মুলতুবি", inProgress: "চলমান", done: "সম্পন্ন", all: "সব", startWork: "কাজ শুরু করুন", complete: "সম্পন্ন করুন", completedDone: "সম্পন্ন", empty: "কোনো কাজের আদেশ নেই", emptyDesc: "কোনো কাজ বরাদ্দ নেই", failedLoad: "লোড ব্যর্থ", retry: "আবার চেষ্টা করুন", toastStarted: "শুরু হয়েছে", toastCompleted: "সম্পন্ন", toastFailed: "আপডেট ব্যর্থ" },
  tasks: { title: "আমার বর্তমান কাজ", pending: "মুলতুবি", active: "সক্রিয়", done: "সম্পন্ন", startTask: "কাজ শুরু করুন", endTask: "কাজ শেষ করুন", awaitingApproval: "অনুমোদনের অপেক্ষায়", completedAwaiting: "সম্পন্ন — অনুমোদনের অপেক্ষায়", approved: "অনুমোদিত", completeTask: "কাজ সম্পন্ন করুন", taskLabel: "কাজ", completionPhoto: "সমাপ্তি ছবি", tapPhoto: "ছবি তুলতে ট্যাপ করুন", gpsLocation: "জিপিএস অবস্থান", locationGetting: "আপনার অবস্থান পাওয়া যাচ্ছে...", locationDone: "অবস্থান নথিভুক্ত হয়েছে", locationFailed: "অবস্থান পাওয়া যায়নি", allowLocation: "ব্রাউজার সেটিংসে অবস্থান অনুমতি দিন", retryGps: "আবার চেষ্টা করুন", requirements: "প্রয়োজনীয়তা", photo: "ছবি", submitReport: "রিপোর্ট জমা দিন", submitting: "জমা হচ্ছে...", cancel: "বাতিল" },
  unitDetail: { unitStatus: "ইউনিটের অবস্থা", financialData: "আর্থিক তথ্য", serviceRequests: "সেবা অনুরোধ", setStatus: "অবস্থা নির্ধারণ করুন", type: "ধরন", capacity: "ধারণক্ষমতা", rate: "হার", status: "অবস্থা", amountDue: "প্রদেয় পরিমাণ", dueDate: "নির্ধারিত তারিখ", checkIn: "চেক ইন", checkOut: "চেক আউট", saveChanges: "পরিবর্তন সংরক্ষণ করুন", noFinancial: "কোনো আর্থিক তথ্য নেই", addFinancial: "আর্থিক তথ্য যোগ করুন", noRequests: "এই ইউনিটের জন্য কোনো অনুরোধ নেই", resolve: "সমাধান করুন", qrTitle: "সেবা অনুরোধ QR", copyLink: "লিংক কপি করুন", copied: "লিংক কপি হয়েছে!", guests: "অতিথি", perNight: "/রাত", loading: "লোড হচ্ছে…", edit: "সম্পাদনা", cancel: "বাতিল", new: "নতুন", offline: "অফলাইন — পুনরায় সংযুক্ত হলে সিঙ্ক হবে" },
  lang: { select: "ভাষা" },
};

export default bn;
