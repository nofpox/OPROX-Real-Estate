import React, { createContext, useContext, useState } from "react";

export type AppRole = "super_admin" | "owner" | "manager" | "supervisor" | "maintenance" | "cleaning" | "security";

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
  if (dbRole === "manager" || dbRole === "property-manager" || dbRole === "site-supervisor") return "manager";
  if (dbRole === "front-desk" || dbRole === "supervisor") return "supervisor";
  if (dbRole === "housekeeping" || dbRole === "cleaning-staff" || dbRole === "cleaning") return "cleaning";
  if (dbRole === "maintenance" || dbRole === "maintenance-tech") return "maintenance";
  if (dbRole === "security" || dbRole === "security-officer") return "security";
  return "supervisor";
}

export function isOwnerTier(dbRole: string): boolean {
  return dbRole === "owner" || dbRole === "admin" || dbRole === "super_admin";
}

export function isSuperAdmin(dbRole: string): boolean {
  return dbRole === "super_admin";
}

export const ROLES: RoleDefinition[] = [
  {
    id: "super_admin",
    label: "Super Admin",
    description: "Platform-level access: tenant management and all settings",
    allowedNav: ["*"],
    taskCategories: null,
  },
  {
    id: "owner",
    label: "Company",
    description: "Full system access including finance and settings",
    allowedNav: ["*"],
    taskCategories: null,
  },
  {
    id: "manager",
    label: "Manager",
    description: "Tasks, activity logs, and user management",
    allowedNav: ["/tasks", "/activity-log", "/user-management", "/analytics", "/support-tickets"],
    taskCategories: null,
  },
  {
    id: "supervisor",
    label: "Supervisor",
    description: "Assigned tasks and own profile",
    allowedNav: ["/tasks"],
    taskCategories: ["reception", "general"],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Assigned tasks and own profile",
    allowedNav: ["/tasks"],
    taskCategories: ["maintenance"],
  },
  {
    id: "cleaning",
    label: "Cleaning",
    description: "Assigned tasks and own profile",
    allowedNav: ["/tasks"],
    taskCategories: ["housekeeping"],
  },
  {
    id: "security",
    label: "Security",
    description: "Assigned tasks and own profile",
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
