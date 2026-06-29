import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string | null;
  position: "right" | "left" | "top" | "bottom" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Housin Smart Solutions",
    description: "Let's take a quick tour of the key features to help you get started. You can skip this at any time and restart it from the help button.",
    target: null,
    position: "center",
  },
  {
    id: "dashboard",
    title: "Dashboard — Your Command Center",
    description: "Real-time overview of all properties: KPI cards, 42-day occupancy heatmaps, recent activity feed, and quick-action shortcuts.",
    target: "nav-dashboard",
    position: "right",
  },
  {
    id: "properties",
    title: "Properties",
    description: "Add and configure your properties here. Open any property card to manage its units, track work orders, and view performance — organised in a strict hierarchy.",
    target: "nav-properties",
    position: "right",
  },
  {
    id: "rooms",
    title: "Unit Status — Filtered Portfolio View",
    description: "Browse all units across your portfolio. To add a new unit, open a Property's detail page — this guarantees every unit is correctly linked to its parent property.",
    target: "nav-rooms",
    position: "right",
  },
  {
    id: "maintenance",
    title: "Maintenance & Work Orders",
    description: "Create, assign, and track work orders in real time. Set priority levels, link orders to specific units, and monitor labour costs as they accumulate.",
    target: "nav-maintenance",
    position: "right",
  },
  {
    id: "staff",
    title: "Staff & Shift Scheduling",
    description: "Manage your team directory and weekly shift calendar. Switch to the 'Shift Schedule' tab to assign morning, afternoon, evening, or night coverage for every property.",
    target: "nav-staff",
    position: "right",
  },
  {
    id: "tasks",
    title: "Tasks — Kanban Board",
    description: "Operational tasks for housekeeping, maintenance, security, and reception. Tasks are automatically filtered by the currently active role — no manual sorting needed.",
    target: "nav-tasks",
    position: "right",
  },
  {
    id: "analytics",
    title: "Analytics & Reports",
    description: "Dive deep into revenue trends, occupancy rates, and expense breakdowns across all properties with interactive, filterable charts.",
    target: "nav-analytics",
    position: "right",
  },
  {
    id: "admin-settings",
    title: "Admin Settings",
    description: "Configure company info, the role permission matrix, task types, custom fields, and visual appearance. Full owner sovereignty — every checkbox is yours to control.",
    target: "nav-admin-settings",
    position: "right",
  },
  {
    id: "role-switcher",
    title: "Role View Switcher",
    description: "As the Owner, you can simulate any role and see exactly what your staff sees. Great for verifying that permission settings are working as intended.",
    target: "tour-role-switcher",
    position: "top",
  },
];

interface TourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const STORAGE_KEY = "rozoz:tour-v1";

export function TourProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: number;
}) {
  const storageKey = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (done) return;
    const t = setTimeout(() => setIsActive(true), 1400);
    return () => clearTimeout(t);
  }, [storageKey]);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((i) => {
      const next = i + 1;
      if (next >= TOUR_STEPS.length) {
        setIsActive(false);
        localStorage.setItem(storageKey, "1");
        return i;
      }
      return next;
    });
  }, [storageKey]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, "1");
  }, [storageKey]);

  const finishTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(storageKey, "1");
  }, [storageKey]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep: TOUR_STEPS[currentStepIndex],
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}
