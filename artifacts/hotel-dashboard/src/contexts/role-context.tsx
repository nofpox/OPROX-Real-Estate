import React, { createContext, useContext, useState } from "react";

export type AppRole =
  | "super_admin"
  | "owner"
  | "admin_manager"
  | "manager"
  | "administrator"
  | "supervisor"
  | "maintenance"
  | "cleaning"
  | "security"
  | "partner";

export interface RoleDefinition {
  id: AppRole;
  label: string;
  description: string;
  allowedNav: string[];
  taskCategories: string[] | null;
}

export function mapDbRoleToAppRole(dbRole: string): AppRole {
  if (dbRole === "super_admin") return "super_admin";
  if (dbRole === "owner" || dbRole === "admin") return "owner";
  if (dbRole === "admin-manager") return "admin_manager";
  if (dbRole === "manager" || dbRole === "property-manager" || dbRole === "site-supervisor") return "manager";
  if (dbRole === "administrator") return "administrator";
  if (dbRole === "front-desk" || dbRole === "supervisor") return "supervisor";
  if (dbRole === "housekeeping" || dbRole === "cleaning-staff" || dbRole === "cleaning") return "cleaning";
  if (dbRole === "maintenance" || dbRole === "maintenance-tech") return "maintenance";
  if (dbRole === "security" || dbRole === "security-officer") return "security";
  if (dbRole === "partner" || dbRole === "investor") return "partner";
  return "supervisor";
}

export function isOwnerTier(dbRole: string): boolean {
  return dbRole === "owner" || dbRole === "admin" || dbRole === "super_admin";
}

export function isSuperAdmin(dbRole: string): boolean {
  return dbRole === "super_admin";
}

/** Ordered top-down from highest to lowest authority. */
export const ROLES: RoleDefinition[] = [
  {
    id: "super_admin",
    label: "Super Admin",
    description: "Platform-level access: tenant management and all settings",
    allowedNav: ["*"],
    taskCategories: null,
  },
  // 1 — Top tier: Owner / System Administrator
  {
    id: "owner",
    label: "Administrator (Owner/System)",
    description: "Full system authority — sovereign, unrestricted control over all settings, roles, and data",
    allowedNav: ["*"],
    taskCategories: null,
  },
  // 2 — Company tier: Corporate-level access
  {
    id: "admin_manager",
    label: "Company",
    description: "Corporate-level access — company-wide management, financial oversight, and reporting",
    allowedNav: ["/", "/bookings", "/properties", "/rooms", "/guests", "/unit-map", "/guest-requests", "/analytics", "/finance", "/user-management", "/admin-settings", "/data-archiving", "/content-manager"],
    taskCategories: null,
  },
  // 3 — Management tier: Property & operational management
  {
    id: "manager",
    label: "Manager",
    description: "Management-level oversight — property performance, team coordination, and scheduling",
    allowedNav: ["/", "/bookings", "/properties", "/rooms", "/guests", "/maintenance", "/staff", "/tasks", "/guest-requests", "/activity-log", "/analytics"],
    taskCategories: null,
  },
  // 4 — Departmental Administrator: Reporting, unit data, operational monitoring
  {
    id: "administrator",
    label: "Administrator (Departmental)",
    description: "Departmental administration — reporting, unit data, service request tracking, and billing",
    allowedNav: ["/", "/bookings", "/properties", "/rooms", "/guests", "/guest-requests", "/analytics", "/finance", "/user-management", "/admin-settings", "/activity-log", "/data-archiving", "/content-manager"],
    taskCategories: null,
  },
  // 5 — Supervisor: Field operations oversight
  {
    id: "supervisor",
    label: "Supervisor",
    description: "Field operations oversight — maintenance/service requests and team performance monitoring",
    allowedNav: ["/", "/maintenance", "/staff", "/tasks", "/guest-requests", "/activity-log"],
    taskCategories: null,
  },
  // 6 — Partner / Investor: equity portal access
  {
    id: "partner",
    label: "Partner / Investor",
    description: "Equity portal access — company shares, dividends, and performance reports",
    allowedNav: ["/", "/partner"],
    taskCategories: null,
  },
  // 7 — Execution staff
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Assigned field tasks only",
    allowedNav: ["/tasks"],
    taskCategories: ["maintenance"],
  },
  {
    id: "cleaning",
    label: "Cleaning",
    description: "Assigned field tasks only",
    allowedNav: ["/tasks"],
    taskCategories: ["housekeeping"],
  },
  {
    id: "security",
    label: "Security",
    description: "Assigned field tasks only",
    allowedNav: ["/tasks"],
    taskCategories: ["security"],
  },
];

interface RoleContextValue {
  role: RoleDefinition;
  setRoleId: (id: AppRole) => void;
  can: (path: string) => boolean;
  allowedTaskCategories: string[] | null;
  actualDbRole: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({
  children,
  initialRole = "owner",
}: {
  children: React.ReactNode;
  initialRole?: string;
}) {
  const [roleId, setRoleId] = useState<AppRole>(() => mapDbRoleToAppRole(initialRole));

  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];

  const can = (path: string): boolean => {
    if (role.allowedNav.includes("*")) return true;
    return role.allowedNav.some((allowed) =>
      path === "/" ? allowed === "/" : allowed === path || path.startsWith(allowed + "/")
    );
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRoleId,
        can,
        allowedTaskCategories: role.taskCategories,
        actualDbRole: initialRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
