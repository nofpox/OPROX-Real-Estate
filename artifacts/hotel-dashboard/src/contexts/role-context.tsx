import React, { createContext, useContext, useState } from "react";

export type AppRole = "owner" | "manager" | "front-desk" | "housekeeping" | "maintenance" | "security";

export interface RoleDefinition {
  id: AppRole;
  label: string;
  description: string;
  allowedNav: string[];
  taskCategories: string[] | null;
}

export function mapDbRoleToAppRole(dbRole: string): AppRole {
  if (dbRole === "owner" || dbRole === "admin") return "owner";
  if (dbRole === "manager" || dbRole === "property-manager" || dbRole === "site-supervisor") return "manager";
  if (dbRole === "front-desk") return "front-desk";
  if (dbRole === "housekeeping" || dbRole === "cleaning-staff") return "housekeeping";
  if (dbRole === "maintenance" || dbRole === "maintenance-tech") return "maintenance";
  if (dbRole === "security" || dbRole === "security-officer") return "security";
  return "front-desk";
}

export function isOwnerTier(dbRole: string): boolean {
  return dbRole === "owner" || dbRole === "admin";
}

export const ROLES: RoleDefinition[] = [
  {
    id: "owner",
    label: "Owner",
    description: "Full system access including finance and settings",
    allowedNav: ["*"],
    taskCategories: null,
  },
  {
    id: "manager",
    label: "Manager",
    description: "Tasks, activity logs, and user management",
    allowedNav: ["/tasks", "/activity-log", "/user-management"],
    taskCategories: null,
  },
  {
    id: "front-desk",
    label: "Front Desk",
    description: "Assigned tasks and own profile",
    allowedNav: ["/tasks"],
    taskCategories: ["reception", "general"],
  },
  {
    id: "housekeeping",
    label: "Housekeeping",
    description: "Assigned tasks and own profile",
    allowedNav: ["/tasks"],
    taskCategories: ["housekeeping"],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Assigned tasks and own profile",
    allowedNav: ["/tasks"],
    taskCategories: ["maintenance"],
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
