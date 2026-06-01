import type { LucideIcon } from "lucide-react";
import {
  Calendar, MapPin, Wrench, Sparkles, Dumbbell, InboxIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessMode = "hotel" | "compound" | "tower" | "serviced-apartments";

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  /** Plain-English list of what this module adds to the UI. */
  navUnlocks: string[];
  icon: LucideIcon;
  /** Nav featureKeys this module enables when ON. */
  navKeys: string[];
  /** Task categories visible when this module is ON. */
  taskCategories: string[];
  /** Accent colour classes for the feature card when enabled. */
  color: string;
  iconBg: string;
}

// ─── Module Registry ──────────────────────────────────────────────────────────
// Modules are the ONLY unit of feature configuration.
// No preset templates — every module is toggled independently.
// The same Cleaning module works for a hotel room, a villa, or an apartment.

export const MODULE_REGISTRY: ModuleDef[] = [
  {
    id: "bookings",
    label: "Bookings",
    description: "Full reservation lifecycle — check-in, check-out, and availability management.",
    navUnlocks: ["Bookings tab"],
    icon: Calendar,
    navKeys: ["bookings"],
    taskCategories: [],
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Work orders, repairs, issue scheduling and resolution tracking across all unit types.",
    navUnlocks: ["Maintenance tab", "Tasks tab"],
    icon: Wrench,
    navKeys: ["maintenance", "tasks"],
    taskCategories: ["maintenance"],
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
  },
  {
    id: "housekeeping",
    label: "Housekeeping & Cleaning",
    description: "Cleaning schedules, unit-readiness checks, and inspection workflows.",
    navUnlocks: ["Tasks tab (Housekeeping category)"],
    icon: Sparkles,
    navKeys: ["tasks"],
    taskCategories: ["housekeeping"],
    color: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
  },
  {
    id: "serviceRequests",
    label: "Service Requests",
    description: "Internal ticketing for resident and guest service requests.",
    navUnlocks: ["Service Requests tab", "Tasks tab (Reception category)"],
    icon: InboxIcon,
    navKeys: ["guestRequests", "tasks"],
    taskCategories: ["reception", "general"],
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    id: "facility",
    label: "Facility Booking",
    description: "Common-area reservations — gym, pool, meeting rooms, shared spaces.",
    navUnlocks: ["Facility Booking tab"],
    icon: Dumbbell,
    navKeys: ["facilities"],
    taskCategories: [],
    color: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    id: "unitMap",
    label: "Unit Map",
    description: "Visual live layout of all units with real-time status at a glance.",
    navUnlocks: ["Unit Map tab"],
    icon: MapPin,
    navKeys: ["unitMap"],
    taskCategories: [],
    color: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
  },
];

// ─── Core Nav (always visible, no module required) ────────────────────────────

export const CORE_NAV_KEYS = new Set([
  "dashboard",
  "properties",
  "rooms",
  "staff",
  "activityLog",
  "userManagement",
  "guests",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the full set of nav featureKeys unlocked by the given module list. */
export function getEnabledNavKeys(enabledModules: string[]): Set<string> {
  const keys = new Set(CORE_NAV_KEYS);
  for (const id of enabledModules) {
    const mod = MODULE_REGISTRY.find((m) => m.id === id);
    if (mod) mod.navKeys.forEach((k) => keys.add(k));
  }
  return keys;
}

/** Returns task categories visible based on enabled modules. */
export function getEnabledTaskCategories(enabledModules: string[]): string[] {
  const cats = new Set<string>(["security"]);
  for (const id of enabledModules) {
    const mod = MODULE_REGISTRY.find((m) => m.id === id);
    if (mod) mod.taskCategories.forEach((c) => cats.add(c));
  }
  return [...cats];
}
