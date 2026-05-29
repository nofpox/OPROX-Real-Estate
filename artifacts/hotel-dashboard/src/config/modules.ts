import type { LucideIcon } from "lucide-react";
import {
  Calendar, MapPin, Wrench, Sparkles, Dumbbell, InboxIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModuleGroup = "operational" | "functional";

export type BusinessMode = "hotel" | "compound" | "tower" | "serviced-apartments";

export interface ModuleDef {
  id: string;
  group: ModuleGroup;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Nav item featureKeys this module enables when it is ON. */
  navKeys: string[];
  /** Task categories visible when this module is ON. */
  taskCategories: string[];
}

// ─── Module Registry ─────────────────────────────────────────────────────────
// Operational modules expose data-centric pages (bookings, finance, maps).
// Functional modules activate a consistent workflow that runs identically
// regardless of property type — the same Cleaning workflow applies whether
// it's a villa in a compound, a unit in a tower, or a hotel room.

export const MODULE_REGISTRY: ModuleDef[] = [
  // ── Operational modules ───────────────────────────────────────────────────
  {
    id: "bookings",
    group: "operational",
    label: "Bookings",
    description: "Reservation lifecycle — check-in, check-out, availability calendar",
    icon: Calendar,
    navKeys: ["bookings", "guests"],
    taskCategories: [],
  },
  {
    id: "unitMap",
    group: "operational",
    label: "Unit Map",
    description: "Visual live layout of all units and their real-time occupancy status",
    icon: MapPin,
    navKeys: ["unitMap"],
    taskCategories: [],
  },

  // ── Functional modules ─────────────────────────────────────────────────────
  // Each module encapsulates a consistent, property-type-agnostic workflow.
  {
    id: "maintenance",
    group: "functional",
    label: "Maintenance",
    description: "Work orders, issue scheduling, and resolution status tracking across all unit types",
    icon: Wrench,
    navKeys: ["maintenance", "tasks"],
    taskCategories: ["maintenance"],
  },
  {
    id: "housekeeping",
    group: "functional",
    label: "Housekeeping & Cleaning",
    description: "Cleaning schedules, unit readiness checks, and inspection workflows for any property type",
    icon: Sparkles,
    navKeys: ["tasks"],
    taskCategories: ["housekeeping"],
  },
  {
    id: "facility",
    group: "functional",
    label: "Facility Booking",
    description: "Common area reservations — gym, pool, meeting rooms, and shared spaces",
    icon: Dumbbell,
    navKeys: ["facilities"],
    taskCategories: [],
  },
  {
    id: "serviceRequests",
    group: "functional",
    label: "Service Requests",
    description: "Internal ticketing system for resident and guest service requests",
    icon: InboxIcon,
    navKeys: ["guestRequests", "tasks"],
    taskCategories: ["reception", "general"],
  },
];

// ─── Business Mode Presets ────────────────────────────────────────────────────
// Each mode is just a convenience preset that pre-selects modules.
// Admins can always override individual modules after applying a preset.

export const MODE_MODULE_DEFAULTS: Record<BusinessMode, string[]> = {
  hotel: ["bookings", "maintenance", "housekeeping", "serviceRequests"],
  compound: ["maintenance", "housekeeping", "unitMap", "serviceRequests"],
  tower: ["bookings", "maintenance", "housekeeping", "facility", "serviceRequests"],
  "serviced-apartments": ["bookings", "housekeeping", "serviceRequests"],
};

// ─── Core Nav (always visible) ────────────────────────────────────────────────
// These nav items are infrastructure — not tied to any module toggle.

export const CORE_NAV_KEYS = new Set([
  "dashboard",
  "properties",
  "rooms",
  "staff",
  "activityLog",
  "userManagement",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the full set of nav featureKeys unlocked by the given module list. */
export function getEnabledNavKeys(enabledModules: string[]): Set<string> {
  const keys = new Set(CORE_NAV_KEYS);
  for (const id of enabledModules) {
    const mod = MODULE_REGISTRY.find((m) => m.id === id);
    if (mod) mod.navKeys.forEach((k) => keys.add(k));
  }
  return keys;
}

/** Returns task categories that should be visible based on enabled modules. */
export function getEnabledTaskCategories(enabledModules: string[]): string[] {
  const cats = new Set<string>(["security"]); // security tasks are always core
  for (const id of enabledModules) {
    const mod = MODULE_REGISTRY.find((m) => m.id === id);
    if (mod) mod.taskCategories.forEach((c) => cats.add(c));
  }
  return [...cats];
}
