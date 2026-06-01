import type { Translations } from "./en";

const bn: Translations = {
  request: {
    serviceRequest: "সেবা অনুরোধ",
    requestType: "অনুরোধের ধরন",
    description: "বিবরণ",
    descPlaceholder: "সমস্যার সংক্ষিপ্ত বিবরণ দিন…",
    submit: "অনুরোধ জমা দিন",
    submitting: "জমা হচ্ছে...",
    unitNotFound: "ইউনিট পাওয়া যায়নি",
    invalidUnit: "অনুগ্রহ করে একটি বৈধ ইউনিট নম্বর লিখুন।",
    errorGeneric: "একটি ত্রুটি হয়েছে। আবার চেষ্টা করুন।",
    types: {
      electrical: "বিদ্যুৎ",
      plumbing: "প্লাম্বিং",
      ac: "এসি / হিটিং",
      cleaning: "পরিষ্কার",
      maintenance: "রক্ষণাবেক্ষণ",
      noise: "শব্দ",
      other: "অন্যান্য",
    },
    timeSlot: "পছন্দের সময় স্লট",
    timeSlotPlaceholder: "একটি সময় উইন্ডো নির্বাচন করুন",
    timeSlotHint: "নির্বাচিত সময়ে উপস্থিত থাকুন যাতে আমাদের দল আপনাকে সহায়তা করতে পারে।",
    success: {
      title: "অনুরোধ গৃহীত হয়েছে",
      subtitle: "আপনার অনুরোধ গৃহীত হয়েছে।",
      refCode: "রেফারেন্স কোড",
      keepCode: "ফলো-আপের জন্য রেফারেন্স কোড রাখুন",
      newRequest: "নতুন অনুরোধ",
    },
    status: { label: "অনুরোধের অবস্থা", pending: "মুলতুবি", hint: "প্রতি ৩০ সেকেন্ডে স্বয়ংক্রিয়ভাবে রিফ্রেশ হয়" },
    rating: { title: "আপনার অভিজ্ঞতা মূল্যায়ন করুন", subtitle: "আমাদের সেবা কেমন ছিল?", commentPlaceholder: "মন্তব্য লিখুন (ঐচ্ছিক)…", submit: "রেটিং জমা দিন", thankyou: "আপনার মতামতের জন্য ধন্যবাদ!" },
  },
  landing: {
    accessUnit: "আপনার ইউনিট অ্যাক্সেস করুন",
    enterUnit: "শুরু করতে আপনার ইউনিট নম্বর লিখুন",
    accessPortal: "পোর্টাল অ্যাক্সেস করুন",
    submitRequests: "অনুরোধ জমা দিন",
    rateStay: "আপনার থাকার মূল্যায়ন করুন",
    unitDetails: "ইউনিটের বিবরণ",
  },
  lang: { select: "ভাষা" },
};

export default bn;
