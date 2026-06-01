import type { Translations } from "./en";

const tl: Translations = {
  request: {
    serviceRequest: "Kahilingan sa Serbisyo",
    requestType: "Uri ng Kahilingan",
    description: "Paglalarawan",
    descPlaceholder: "Ilarawan nang maikli ang isyu…",
    submit: "Isumite ang Kahilingan",
    submitting: "Isinusumite...",
    unitNotFound: "Hindi nahanap ang unit",
    errorGeneric: "May naganap na error. Subukan ulit.",
    types: {
      electrical: "Elektrikal",
      plumbing: "Plumbing",
      ac: "AC / Heating",
      cleaning: "Paglilinis",
      maintenance: "Maintenance",
      noise: "Ingay",
      other: "Iba pa",
    },
    success: {
      title: "Natanggap ang Kahilingan",
      subtitle: "Natanggap na ang iyong kahilingan.",
      refCode: "Reference Code",
      keepCode: "Itago ang iyong reference code para sa follow-up",
      newRequest: "Bagong Kahilingan",
    },
  },
  lang: { select: "Wika" },
};

export default tl;
