/** Single source of truth for AI Architect plans and generation rules. */
export const BRAIN = {
  plans: [
    { code: "sketch",    ar_name: "سكيتش",   en_name: "Sketch",    price: 0,   credits: 1,  bonus: 0 },
    { code: "concept",   ar_name: "كونسبت",  en_name: "Concept",   price: 39,  credits: 5,  bonus: 0 },
    { code: "plan",      ar_name: "مخطط",    en_name: "Plan",      price: 78,  credits: 10, bonus: 2 },
    { code: "executive", ar_name: "تنفيذي",  en_name: "Executive", price: 156, credits: 20, bonus: 4 },
    { code: "studio",    ar_name: "استوديو", en_name: "Studio",    price: 312, credits: 40, bonus: 8 },
  ],
  rules: { guest_login: false, new_design_cost: 1, edit_cost: 0 },
} as const;

export type Plan = (typeof BRAIN.plans)[number];
