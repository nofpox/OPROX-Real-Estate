import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { X, Lightbulb, ArrowRight } from "lucide-react";

interface HintConfig {
  title: string;
  description: string;
  link?: { label: string; href: string };
}

const ROUTE_HINTS: Record<string, HintConfig> = {
  "/rooms": {
    title: "Adding Units",
    description:
      "To add a new unit, open a Property's detail page first — this ensures every unit is correctly linked to its parent property and prevents orphaned records.",
    link: { label: "Go to Properties", href: "/properties" },
  },
  "/properties": {
    title: "Property-First Hierarchy",
    description:
      "Click any property card to open its detail page, where you can add units, track open work orders, and view financial performance metrics.",
  },
  "/maintenance": {
    title: "Creating Work Orders",
    description:
      "Click 'New Work Order' to create an order. Link it to a specific unit and assign it to a staff member to track progress and cost in real time.",
  },
  "/staff": {
    title: "Shift Scheduling",
    description:
      "Switch to the 'Shift Schedule' tab to manage weekly coverage. Click any day column to add or remove shifts for each staff member.",
  },
  "/admin-settings": {
    title: "Role Permission Matrix",
    description:
      "Open the 'Role Permissions' tab to grant or revoke page access for any role. Click a role header badge to toggle all pages at once.",
  },
  "/tasks": {
    title: "Role-Based Task Filtering",
    description:
      "Tasks are automatically filtered by your active role. Use the 'Viewing As' switcher at the bottom of the sidebar to preview other roles' task boards.",
  },
  "/analytics": {
    title: "Cross-Property Analytics",
    description:
      "Use the property selector to isolate metrics for a single property, or leave it on 'All' to see aggregated data across your entire portfolio.",
  },
  "/guest-requests": {
    title: "Guest Request Workflow",
    description:
      "Incoming requests appear here automatically. Assign them to a staff member and set a status to track resolution end-to-end.",
  },
};

const STORAGE_KEY = "rakz:hints-dismissed-v1";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function persistDismiss(key: string) {
  const d = getDismissed();
  d.add(key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...d]));
}

export function SmartHintBar() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState<HintConfig | null>(null);
  const [hintKey, setHintKey] = useState("");

  useEffect(() => {
    const config = ROUTE_HINTS[location];
    if (!config) {
      setVisible(false);
      return;
    }
    const key = `hint:${location}`;
    setHintKey(key);
    setHint(config);
    setVisible(!getDismissed().has(key));
  }, [location]);

  function handleDismiss() {
    setVisible(false);
    persistDismiss(hintKey);
  }

  if (!visible || !hint) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
          <Lightbulb className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-snug">
            {hint.title}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
            {hint.description}
          </p>
          {hint.link && (
            <Link
              href={hint.link.href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline mt-1.5 underline-offset-2"
            >
              {hint.link.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 shrink-0 mt-0.5 rounded p-0.5"
          title="Dismiss hint"
          aria-label="Dismiss hint"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
